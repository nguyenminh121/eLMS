using BasicLMS.Data;
using BasicLMS.DTOs.Lms;
using BasicLMS.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace BasicLMS.Services;

public class CourseService : ICourseService
{
    private const int MaxResults = 200;

    private readonly ApplicationDbContext _db;
    private readonly UserManager<ApplicationUser> _users;
    private readonly IFileStorage _files;

    public CourseService(ApplicationDbContext db, UserManager<ApplicationUser> users, IFileStorage files)
    {
        _db = db;
        _users = users;
        _files = files;
    }

    public async Task<IReadOnlyList<CourseListItem>> ListAsync(
        Actor actor, string? search, string? status, int? categoryId)
    {
        var query = _db.Courses.AsNoTracking().AsQueryable();

        if (actor.IsStudent && !actor.IsAdmin && !actor.IsLecturer)
            query = query.Where(c => c.Status == CourseStatuses.Published);
        else if (actor.IsLecturer && !actor.IsAdmin)
            query = query.Where(c =>
                c.Status == CourseStatuses.Published ||
                c.Lecturers.Any(l => l.LecturerId == actor.UserId));

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(c => c.Title.Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(c => c.Status == status.Trim());

        if (categoryId.HasValue)
            query = query.Where(c => c.CategoryId == categoryId.Value);

        return await query
            .OrderBy(c => c.Title)
            .Take(MaxResults)
            .Select(c => new CourseListItem(
                c.Id,
                c.Title,
                c.Description,
                c.ThumbnailUrl,
                c.Level,
                c.Status,
                c.CategoryId,
                c.Category != null ? c.Category.Name : null,
                c.Chapters.Count,
                c.Classes.Count,
                c.Lecturers.Select(l => new UserSummary(
                    l.LecturerId,
                    l.Lecturer.FullName,
                    l.Lecturer.Email!)).ToList(),
                c.UpdatedAt))
            .ToListAsync();
    }

    public async Task<ServiceResult<CourseDetailResponse>> GetAsync(Actor actor, int id)
    {
        var course = await LoadDetailAsync(id);
        if (course == null)
            return ServiceResult<CourseDetailResponse>.Fail(StatusCodes.Status404NotFound, "Course not found");

        if (!CanRead(actor, course))
            return ServiceResult<CourseDetailResponse>.Fail(StatusCodes.Status404NotFound, "Course not found");

        return ServiceResult<CourseDetailResponse>.Ok(MapDetail(course));
    }

    public async Task<ServiceResult<CourseDetailResponse>> CreateAsync(Actor actor, CourseRequest request)
    {
        if (!actor.IsAdmin)
            return ServiceResult<CourseDetailResponse>.Fail(StatusCodes.Status403Forbidden, "Only an admin can create courses");

        var parsed = await ParseCourseRequestAsync(request, null);
        if (!parsed.Succeeded)
            return ServiceResult<CourseDetailResponse>.Fail(parsed.StatusCode, parsed.Message!);

        var status = string.IsNullOrWhiteSpace(request.Status)
            ? CourseStatuses.Published
            : request.Status.Trim();
        if (status is not (CourseStatuses.Draft or CourseStatuses.Published))
            return ServiceResult<CourseDetailResponse>.Fail(StatusCodes.Status400BadRequest, "Invalid course status");

        var now = DateTime.UtcNow;
        var course = parsed.Value!;
        course.Status = status;
        course.CreatedAt = now;
        course.UpdatedAt = now;

        _db.Courses.Add(course);
        await _db.SaveChangesAsync();

        var created = await LoadDetailAsync(course.Id);
        return ServiceResult<CourseDetailResponse>.Created(MapDetail(created!));
    }

    public async Task<ServiceResult<CourseDetailResponse>> UpdateAsync(Actor actor, int id, CourseRequest request)
    {
        var course = await _db.Courses.Include(c => c.Lecturers).FirstOrDefaultAsync(c => c.Id == id);
        if (course == null)
            return ServiceResult<CourseDetailResponse>.Fail(StatusCodes.Status404NotFound, "Course not found");

        if (!CanManage(actor, course))
            return ServiceResult<CourseDetailResponse>.Fail(StatusCodes.Status403Forbidden, "You cannot update this course");

        var parsed = await ParseCourseRequestAsync(request, id);
        if (!parsed.Succeeded)
            return ServiceResult<CourseDetailResponse>.Fail(parsed.StatusCode, parsed.Message!);

        var data = parsed.Value!;
        course.Title = data.Title;
        course.Description = data.Description;
        course.ThumbnailUrl = data.ThumbnailUrl;
        course.Level = data.Level;
        course.CategoryId = data.CategoryId;
        course.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var updated = await LoadDetailAsync(id);
        return ServiceResult<CourseDetailResponse>.Ok(MapDetail(updated!));
    }

    public async Task<ServiceResult<CourseDetailResponse>> UpdateStatusAsync(Actor actor, int id, string status)
    {
        if (!CourseStatuses.IsValid(status))
            return ServiceResult<CourseDetailResponse>.Fail(StatusCodes.Status400BadRequest, "Invalid course status");

        var course = await _db.Courses.Include(c => c.Lecturers).FirstOrDefaultAsync(c => c.Id == id);
        if (course == null)
            return ServiceResult<CourseDetailResponse>.Fail(StatusCodes.Status404NotFound, "Course not found");

        if (!CanManage(actor, course))
            return ServiceResult<CourseDetailResponse>.Fail(StatusCodes.Status403Forbidden, "You cannot update this course");

        course.Status = status;
        course.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var updated = await LoadDetailAsync(id);
        return ServiceResult<CourseDetailResponse>.Ok(MapDetail(updated!));
    }

    public async Task<ServiceResult> DeleteAsync(Actor actor, int id)
    {
        var course = await _db.Courses.Include(c => c.Lecturers).FirstOrDefaultAsync(c => c.Id == id);
        if (course == null)
            return ServiceResult.Fail(StatusCodes.Status404NotFound, "Course not found");

        if (!CanManage(actor, course))
            return ServiceResult.Fail(StatusCodes.Status403Forbidden, "You cannot delete this course");

        if (await _db.Classes.AnyAsync(c => c.CourseId == id))
            return ServiceResult.Fail(StatusCodes.Status409Conflict, "Course has classes and cannot be deleted");

        _db.Courses.Remove(course);
        await _db.SaveChangesAsync();
        _files.DeleteFolder(id.ToString());
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult<ChapterResponse>> CreateChapterAsync(Actor actor, int courseId, ChapterRequest request)
    {
        var access = await RequireManageCourseAsync(actor, courseId);
        if (!access.Succeeded)
            return ServiceResult<ChapterResponse>.Fail(access.StatusCode, access.Message!);

        var title = request.Title?.Trim();
        if (string.IsNullOrWhiteSpace(title))
            return ServiceResult<ChapterResponse>.Fail(StatusCodes.Status400BadRequest, "Chapter title is required");

        var maxOrder = await _db.Chapters.Where(c => c.CourseId == courseId).MaxAsync(c => (int?)c.SortOrder) ?? -1;
        var now = DateTime.UtcNow;
        var chapter = new Chapter
        {
            CourseId = courseId,
            Title = title,
            SortOrder = request.SortOrder ?? maxOrder + 1,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.Chapters.Add(chapter);
        await TouchCourseAsync(courseId);
        await _db.SaveChangesAsync();

        return ServiceResult<ChapterResponse>.Created(
            new ChapterResponse(chapter.Id, chapter.CourseId, chapter.Title, chapter.SortOrder, []));
    }

    public async Task<ServiceResult<ChapterResponse>> UpdateChapterAsync(Actor actor, int chapterId, ChapterRequest request)
    {
        var chapter = await _db.Chapters.Include(c => c.Lessons).FirstOrDefaultAsync(c => c.Id == chapterId);
        if (chapter == null)
            return ServiceResult<ChapterResponse>.Fail(StatusCodes.Status404NotFound, "Chapter not found");

        var access = await RequireManageCourseAsync(actor, chapter.CourseId);
        if (!access.Succeeded)
            return ServiceResult<ChapterResponse>.Fail(access.StatusCode, access.Message!);

        var title = request.Title?.Trim();
        if (string.IsNullOrWhiteSpace(title))
            return ServiceResult<ChapterResponse>.Fail(StatusCodes.Status400BadRequest, "Chapter title is required");

        chapter.Title = title;
        if (request.SortOrder.HasValue)
            chapter.SortOrder = request.SortOrder.Value;
        chapter.UpdatedAt = DateTime.UtcNow;
        await TouchCourseAsync(chapter.CourseId);
        await _db.SaveChangesAsync();

        return ServiceResult<ChapterResponse>.Ok(MapChapter(chapter));
    }

    public async Task<ServiceResult> DeleteChapterAsync(Actor actor, int chapterId)
    {
        var chapter = await _db.Chapters.FirstOrDefaultAsync(c => c.Id == chapterId);
        if (chapter == null)
            return ServiceResult.Fail(StatusCodes.Status404NotFound, "Chapter not found");

        var access = await RequireManageCourseAsync(actor, chapter.CourseId);
        if (!access.Succeeded)
            return access;

        _db.Chapters.Remove(chapter);
        await TouchCourseAsync(chapter.CourseId);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult<LessonResponse>> CreateLessonAsync(Actor actor, int chapterId, LessonRequest request)
    {
        var chapter = await _db.Chapters.FirstOrDefaultAsync(c => c.Id == chapterId);
        if (chapter == null)
            return ServiceResult<LessonResponse>.Fail(StatusCodes.Status404NotFound, "Chapter not found");

        var access = await RequireManageCourseAsync(actor, chapter.CourseId);
        if (!access.Succeeded)
            return ServiceResult<LessonResponse>.Fail(access.StatusCode, access.Message!);

        var parsed = ParseLesson(request);
        if (!parsed.Succeeded)
            return ServiceResult<LessonResponse>.Fail(parsed.StatusCode, parsed.Message!);

        var maxOrder = await _db.Lessons.Where(l => l.ChapterId == chapterId).MaxAsync(l => (int?)l.SortOrder) ?? -1;
        var now = DateTime.UtcNow;
        var lesson = parsed.Value!;
        lesson.ChapterId = chapterId;
        lesson.SortOrder = request.SortOrder ?? maxOrder + 1;
        lesson.CreatedAt = now;
        lesson.UpdatedAt = now;

        _db.Lessons.Add(lesson);
        await TouchCourseAsync(chapter.CourseId);
        await _db.SaveChangesAsync();

        return ServiceResult<LessonResponse>.Created(MapLesson(lesson));
    }

    public async Task<ServiceResult<LessonResponse>> UpdateLessonAsync(Actor actor, int lessonId, LessonRequest request)
    {
        var lesson = await _db.Lessons.Include(l => l.Chapter).FirstOrDefaultAsync(l => l.Id == lessonId);
        if (lesson == null)
            return ServiceResult<LessonResponse>.Fail(StatusCodes.Status404NotFound, "Lesson not found");

        var access = await RequireManageCourseAsync(actor, lesson.Chapter.CourseId);
        if (!access.Succeeded)
            return ServiceResult<LessonResponse>.Fail(access.StatusCode, access.Message!);

        var parsed = ParseLesson(request);
        if (!parsed.Succeeded)
            return ServiceResult<LessonResponse>.Fail(parsed.StatusCode, parsed.Message!);

        var data = parsed.Value!;
        lesson.Title = data.Title;
        lesson.Content = data.Content;
        lesson.DurationSeconds = data.DurationSeconds;
        if (ShouldReplaceVideo(lesson.VideoUrl, data.VideoUrl))
        {
            DeleteStored(lesson.VideoUrl);
            lesson.VideoUrl = data.VideoUrl;
        }
        if (request.SortOrder.HasValue)
            lesson.SortOrder = request.SortOrder.Value;
        lesson.UpdatedAt = DateTime.UtcNow;
        await TouchCourseAsync(lesson.Chapter.CourseId);
        await _db.SaveChangesAsync();

        return ServiceResult<LessonResponse>.Ok(MapLesson(lesson));
    }

    public async Task<ServiceResult> DeleteLessonAsync(Actor actor, int lessonId)
    {
        var lesson = await _db.Lessons.Include(l => l.Chapter).FirstOrDefaultAsync(l => l.Id == lessonId);
        if (lesson == null)
            return ServiceResult.Fail(StatusCodes.Status404NotFound, "Lesson not found");

        var access = await RequireManageCourseAsync(actor, lesson.Chapter.CourseId);
        if (!access.Succeeded)
            return access;

        var attached = await _db.CourseMaterials.Where(m => m.LessonId == lessonId).ToListAsync();
        foreach (var material in attached)
            material.LessonId = null;

        DeleteStored(lesson.VideoUrl);
        _db.Lessons.Remove(lesson);
        await TouchCourseAsync(lesson.Chapter.CourseId);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult<MaterialResponse>> CreateMaterialAsync(Actor actor, int courseId, MaterialRequest request)
    {
        var access = await RequireManageCourseAsync(actor, courseId);
        if (!access.Succeeded)
            return ServiceResult<MaterialResponse>.Fail(access.StatusCode, access.Message!);

        var parsed = await ParseMaterialAsync(request, courseId);
        if (!parsed.Succeeded)
            return ServiceResult<MaterialResponse>.Fail(parsed.StatusCode, parsed.Message!);

        var maxOrder = await _db.CourseMaterials.Where(m => m.CourseId == courseId).MaxAsync(m => (int?)m.SortOrder) ?? -1;
        var material = parsed.Value!;
        material.CourseId = courseId;
        material.SortOrder = request.SortOrder ?? maxOrder + 1;
        material.CreatedAt = DateTime.UtcNow;

        _db.CourseMaterials.Add(material);
        await TouchCourseAsync(courseId);
        await _db.SaveChangesAsync();

        return ServiceResult<MaterialResponse>.Created(MapMaterial(material));
    }

    public async Task<ServiceResult<MaterialResponse>> UploadMaterialAsync(Actor actor, int courseId, MaterialUploadRequest request)
    {
        var access = await RequireManageCourseAsync(actor, courseId);
        if (!access.Succeeded)
            return ServiceResult<MaterialResponse>.Fail(access.StatusCode, access.Message!);

        var saved = await SaveUploadAsync(courseId.ToString(), request.File);
        if (!saved.Succeeded)
            return ServiceResult<MaterialResponse>.Fail(saved.StatusCode, saved.Message!);

        var ext = Path.GetExtension(request.File!.FileName);
        var type = string.IsNullOrWhiteSpace(request.Type)
            ? StoredMedia.GuessMaterialType(ext)
            : request.Type.Trim();
        if (!MaterialTypes.IsValid(type) || type == MaterialTypes.Link)
            type = StoredMedia.GuessMaterialType(ext);

        if (request.LessonId.HasValue)
        {
            var belongs = await _db.Lessons
                .AnyAsync(l => l.Id == request.LessonId.Value && l.Chapter.CourseId == courseId);
            if (!belongs)
            {
                _files.Delete(saved.Value);
                return ServiceResult<MaterialResponse>.Fail(StatusCodes.Status400BadRequest, "Lesson does not belong to this course");
            }
        }

        var title = string.IsNullOrWhiteSpace(request.Title)
            ? Path.GetFileNameWithoutExtension(request.File.FileName)
            : request.Title.Trim();
        if (string.IsNullOrWhiteSpace(title))
        {
            _files.Delete(saved.Value);
            return ServiceResult<MaterialResponse>.Fail(StatusCodes.Status400BadRequest, "Material title is required");
        }

        var maxOrder = await _db.CourseMaterials.Where(m => m.CourseId == courseId).MaxAsync(m => (int?)m.SortOrder) ?? -1;
        var material = new CourseMaterial
        {
            CourseId = courseId,
            LessonId = request.LessonId,
            Title = title,
            Url = StoredMedia.Encode(saved.Value!),
            Type = type,
            SortOrder = maxOrder + 1,
            CreatedAt = DateTime.UtcNow
        };

        _db.CourseMaterials.Add(material);
        await TouchCourseAsync(courseId);
        await _db.SaveChangesAsync();

        return ServiceResult<MaterialResponse>.Created(MapMaterial(material));
    }

    public async Task<ServiceResult<MaterialResponse>> UpdateMaterialAsync(Actor actor, int materialId, MaterialRequest request)
    {
        var material = await _db.CourseMaterials.FirstOrDefaultAsync(m => m.Id == materialId);
        if (material == null)
            return ServiceResult<MaterialResponse>.Fail(StatusCodes.Status404NotFound, "Material not found");

        var access = await RequireManageCourseAsync(actor, material.CourseId);
        if (!access.Succeeded)
            return ServiceResult<MaterialResponse>.Fail(access.StatusCode, access.Message!);

        var parsed = await ParseMaterialAsync(request, material.CourseId);
        if (!parsed.Succeeded)
            return ServiceResult<MaterialResponse>.Fail(parsed.StatusCode, parsed.Message!);

        var data = parsed.Value!;
        material.Title = data.Title;
        material.Url = data.Url;
        material.Type = data.Type;
        material.LessonId = data.LessonId;
        if (request.SortOrder.HasValue)
            material.SortOrder = request.SortOrder.Value;
        await TouchCourseAsync(material.CourseId);
        await _db.SaveChangesAsync();

        return ServiceResult<MaterialResponse>.Ok(MapMaterial(material));
    }

    public async Task<ServiceResult> DeleteMaterialAsync(Actor actor, int materialId)
    {
        var material = await _db.CourseMaterials.FirstOrDefaultAsync(m => m.Id == materialId);
        if (material == null)
            return ServiceResult.Fail(StatusCodes.Status404NotFound, "Material not found");

        var access = await RequireManageCourseAsync(actor, material.CourseId);
        if (!access.Succeeded)
            return access;

        DeleteStored(material.Url);
        _db.CourseMaterials.Remove(material);
        await TouchCourseAsync(material.CourseId);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult<StoredFileResponse>> OpenMaterialFileAsync(Actor actor, int materialId)
    {
        var material = await _db.CourseMaterials
            .Include(m => m.Course).ThenInclude(c => c.Lecturers)
            .FirstOrDefaultAsync(m => m.Id == materialId);
        if (material == null)
            return ServiceResult<StoredFileResponse>.Fail(StatusCodes.Status404NotFound, "Material not found");

        if (!CanRead(actor, material.Course))
            return ServiceResult<StoredFileResponse>.Fail(StatusCodes.Status404NotFound, "Material not found");

        return OpenStored(material.Url, material.Title, inline: false);
    }

    public async Task<ServiceResult<LessonResponse>> UploadLessonVideoAsync(Actor actor, int lessonId, LessonVideoUploadRequest request)
    {
        var lesson = await _db.Lessons.Include(l => l.Chapter).FirstOrDefaultAsync(l => l.Id == lessonId);
        if (lesson == null)
            return ServiceResult<LessonResponse>.Fail(StatusCodes.Status404NotFound, "Lesson not found");

        var access = await RequireManageCourseAsync(actor, lesson.Chapter.CourseId);
        if (!access.Succeeded)
            return ServiceResult<LessonResponse>.Fail(access.StatusCode, access.Message!);

        var saved = await SaveUploadAsync(lesson.Chapter.CourseId.ToString(), request.File);
        if (!saved.Succeeded)
            return ServiceResult<LessonResponse>.Fail(saved.StatusCode, saved.Message!);

        var ext = Path.GetExtension(request.File!.FileName);
        if (!StoredMedia.VideoExtensions.Contains(ext))
        {
            _files.Delete(saved.Value);
            return ServiceResult<LessonResponse>.Fail(StatusCodes.Status400BadRequest, "Lesson video must be mp4, webm or mov");
        }

        DeleteStored(lesson.VideoUrl);
        lesson.VideoUrl = StoredMedia.Encode(saved.Value!);
        if (request.DurationSeconds is >= 0)
            lesson.DurationSeconds = request.DurationSeconds;
        lesson.UpdatedAt = DateTime.UtcNow;
        await TouchCourseAsync(lesson.Chapter.CourseId);
        await _db.SaveChangesAsync();

        return ServiceResult<LessonResponse>.Ok(MapLesson(lesson));
    }

    public async Task<ServiceResult<StoredFileResponse>> OpenLessonVideoAsync(Actor actor, int lessonId)
    {
        var lesson = await _db.Lessons
            .Include(l => l.Chapter).ThenInclude(c => c.Course).ThenInclude(c => c.Lecturers)
            .FirstOrDefaultAsync(l => l.Id == lessonId);
        if (lesson == null)
            return ServiceResult<StoredFileResponse>.Fail(StatusCodes.Status404NotFound, "Lesson not found");

        if (!CanRead(actor, lesson.Chapter.Course))
            return ServiceResult<StoredFileResponse>.Fail(StatusCodes.Status404NotFound, "Lesson not found");

        return OpenStored(lesson.VideoUrl, lesson.Title, inline: true);
    }

    public async Task<ServiceResult> AssignLecturerAsync(Actor actor, int courseId, int userId)
    {
        if (!actor.IsAdmin)
            return ServiceResult.Fail(StatusCodes.Status403Forbidden, "Only an admin can assign course lecturers");

        if (!await _db.Courses.AnyAsync(c => c.Id == courseId))
            return ServiceResult.Fail(StatusCodes.Status404NotFound, "Course not found");

        var userCheck = await RequireActiveRoleAsync(userId, "Lecturer", "Lecturer not found");
        if (!userCheck.Succeeded)
            return userCheck;

        if (await _db.CourseLecturers.AnyAsync(x => x.CourseId == courseId && x.LecturerId == userId))
            return ServiceResult.Fail(StatusCodes.Status409Conflict, "Lecturer is already assigned to this course");

        _db.CourseLecturers.Add(new CourseLecturer { CourseId = courseId, LecturerId = userId });
        await TouchCourseAsync(courseId);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> UnassignLecturerAsync(Actor actor, int courseId, int userId)
    {
        if (!actor.IsAdmin)
            return ServiceResult.Fail(StatusCodes.Status403Forbidden, "Only an admin can unassign course lecturers");

        var link = await _db.CourseLecturers.FirstOrDefaultAsync(x => x.CourseId == courseId && x.LecturerId == userId);
        if (link == null)
            return ServiceResult.Fail(StatusCodes.Status404NotFound, "Course lecturer assignment not found");

        _db.CourseLecturers.Remove(link);
        await TouchCourseAsync(courseId);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    private async Task<ServiceResult<Course>> ParseCourseRequestAsync(CourseRequest request, int? existingId)
    {
        var title = request.Title?.Trim();
        if (string.IsNullOrWhiteSpace(title))
            return ServiceResult<Course>.Fail(StatusCodes.Status400BadRequest, "Course title is required");

        var level = string.IsNullOrWhiteSpace(request.Level) ? CourseLevels.Beginner : request.Level.Trim();
        if (!CourseLevels.IsValid(level))
            return ServiceResult<Course>.Fail(StatusCodes.Status400BadRequest, "Invalid course level");

        if (!request.CategoryId.HasValue)
            return ServiceResult<Course>.Fail(StatusCodes.Status400BadRequest, "Course category is required");

        if (!await _db.Categories.AnyAsync(c => c.Id == request.CategoryId.Value))
            return ServiceResult<Course>.Fail(StatusCodes.Status400BadRequest, "Category not found");

        _ = existingId;

        return ServiceResult<Course>.Ok(new Course
        {
            Title = title,
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            ThumbnailUrl = string.IsNullOrWhiteSpace(request.ThumbnailUrl) ? null : request.ThumbnailUrl.Trim(),
            Level = level,
            CategoryId = request.CategoryId
        });
    }

    private static ServiceResult<Lesson> ParseLesson(LessonRequest request)
    {
        var title = request.Title?.Trim();
        if (string.IsNullOrWhiteSpace(title))
            return ServiceResult<Lesson>.Fail(StatusCodes.Status400BadRequest, "Lesson title is required");

        if (request.DurationSeconds is < 0)
            return ServiceResult<Lesson>.Fail(StatusCodes.Status400BadRequest, "Duration cannot be negative");

        return ServiceResult<Lesson>.Ok(new Lesson
        {
            Title = title,
            Content = string.IsNullOrWhiteSpace(request.Content) ? null : request.Content,
            VideoUrl = string.IsNullOrWhiteSpace(request.VideoUrl) ? null : request.VideoUrl.Trim(),
            DurationSeconds = request.DurationSeconds
        });
    }

    private async Task<ServiceResult<CourseMaterial>> ParseMaterialAsync(MaterialRequest request, int courseId)
    {
        var title = request.Title?.Trim();
        var url = request.Url?.Trim();
        if (string.IsNullOrWhiteSpace(title))
            return ServiceResult<CourseMaterial>.Fail(StatusCodes.Status400BadRequest, "Material title is required");
        if (string.IsNullOrWhiteSpace(url))
            return ServiceResult<CourseMaterial>.Fail(StatusCodes.Status400BadRequest, "Material url is required");

        var type = string.IsNullOrWhiteSpace(request.Type) ? MaterialTypes.Link : request.Type.Trim();
        if (!MaterialTypes.IsValid(type))
            return ServiceResult<CourseMaterial>.Fail(StatusCodes.Status400BadRequest, "Invalid material type");

        if (request.LessonId.HasValue)
        {
            var belongs = await _db.Lessons
                .AnyAsync(l => l.Id == request.LessonId.Value && l.Chapter.CourseId == courseId);
            if (!belongs)
                return ServiceResult<CourseMaterial>.Fail(StatusCodes.Status400BadRequest, "Lesson does not belong to this course");
        }

        return ServiceResult<CourseMaterial>.Ok(new CourseMaterial
        {
            Title = title,
            Url = url,
            Type = type,
            LessonId = request.LessonId
        });
    }

    private async Task<ServiceResult> RequireManageCourseAsync(Actor actor, int courseId)
    {
        var course = await _db.Courses.Include(c => c.Lecturers).FirstOrDefaultAsync(c => c.Id == courseId);
        if (course == null)
            return ServiceResult.Fail(StatusCodes.Status404NotFound, "Course not found");

        if (!CanManage(actor, course))
            return ServiceResult.Fail(StatusCodes.Status403Forbidden, "You cannot manage this course");

        return ServiceResult.Ok();
    }

    private async Task<ServiceResult> RequireActiveRoleAsync(int userId, string role, string notFoundMessage)
    {
        var user = await _users.FindByIdAsync(userId.ToString());
        if (user == null || !user.IsActive)
            return ServiceResult.Fail(StatusCodes.Status404NotFound, notFoundMessage);

        if (!await _users.IsInRoleAsync(user, role))
            return ServiceResult.Fail(StatusCodes.Status400BadRequest, $"User is not a {role.ToLowerInvariant()}");

        return ServiceResult.Ok();
    }

    private async Task TouchCourseAsync(int courseId)
    {
        var course = await _db.Courses.FindAsync(courseId);
        if (course != null)
            course.UpdatedAt = DateTime.UtcNow;
    }

    private async Task<Course?> LoadDetailAsync(int id) =>
        await _db.Courses
            .AsNoTracking()
            .Include(c => c.Category)
            .Include(c => c.Lecturers).ThenInclude(l => l.Lecturer)
            .Include(c => c.Chapters).ThenInclude(ch => ch.Lessons)
            .Include(c => c.Materials)
            .FirstOrDefaultAsync(c => c.Id == id);

    private static bool CanManage(Actor actor, Course course) =>
        actor.IsAdmin || course.Lecturers.Any(l => l.LecturerId == actor.UserId);

    private static bool CanRead(Actor actor, Course course)
    {
        if (actor.IsAdmin || CanManage(actor, course))
            return true;

        return course.Status == CourseStatuses.Published;
    }

    private static CourseDetailResponse MapDetail(Course course) =>
        new(
            course.Id,
            course.Title,
            course.Description,
            course.ThumbnailUrl,
            course.Level,
            course.Status,
            course.CategoryId,
            course.Category?.Name,
            course.Lecturers
                .Select(l => new UserSummary(l.LecturerId, l.Lecturer.FullName, l.Lecturer.Email!))
                .ToList(),
            course.Chapters
                .OrderBy(c => c.SortOrder)
                .ThenBy(c => c.Id)
                .Select(MapChapter)
                .ToList(),
            course.Materials
                .OrderBy(m => m.SortOrder)
                .ThenBy(m => m.Id)
                .Select(MapMaterial)
                .ToList(),
            course.CreatedAt,
            course.UpdatedAt);

    private static ChapterResponse MapChapter(Chapter chapter) =>
        new(
            chapter.Id,
            chapter.CourseId,
            chapter.Title,
            chapter.SortOrder,
            chapter.Lessons
                .OrderBy(l => l.SortOrder)
                .ThenBy(l => l.Id)
                .Select(MapLesson)
                .ToList());

    private static LessonResponse MapLesson(Lesson lesson) =>
        new(lesson.Id, lesson.ChapterId, lesson.Title, lesson.Content, lesson.VideoUrl, lesson.DurationSeconds, lesson.SortOrder);

    private static MaterialResponse MapMaterial(CourseMaterial material) =>
        new(
            material.Id,
            material.CourseId,
            material.LessonId,
            material.Title,
            material.Url,
            material.Type,
            material.SortOrder,
            StoredMedia.IsStored(material.Url));

    private async Task<ServiceResult<string>> SaveUploadAsync(string folder, IFormFile? file)
    {
        if (file == null || file.Length == 0)
            return ServiceResult<string>.Fail(StatusCodes.Status400BadRequest, "A file is required");

        if (file.Length > StoredMedia.MaxBytes)
            return ServiceResult<string>.Fail(StatusCodes.Status400BadRequest, "File is too large");

        var ext = Path.GetExtension(file.FileName);
        if (!StoredMedia.IsAllowedExtension(ext))
            return ServiceResult<string>.Fail(StatusCodes.Status400BadRequest, "File type is not allowed");

        await using var stream = file.OpenReadStream();
        var key = await _files.SaveAsync(folder, file.FileName, stream);
        return ServiceResult<string>.Ok(key);
    }

    private ServiceResult<StoredFileResponse> OpenStored(string? storedUrl, string title, bool inline)
    {
        var key = StoredMedia.Decode(storedUrl);
        if (key == null)
            return ServiceResult<StoredFileResponse>.Fail(StatusCodes.Status404NotFound, "Uploaded file not found");

        try
        {
            var stream = _files.OpenRead(key);
            var ext = Path.GetExtension(key);
            var downloadName = string.IsNullOrWhiteSpace(title)
                ? Path.GetFileName(key)
                : title + (Path.HasExtension(title) ? "" : ext);
            return ServiceResult<StoredFileResponse>.Ok(
                new StoredFileResponse(stream, StoredMedia.ContentType(ext), downloadName, inline));
        }
        catch (FileNotFoundException)
        {
            return ServiceResult<StoredFileResponse>.Fail(StatusCodes.Status404NotFound, "Uploaded file not found");
        }
    }

    private void DeleteStored(string? value)
    {
        var key = StoredMedia.Decode(value);
        if (key != null)
            _files.Delete(key);
    }

    private static bool ShouldReplaceVideo(string? current, string? incoming)
    {
        if (StoredMedia.IsStored(current))
        {
            if (string.IsNullOrWhiteSpace(incoming) || StoredMedia.IsStored(incoming) || incoming.StartsWith("/api/", StringComparison.Ordinal))
                return false;
            return incoming != current;
        }

        return incoming != current;
    }
}
