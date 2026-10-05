using System.Net;
using System.Net.Http.Json;
using BasicLMS.Models;
using BasicLMS.Tests.Infrastructure;

namespace BasicLMS.Tests.Lms;

public class CoursesTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public CoursesTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task List_WithoutToken_Returns401()
    {
        var response = await _factory.CreateClient().GetAsync("/api/courses");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Create_AsStudent_Returns403()
    {
        var email = TestHelpers.UniqueEmail("course-student");
        await _factory.CreateUserAsync(email);
        var client = await _factory.CreateClientAsAsync(email, TestHelpers.ValidPassword);

        var response = await client.PostAsJsonAsync("/api/courses", new { title = "Nope" });
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Create_AsLecturer_Returns403()
    {
        var email = TestHelpers.UniqueEmail("course-lecturer");
        await _factory.CreateUserAsync(email, role: "Lecturer");
        var client = await _factory.CreateClientAsAsync(email, TestHelpers.ValidPassword);

        var response = await client.PostAsJsonAsync("/api/courses", new { title = "Nope" });
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Create_WithoutCategory_Returns400()
    {
        var client = await AdminAsync();
        var response = await client.PostAsJsonAsync("/api/courses", new { title = "No category" });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_WithDraftStatus_IsDraft()
    {
        var category = await _factory.CreateCategoryAsync();
        var client = await AdminAsync();
        var response = await client.PostAsJsonAsync("/api/courses", new
        {
            title = $"Draft {Guid.NewGuid():N}"[..16],
            status = "Draft",
            categoryId = category.Id
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var course = await response.Content.ReadFromJsonAsync<CourseDetailResult>();
        Assert.Equal("Draft", course!.Status);
    }

    [Fact]
    public async Task Create_MissingTitle_Returns400()
    {
        var client = await AdminAsync();
        var response = await client.PostAsJsonAsync("/api/courses", new { title = "" });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Student_CannotSeeDraft_ButCanSeePublished()
    {
        var draft = await _factory.CreateCourseAsync($"Draft-{Guid.NewGuid():N}"[..16]);
        var published = await _factory.CreateCourseAsync($"Pub-{Guid.NewGuid():N}"[..16], CourseStatuses.Published);

        var email = TestHelpers.UniqueEmail("see-course");
        await _factory.CreateUserAsync(email);
        var student = await _factory.CreateClientAsAsync(email, TestHelpers.ValidPassword);

        var list = await student.GetFromJsonAsync<List<CourseListResult>>("/api/courses");
        Assert.DoesNotContain(list!, c => c.Id == draft.Id);
        Assert.Contains(list!, c => c.Id == published.Id);

        var hidden = await student.GetAsync($"/api/courses/{draft.Id}");
        Assert.Equal(HttpStatusCode.NotFound, hidden.StatusCode);
    }

    [Fact]
    public async Task AssignedLecturer_CanUpdate_UnassignedCannot()
    {
        var course = await _factory.CreateCourseAsync($"Owned-{Guid.NewGuid():N}"[..16]);

        var ownerEmail = TestHelpers.UniqueEmail("owner");
        var owner = await _factory.CreateUserAsync(ownerEmail, role: "Lecturer", fullName: "Owner Lec");
        await _factory.AssignCourseLecturerAsync(course.Id, owner.Id);

        var otherEmail = TestHelpers.UniqueEmail("other-lec");
        await _factory.CreateUserAsync(otherEmail, role: "Lecturer");

        var ownerClient = await _factory.CreateClientAsAsync(ownerEmail, TestHelpers.ValidPassword);
        var otherClient = await _factory.CreateClientAsAsync(otherEmail, TestHelpers.ValidPassword);

        var category = await _factory.CreateCategoryAsync();
        var ok = await ownerClient.PutAsJsonAsync($"/api/courses/{course.Id}", new
        {
            title = "Updated by owner",
            level = "Intermediate",
            categoryId = category.Id
        });
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);

        var forbidden = await otherClient.PutAsJsonAsync($"/api/courses/{course.Id}", new
        {
            title = "Hijack"
        });
        Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);
    }

    [Fact]
    public async Task Admin_CanBuildCurriculum_AssignLecturer_AndPublish()
    {
        var lecturerEmail = TestHelpers.UniqueEmail("assign-lec");
        var lecturer = await _factory.CreateUserAsync(lecturerEmail, role: "Lecturer", fullName: "Lan Lecturer");
        var admin = await AdminAsync();

        var category = await _factory.CreateCategoryAsync();
        var created = await admin.PostAsJsonAsync("/api/courses", new
        {
            title = $"C# Basics {Guid.NewGuid():N}"[..20],
            description = "Intro",
            level = "Beginner",
            categoryId = category.Id
        });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var course = await created.Content.ReadFromJsonAsync<CourseDetailResult>();
        Assert.NotNull(course);
        Assert.Equal("Published", course.Status);

        var chapterRes = await admin.PostAsJsonAsync($"/api/courses/{course.Id}/chapters", new { title = "Intro" });
        Assert.Equal(HttpStatusCode.Created, chapterRes.StatusCode);
        var chapter = await chapterRes.Content.ReadFromJsonAsync<ChapterResult>();
        Assert.NotNull(chapter);

        var lessonRes = await admin.PostAsJsonAsync($"/api/chapters/{chapter.Id}/lessons", new
        {
            title = "Hello world",
            content = "Print hello",
            durationSeconds = 120
        });
        Assert.Equal(HttpStatusCode.Created, lessonRes.StatusCode);

        var materialRes = await admin.PostAsJsonAsync($"/api/courses/{course.Id}/materials", new
        {
            title = "Slides",
            url = "https://example.com/slides.pdf",
            type = "File"
        });
        Assert.Equal(HttpStatusCode.Created, materialRes.StatusCode);

        var assign = await admin.PostAsync($"/api/courses/{course.Id}/lecturers/{lecturer.Id}", null);
        Assert.Equal(HttpStatusCode.OK, assign.StatusCode);

        var published = await admin.PatchAsJsonAsync($"/api/courses/{course.Id}/status", new { status = "Published" });
        Assert.Equal(HttpStatusCode.OK, published.StatusCode);

        var detail = await admin.GetFromJsonAsync<CourseDetailResult>($"/api/courses/{course.Id}");
        Assert.NotNull(detail);
        Assert.Equal("Published", detail.Status);
        Assert.Single(detail.Chapters);
        Assert.Single(detail.Chapters[0].Lessons);
        Assert.Single(detail.Materials);
        Assert.Contains(detail.Lecturers, l => l.Id == lecturer.Id);
    }

    [Fact]
    public async Task AssignLecturer_StudentUser_Returns400()
    {
        var course = await _factory.CreateCourseAsync($"Assign-{Guid.NewGuid():N}"[..16]);
        var student = await _factory.CreateUserAsync(TestHelpers.UniqueEmail("not-lec"));
        var admin = await AdminAsync();

        var response = await admin.PostAsync($"/api/courses/{course.Id}/lecturers/{student.Id}", null);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Delete_CourseWithClass_Returns409()
    {
        var course = await _factory.CreateCourseAsync($"Locked-{Guid.NewGuid():N}"[..16]);
        await _factory.CreateClassAsync(course.Id, "K1");
        var admin = await AdminAsync();

        var response = await admin.DeleteAsync($"/api/courses/{course.Id}");
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Get_Unknown_Returns404()
    {
        var admin = await AdminAsync();
        var response = await admin.GetAsync("/api/courses/999999");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private Task<HttpClient> AdminAsync() =>
        _factory.CreateClientAsAsync(
            CustomWebApplicationFactory.AdminEmail,
            CustomWebApplicationFactory.AdminPassword);
}
