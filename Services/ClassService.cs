using BasicLMS.Data;
using BasicLMS.DTOs.Lms;
using BasicLMS.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace BasicLMS.Services;

public class ClassService : IClassService
{
    private const int MaxResults = 200;

    private readonly ApplicationDbContext _db;
    private readonly UserManager<ApplicationUser> _users;

    public ClassService(ApplicationDbContext db, UserManager<ApplicationUser> users)
    {
        _db = db;
        _users = users;
    }

    public async Task<IReadOnlyList<ClassListItem>> ListAsync(Actor actor, int? courseId, string? status)
    {
        var query = _db.Classes.AsNoTracking().AsQueryable();

        if (courseId.HasValue)
            query = query.Where(c => c.CourseId == courseId.Value);

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(c => c.Status == status.Trim());

        if (actor.IsAdmin)
        {
            // no extra filter
        }
        else if (actor.IsLecturer)
        {
            query = query.Where(c =>
                c.Lecturers.Any(l => l.LecturerId == actor.UserId) ||
                c.Course.Lecturers.Any(l => l.LecturerId == actor.UserId) ||
                c.Status == ClassStatuses.Open);
        }
        else
        {
            query = query.Where(c =>
                c.Status == ClassStatuses.Open ||
                c.Enrollments.Any(e => e.StudentId == actor.UserId && e.Status != EnrollmentStatuses.Cancelled));
        }

        return await query
            .OrderBy(c => c.Name)
            .Take(MaxResults)
            .Select(c => new ClassListItem(
                c.Id,
                c.CourseId,
                c.Course.Title,
                c.Name,
                c.Status,
                c.StartDate,
                c.EndDate,
                c.Capacity,
                c.Enrollments.Count(e => e.Status != EnrollmentStatuses.Cancelled),
                c.Lecturers.Select(l => new UserSummary(
                    l.LecturerId, l.Lecturer.FullName, l.Lecturer.Email!)).ToList()))
            .ToListAsync();
    }

    public async Task<ServiceResult<ClassDetailResponse>> GetAsync(Actor actor, int id)
    {
        var cls = await LoadDetailAsync(id);
        if (cls == null)
            return ServiceResult<ClassDetailResponse>.Fail(StatusCodes.Status404NotFound, "Class not found");

        if (!CanRead(actor, cls))
            return ServiceResult<ClassDetailResponse>.Fail(StatusCodes.Status404NotFound, "Class not found");

        return ServiceResult<ClassDetailResponse>.Ok(MapDetail(cls, actor));
    }

    public async Task<ServiceResult<ClassDetailResponse>> CreateAsync(Actor actor, ClassRequest request)
    {
        var course = await _db.Courses.Include(c => c.Lecturers).FirstOrDefaultAsync(c => c.Id == request.CourseId);
        if (course == null)
            return ServiceResult<ClassDetailResponse>.Fail(StatusCodes.Status400BadRequest, "Course not found");

        if (!actor.IsAdmin && !course.Lecturers.Any(l => l.LecturerId == actor.UserId))
            return ServiceResult<ClassDetailResponse>.Fail(StatusCodes.Status403Forbidden, "You cannot create a class for this course");

        var parsed = ParseClass(request);
        if (!parsed.Succeeded)
            return ServiceResult<ClassDetailResponse>.Fail(parsed.StatusCode, parsed.Message!);

        var now = DateTime.UtcNow;
        var cls = parsed.Value!;
        cls.CourseId = request.CourseId;
        cls.CreatedAt = now;
        cls.UpdatedAt = now;

        _db.Classes.Add(cls);

        if (actor.IsLecturer && !actor.IsAdmin)
        {
            _db.ClassLecturers.Add(new ClassLecturer
            {
                Class = cls,
                LecturerId = actor.UserId
            });
        }

        await _db.SaveChangesAsync();

        var created = await LoadDetailAsync(cls.Id);
        return ServiceResult<ClassDetailResponse>.Created(MapDetail(created!, actor));
    }

