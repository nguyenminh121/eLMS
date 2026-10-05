using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using BasicLMS.Data;
using BasicLMS.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace BasicLMS.Tests.Infrastructure;

public record AuthResult(string Token, int UserId, string FullName, string Email, List<string> Roles);

public record MeResult(int Id, string Email, string FullName, List<string> Roles);

public record ErrorItem(string Code, string Description);

public record ErrorResult(string Message, List<ErrorItem>? Errors);

public record WelcomeResult(
    string FullName,
    string Email,
    List<string> Roles,
    string Message,
    DateTime ServerTimeUtc);

public record AdminUserResult(
    int Id,
    string FullName,
    string Email,
    List<string> Roles,
    bool IsActive,
    DateTime CreatedAt);

public record CategoryResult(int Id, string Name, string? Description, DateTime CreatedAt, int CourseCount);

public record UserSummaryResult(int Id, string FullName, string Email);

public record CourseListResult(
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
    List<UserSummaryResult> Lecturers,
    DateTime UpdatedAt);

public record LessonResult(
    int Id,
    int ChapterId,
    string Title,
    string? Content,
    string? VideoUrl,
    int? DurationSeconds,
    int SortOrder);

public record ChapterResult(int Id, int CourseId, string Title, int SortOrder, List<LessonResult> Lessons);

public record MaterialResult(
    int Id,
    int CourseId,
    int? LessonId,
    string Title,
    string Url,
    string Type,
    int SortOrder,
    bool IsFile);

public record CourseDetailResult(
    int Id,
    string Title,
    string? Description,
    string? ThumbnailUrl,
    string Level,
    string Status,
    int? CategoryId,
    string? CategoryName,
    List<UserSummaryResult> Lecturers,
    List<ChapterResult> Chapters,
    List<MaterialResult> Materials,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record ClassListResult(
    int Id,
    int CourseId,
    string CourseTitle,
    string Name,
    string Status,
    DateTime? StartDate,
    DateTime? EndDate,
    int? Capacity,
    int EnrollmentCount,
    List<UserSummaryResult> Lecturers);

public record EnrollmentResult(
    int Id,
    int ClassId,
    int StudentId,
    string StudentName,
    string StudentEmail,
    string Status,
    DateTime EnrolledAt,
    DateTime? CompletedAt);

public record ClassDetailResult(
    int Id,
    int CourseId,
    string CourseTitle,
    string Name,
    string Status,
    DateTime? StartDate,
    DateTime? EndDate,
    int? Capacity,
    List<UserSummaryResult> Lecturers,
    List<EnrollmentResult> Enrollments,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    bool CanManage);

public static class TestHelpers
{
    public const string ValidPassword = "Valid@123";

    public static string UniqueEmail(string prefix) =>
        $"{prefix}-{Guid.NewGuid():N}@test.local";

    public static async Task<ApplicationUser> CreateUserAsync(
        this CustomWebApplicationFactory factory,
        string email,
        string password = ValidPassword,
        string role = "Student",
        bool isActive = true,
        string fullName = "Test User")
    {
        using var scope = factory.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            FullName = fullName,
            IsActive = isActive,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var created = await users.CreateAsync(user, password);
        Assert.True(created.Succeeded, string.Join(", ", created.Errors.Select(e => e.Description)));

        var roleAdded = await users.AddToRoleAsync(user, role);
        Assert.True(roleAdded.Succeeded, string.Join(", ", roleAdded.Errors.Select(e => e.Description)));

        return user;
    }

    public static Task<HttpResponseMessage> PostLoginAsync(
        this HttpClient client, string email, string password) =>
        client.PostAsJsonAsync("/api/account/login", new { email, password });

    public static async Task<string> LoginAsync(
        this HttpClient client, string email, string password)
    {
        var response = await client.PostLoginAsync(email, password);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<AuthResult>();
        Assert.NotNull(body);
        Assert.False(string.IsNullOrWhiteSpace(body.Token));

        return body.Token;
    }

    public static HttpClient CreateAuthorizedClient(
        this CustomWebApplicationFactory factory, string token)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    public static async Task<HttpClient> CreateClientAsAsync(
        this CustomWebApplicationFactory factory, string email, string password)
    {
        var token = await factory.CreateClient().LoginAsync(email, password);
        return factory.CreateAuthorizedClient(token);
    }

    public static async Task<ApplicationUser?> FindUserByEmailAsync(
        this CustomWebApplicationFactory factory, string email)
    {
        using var scope = factory.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        return await users.FindByEmailAsync(email);
    }

    public static async Task<IList<string>> GetRolesAsync(
        this CustomWebApplicationFactory factory, string email)
    {
        using var scope = factory.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var user = await users.FindByEmailAsync(email);
        Assert.NotNull(user);
        return await users.GetRolesAsync(user);
    }

    public static async Task<Category> CreateCategoryAsync(
        this CustomWebApplicationFactory factory, string? name = null)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var category = new Category
        {
            Name = name ?? $"Cat-{Guid.NewGuid():N}"[..12],
            CreatedAt = DateTime.UtcNow
        };
        db.Categories.Add(category);
        await db.SaveChangesAsync();
        return category;
    }

    public static async Task<Course> CreateCourseAsync(
        this CustomWebApplicationFactory factory,
        string title,
        string status = CourseStatuses.Draft,
        int? categoryId = null)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var now = DateTime.UtcNow;
        var course = new Course
        {
            Title = title,
            Status = status,
            Level = CourseLevels.Beginner,
            CategoryId = categoryId,
            CreatedAt = now,
            UpdatedAt = now
        };
        db.Courses.Add(course);
        await db.SaveChangesAsync();
        return course;
    }

    public static async Task AssignCourseLecturerAsync(
        this CustomWebApplicationFactory factory, int courseId, int lecturerId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.CourseLecturers.Add(new CourseLecturer { CourseId = courseId, LecturerId = lecturerId });
        await db.SaveChangesAsync();
    }

    public static async Task<Class> CreateClassAsync(
        this CustomWebApplicationFactory factory,
        int courseId,
        string name,
        string status = ClassStatuses.Draft,
        int? capacity = null)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var now = DateTime.UtcNow;
        var cls = new Class
        {
            CourseId = courseId,
            Name = name,
            Status = status,
            Capacity = capacity,
            CreatedAt = now,
            UpdatedAt = now
        };
        db.Classes.Add(cls);
        await db.SaveChangesAsync();
        return cls;
    }

    public static async Task AssignClassLecturerAsync(
        this CustomWebApplicationFactory factory, int classId, int lecturerId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.ClassLecturers.Add(new ClassLecturer { ClassId = classId, LecturerId = lecturerId });
        await db.SaveChangesAsync();
    }
}
