namespace BasicLMS.DTOs.Lms;

public record CategoryRequest(string Name, string? Description);

public record CategoryResponse(int Id, string Name, string? Description, DateTime CreatedAt, int CourseCount);

public record UserSummary(int Id, string FullName, string Email);

public record CourseListItem(
    int Id,
    string Title,
    string? Description,
    string? ThumbnailUrl,
    string Level,
    string Status,
    int? CategoryId,
    string? CategoryName,
    int ChapterCount,
    int ClassCount,
    IList<UserSummary> Lecturers,
    DateTime UpdatedAt);

public record CourseRequest(
    string Title,
    string? Description,
    string? ThumbnailUrl,
    string? Level,
    int? CategoryId,
    string? Status = null);

public record CourseStatusRequest(string Status);

public record LessonResponse(
    int Id,
    int ChapterId,
    string Title,
    string? Content,
    string? VideoUrl,
    int? DurationSeconds,
    int SortOrder);

public record ChapterResponse(
    int Id,
    int CourseId,
    string Title,
    int SortOrder,
    IList<LessonResponse> Lessons);

public record MaterialResponse(
    int Id,
    int CourseId,
    int? LessonId,
    string Title,
    string Url,
    string Type,
    int SortOrder,
    bool IsFile);

public record StoredFileResponse(Stream Stream, string ContentType, string FileName, bool Inline);

public record CourseDetailResponse(
    int Id,
    string Title,
    string? Description,
    string? ThumbnailUrl,
    string Level,
    string Status,
    int? CategoryId,
    string? CategoryName,
    IList<UserSummary> Lecturers,
    IList<ChapterResponse> Chapters,
    IList<MaterialResponse> Materials,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record ChapterRequest(string Title, int? SortOrder);

public record LessonRequest(
    string Title,
    string? Content,
    string? VideoUrl,
    int? DurationSeconds,
    int? SortOrder);

public record MaterialRequest(
    string Title,
    string Url,
    string? Type,
    int? LessonId,
    int? SortOrder);

public record ClassListItem(
    int Id,
    int CourseId,
    string CourseTitle,
    string Name,
    string Status,
    DateTime? StartDate,
    DateTime? EndDate,
    int? Capacity,
    int EnrollmentCount,
    IList<UserSummary> Lecturers);

public record EnrollmentResponse(
    int Id,
    int ClassId,
    int StudentId,
    string StudentName,
    string StudentEmail,
    string Status,
    DateTime EnrolledAt,
    DateTime? CompletedAt);

public record ClassDetailResponse(
    int Id,
    int CourseId,
    string CourseTitle,
    string Name,
    string Status,
    DateTime? StartDate,
    DateTime? EndDate,
    int? Capacity,
    IList<UserSummary> Lecturers,
    IList<EnrollmentResponse> Enrollments,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    bool CanManage);

public record ClassRequest(
    int CourseId,
    string Name,
    DateTime? StartDate,
    DateTime? EndDate,
    string? Status,
    int? Capacity);

public record EnrollRequest(int? StudentId);

public class MaterialUploadRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Type { get; set; }
    public int? LessonId { get; set; }
    public IFormFile? File { get; set; }
}

public class LessonVideoUploadRequest
{
    public IFormFile? File { get; set; }
    public int? DurationSeconds { get; set; }
}
