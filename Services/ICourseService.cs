using BasicLMS.DTOs.Lms;

namespace BasicLMS.Services;

public interface ICourseService
{
    Task<IReadOnlyList<CourseListItem>> ListAsync(Actor actor, string? search, string? status, int? categoryId);
    Task<ServiceResult<CourseDetailResponse>> GetAsync(Actor actor, int id);
    Task<ServiceResult<CourseDetailResponse>> CreateAsync(Actor actor, CourseRequest request);
    Task<ServiceResult<CourseDetailResponse>> UpdateAsync(Actor actor, int id, CourseRequest request);
    Task<ServiceResult<CourseDetailResponse>> UpdateStatusAsync(Actor actor, int id, string status);
    Task<ServiceResult> DeleteAsync(Actor actor, int id);

    Task<ServiceResult<ChapterResponse>> CreateChapterAsync(Actor actor, int courseId, ChapterRequest request);
    Task<ServiceResult<ChapterResponse>> UpdateChapterAsync(Actor actor, int chapterId, ChapterRequest request);
    Task<ServiceResult> DeleteChapterAsync(Actor actor, int chapterId);

    Task<ServiceResult<LessonResponse>> CreateLessonAsync(Actor actor, int chapterId, LessonRequest request);
    Task<ServiceResult<LessonResponse>> UpdateLessonAsync(Actor actor, int lessonId, LessonRequest request);
    Task<ServiceResult> DeleteLessonAsync(Actor actor, int lessonId);

    Task<ServiceResult<MaterialResponse>> CreateMaterialAsync(Actor actor, int courseId, MaterialRequest request);
    Task<ServiceResult<MaterialResponse>> UploadMaterialAsync(Actor actor, int courseId, MaterialUploadRequest request);
    Task<ServiceResult<MaterialResponse>> UpdateMaterialAsync(Actor actor, int materialId, MaterialRequest request);
    Task<ServiceResult> DeleteMaterialAsync(Actor actor, int materialId);
    Task<ServiceResult<StoredFileResponse>> OpenMaterialFileAsync(Actor actor, int materialId);

    Task<ServiceResult<LessonResponse>> UploadLessonVideoAsync(Actor actor, int lessonId, LessonVideoUploadRequest request);
    Task<ServiceResult<StoredFileResponse>> OpenLessonVideoAsync(Actor actor, int lessonId);

    Task<ServiceResult> AssignLecturerAsync(Actor actor, int courseId, int userId);
    Task<ServiceResult> UnassignLecturerAsync(Actor actor, int courseId, int userId);
}