    public async Task<ServiceResult<ClassDetailResponse>> UpdateAsync(Actor actor, int id, ClassRequest request)
    {
        var cls = await _db.Classes
            .Include(c => c.Lecturers)
            .Include(c => c.Course).ThenInclude(c => c.Lecturers)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (cls == null)
            return ServiceResult<ClassDetailResponse>.Fail(StatusCodes.Status404NotFound, "Class not found");

        if (!CanManage(actor, cls))
            return ServiceResult<ClassDetailResponse>.Fail(StatusCodes.Status403Forbidden, "You cannot update this class");

        if (request.CourseId != cls.CourseId)
            return ServiceResult<ClassDetailResponse>.Fail(StatusCodes.Status400BadRequest, "Cannot move a class to another course");

        var parsed = ParseClass(request);
        if (!parsed.Succeeded)
            return ServiceResult<ClassDetailResponse>.Fail(parsed.StatusCode, parsed.Message!);

        var data = parsed.Value!;
        cls.Name = data.Name;
        cls.StartDate = data.StartDate;
        cls.EndDate = data.EndDate;
        cls.Status = data.Status;
        cls.Capacity = data.Capacity;
        cls.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var updated = await LoadDetailAsync(id);
        return ServiceResult<ClassDetailResponse>.Ok(MapDetail(updated!, actor));
    }

