using BasicLMS.DTOs.Lms;

namespace BasicLMS.Services;

public interface IClassService
{
    Task<IReadOnlyList<ClassListItem>> ListAsync(Actor actor, int? courseId, string? status);
    Task<ServiceResult<ClassDetailResponse>> GetAsync(Actor actor, int id);
    Task<ServiceResult<ClassDetailResponse>> CreateAsync(Actor actor, ClassRequest request);
    Task<ServiceResult<ClassDetailResponse>> UpdateAsync(Actor actor, int id, ClassRequest request);
    Task<ServiceResult> DeleteAsync(Actor actor, int id);

    Task<ServiceResult> AssignLecturerAsync(Actor actor, int classId, int userId);
    Task<ServiceResult> UnassignLecturerAsync(Actor actor, int classId, int userId);

    Task<ServiceResult<EnrollmentResponse>> EnrollAsync(Actor actor, int classId, int? studentId);
    Task<ServiceResult> UnenrollAsync(Actor actor, int enrollmentId);
}