    public async Task<ServiceResult> DeleteAsync(Actor actor, int id)
    {
        var cls = await _db.Classes
            .Include(c => c.Lecturers)
            .Include(c => c.Course).ThenInclude(c => c.Lecturers)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (cls == null)
            return ServiceResult.Fail(StatusCodes.Status404NotFound, "Class not found");

        if (!CanManage(actor, cls))
            return ServiceResult.Fail(StatusCodes.Status403Forbidden, "You cannot delete this class");

        _db.Classes.Remove(cls);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> AssignLecturerAsync(Actor actor, int classId, int userId)
    {
        if (!actor.IsAdmin)
            return ServiceResult.Fail(StatusCodes.Status403Forbidden, "Only an admin can assign class lecturers");

        if (!await _db.Classes.AnyAsync(c => c.Id == classId))
            return ServiceResult.Fail(StatusCodes.Status404NotFound, "Class not found");

        var user = await _users.FindByIdAsync(userId.ToString());
        if (user == null || !user.IsActive)
            return ServiceResult.Fail(StatusCodes.Status404NotFound, "Lecturer not found");

        if (!await _users.IsInRoleAsync(user, "Lecturer"))
            return ServiceResult.Fail(StatusCodes.Status400BadRequest, "User is not a lecturer");

        if (await _db.ClassLecturers.AnyAsync(x => x.ClassId == classId && x.LecturerId == userId))
            return ServiceResult.Fail(StatusCodes.Status409Conflict, "Lecturer is already assigned to this class");

        _db.ClassLecturers.Add(new ClassLecturer { ClassId = classId, LecturerId = userId });
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> UnassignLecturerAsync(Actor actor, int classId, int userId)
    {
        if (!actor.IsAdmin)
            return ServiceResult.Fail(StatusCodes.Status403Forbidden, "Only an admin can unassign class lecturers");

        var link = await _db.ClassLecturers.FirstOrDefaultAsync(x => x.ClassId == classId && x.LecturerId == userId);
        if (link == null)
            return ServiceResult.Fail(StatusCodes.Status404NotFound, "Class lecturer assignment not found");

        _db.ClassLecturers.Remove(link);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult<EnrollmentResponse>> EnrollAsync(Actor actor, int classId, int? studentId)
    {
        var cls = await _db.Classes
            .Include(c => c.Lecturers)
            .Include(c => c.Enrollments)
            .Include(c => c.Course).ThenInclude(c => c.Lecturers)
            .FirstOrDefaultAsync(c => c.Id == classId);

        if (cls == null)
            return ServiceResult<EnrollmentResponse>.Fail(StatusCodes.Status404NotFound, "Class not found");

        int targetStudentId;
        if (actor.IsStudent && !actor.IsAdmin && !actor.IsLecturer)
        {
            if (studentId.HasValue && studentId.Value != actor.UserId)
                return ServiceResult<EnrollmentResponse>.Fail(StatusCodes.Status403Forbidden, "You can only enroll yourself");

            targetStudentId = actor.UserId;
        }
        else if (actor.IsAdmin)
        {
            if (!studentId.HasValue)
                return ServiceResult<EnrollmentResponse>.Fail(StatusCodes.Status400BadRequest, "Student id is required");
            targetStudentId = studentId.Value;
        }
        else if (actor.IsLecturer)
        {
            if (!IsClassLecturer(actor, cls) && !IsCourseLecturer(actor, cls))
                return ServiceResult<EnrollmentResponse>.Fail(StatusCodes.Status403Forbidden, "You cannot enroll students in this class");

            if (!studentId.HasValue)
                return ServiceResult<EnrollmentResponse>.Fail(StatusCodes.Status400BadRequest, "Student id is required");
            targetStudentId = studentId.Value;
        }
        else
        {
            return ServiceResult<EnrollmentResponse>.Fail(StatusCodes.Status403Forbidden, "You cannot enroll students");
        }

        if (cls.Status != ClassStatuses.Open)
            return ServiceResult<EnrollmentResponse>.Fail(StatusCodes.Status400BadRequest, "Class is not open for enrollment");

        var student = await _users.FindByIdAsync(targetStudentId.ToString());
        if (student == null || !student.IsActive)
            return ServiceResult<EnrollmentResponse>.Fail(StatusCodes.Status404NotFound, "Student not found");

        if (!await _users.IsInRoleAsync(student, "Student"))
            return ServiceResult<EnrollmentResponse>.Fail(StatusCodes.Status400BadRequest, "User is not a student");

        var existing = cls.Enrollments.FirstOrDefault(e => e.StudentId == targetStudentId);
        if (existing != null)
        {
            if (existing.Status != EnrollmentStatuses.Cancelled)
                return ServiceResult<EnrollmentResponse>.Fail(StatusCodes.Status409Conflict, "Student is already enrolled");

            existing.Status = EnrollmentStatuses.Active;
            existing.EnrolledAt = DateTime.UtcNow;
            existing.CompletedAt = null;
            await _db.SaveChangesAsync();
            return ServiceResult<EnrollmentResponse>.Ok(MapEnrollment(existing, student));
        }

        var activeCount = cls.Enrollments.Count(e => e.Status != EnrollmentStatuses.Cancelled);
        if (cls.Capacity.HasValue && activeCount >= cls.Capacity.Value)
            return ServiceResult<EnrollmentResponse>.Fail(StatusCodes.Status409Conflict, "Class is full");

        var enrollment = new ClassEnrollment
        {
            ClassId = classId,
            StudentId = targetStudentId,
            EnrolledAt = DateTime.UtcNow,
            Status = EnrollmentStatuses.Active
        };

        _db.ClassEnrollments.Add(enrollment);
        await _db.SaveChangesAsync();

        return ServiceResult<EnrollmentResponse>.Created(MapEnrollment(enrollment, student));
    }

    public async Task<ServiceResult> UnenrollAsync(Actor actor, int enrollmentId)
    {
        var enrollment = await _db.ClassEnrollments
            .Include(e => e.Class).ThenInclude(c => c.Lecturers)
            .Include(e => e.Class).ThenInclude(c => c.Course).ThenInclude(c => c.Lecturers)
            .FirstOrDefaultAsync(e => e.Id == enrollmentId);

        if (enrollment == null)
            return ServiceResult.Fail(StatusCodes.Status404NotFound, "Enrollment not found");

        var can =
            actor.IsAdmin ||
            enrollment.StudentId == actor.UserId ||
            IsClassLecturer(actor, enrollment.Class) ||
            IsCourseLecturer(actor, enrollment.Class);

        if (!can)
            return ServiceResult.Fail(StatusCodes.Status403Forbidden, "You cannot cancel this enrollment");

        if (enrollment.Status == EnrollmentStatuses.Cancelled)
            return ServiceResult.Ok();

        enrollment.Status = EnrollmentStatuses.Cancelled;
        enrollment.CompletedAt = null;
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    private static ServiceResult<Class> ParseClass(ClassRequest request)
    {
        var name = request.Name?.Trim();
        if (string.IsNullOrWhiteSpace(name))
            return ServiceResult<Class>.Fail(StatusCodes.Status400BadRequest, "Class name is required");

        var status = string.IsNullOrWhiteSpace(request.Status) ? ClassStatuses.Open : request.Status.Trim();
        if (!ClassStatuses.IsValid(status))
            return ServiceResult<Class>.Fail(StatusCodes.Status400BadRequest, "Invalid class status");

        if (request.Capacity is <= 0)
            return ServiceResult<Class>.Fail(StatusCodes.Status400BadRequest, "Capacity must be greater than zero");

        if (request.StartDate.HasValue && request.EndDate.HasValue && request.EndDate < request.StartDate)
            return ServiceResult<Class>.Fail(StatusCodes.Status400BadRequest, "End date cannot be before start date");

        return ServiceResult<Class>.Ok(new Class
        {
            Name = name,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Status = status,
            Capacity = request.Capacity
        });
    }

    private async Task<Class?> LoadDetailAsync(int id) =>
        await _db.Classes
            .AsNoTracking()
            .Include(c => c.Course).ThenInclude(c => c.Lecturers)
            .Include(c => c.Lecturers).ThenInclude(l => l.Lecturer)
            .Include(c => c.Enrollments).ThenInclude(e => e.Student)
            .FirstOrDefaultAsync(c => c.Id == id);

    private static bool IsClassLecturer(Actor actor, Class cls) =>
        cls.Lecturers.Any(l => l.LecturerId == actor.UserId);

    private static bool IsCourseLecturer(Actor actor, Class cls) =>
        cls.Course.Lecturers.Any(l => l.LecturerId == actor.UserId);

    private static bool CanManage(Actor actor, Class cls) =>
        actor.IsAdmin || IsClassLecturer(actor, cls) || IsCourseLecturer(actor, cls);

    private static bool CanRead(Actor actor, Class cls)
    {
        if (CanManage(actor, cls))
            return true;

        if (cls.Status == ClassStatuses.Open)
            return true;

        return cls.Enrollments.Any(e =>
            e.StudentId == actor.UserId && e.Status != EnrollmentStatuses.Cancelled);
    }

    private static ClassDetailResponse MapDetail(Class cls, Actor actor)
    {
        var query = cls.Enrollments.Where(e => e.Status != EnrollmentStatuses.Cancelled);

        if (!actor.IsAdmin && !IsClassLecturer(actor, cls) && !IsCourseLecturer(actor, cls))
            query = query.Where(e => e.StudentId == actor.UserId);

        var enrollments = query
            .OrderBy(e => e.Student.FullName)
            .Select(e => MapEnrollment(e, e.Student))
            .ToList();

        return new ClassDetailResponse(
            cls.Id,
            cls.CourseId,
            cls.Course.Title,
            cls.Name,
            cls.Status,
            cls.StartDate,
            cls.EndDate,
            cls.Capacity,
            cls.Lecturers.Select(l => new UserSummary(l.LecturerId, l.Lecturer.FullName, l.Lecturer.Email!)).ToList(),
            enrollments,
            cls.CreatedAt,
            cls.UpdatedAt,
            CanManage(actor, cls));
    }

    private static EnrollmentResponse MapEnrollment(ClassEnrollment enrollment, ApplicationUser student) =>
        new(
            enrollment.Id,
            enrollment.ClassId,
            enrollment.StudentId,
            student.FullName,
            student.Email ?? "",
            enrollment.Status,
            enrollment.EnrolledAt,
            enrollment.CompletedAt);
}
