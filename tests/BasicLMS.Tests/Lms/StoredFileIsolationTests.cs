using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using BasicLMS.Data;
using BasicLMS.Models;
using BasicLMS.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace BasicLMS.Tests.Lms;

public class StoredFileIsolationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public StoredFileIsolationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task CreateMaterial_PointingToAnotherCoursesFile_Returns400()
    {
        var (_, victimMaterial) = await UploadVictimFileAsync();
        var (ownCourse, lecturer) = await LecturerWithCourseAsync();

        var response = await lecturer.PostAsJsonAsync($"/api/courses/{ownCourse.Id}/materials",
            new { title = "stolen", url = victimMaterial.Url, type = "File" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ErrorResult>();
        Assert.Equal("Material url must be an http or https address", body!.Message);
    }

    [Theory]
    [InlineData("javascript:alert(1)")]
    [InlineData("data:text/html,<script>alert(1)</script>")]
    [InlineData("/relative/path.pdf")]
    public async Task CreateMaterial_WithNonHttpUrl_Returns400(string url)
    {
        var (ownCourse, lecturer) = await LecturerWithCourseAsync();

        var response = await lecturer.PostAsJsonAsync($"/api/courses/{ownCourse.Id}/materials",
            new { title = "bad", url });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateMaterial_ResendingItsOwnStoredUrl_Returns200()
    {
        var (_, material) = await UploadVictimFileAsync();
        var admin = await AdminAsync();

        var response = await admin.PutAsJsonAsync($"/api/materials/{material.Id}",
            new { title = "Renamed", url = material.Url, type = material.Type });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await admin.GetAsync($"/api/materials/{material.Id}/file")).StatusCode);
    }

    [Fact]
    public async Task CreateLesson_WithStoredVideoUrl_Returns400()
    {
        var (ownCourse, lecturer) = await LecturerWithCourseAsync();
        var chapter = await CreateChapterAsync(lecturer, ownCourse.Id);

        var response = await lecturer.PostAsJsonAsync($"/api/chapters/{chapter.Id}/lessons",
            new { title = "Clip", videoUrl = $"local:{ownCourse.Id + 1000}/x.mp4" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ErrorResult>();
        Assert.Equal("Video url must be an http or https address", body!.Message);
    }

    [Fact]
    public async Task UpdateLesson_SwitchingToStoredVideoUrl_Returns400()
    {
        var (ownCourse, lecturer) = await LecturerWithCourseAsync();
        var chapter = await CreateChapterAsync(lecturer, ownCourse.Id);
        var created = await lecturer.PostAsJsonAsync($"/api/chapters/{chapter.Id}/lessons",
            new { title = "Clip", videoUrl = "https://videos.example.com/intro.mp4" });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var lesson = await created.Content.ReadFromJsonAsync<LessonResult>();

        var response = await lecturer.PutAsJsonAsync($"/api/lessons/{lesson!.Id}",
            new { title = "Clip", videoUrl = "local:1/someone-else.mp4" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateCourse_WithJavascriptThumbnail_Returns400()
    {
        var category = await _factory.CreateCategoryAsync();
        var admin = await AdminAsync();

        var response = await admin.PostAsJsonAsync("/api/courses",
            new { title = "Thumb", categoryId = category.Id, thumbnailUrl = "javascript:alert(1)" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ErrorResult>();
        Assert.Equal("Thumbnail url must be an http or https address", body!.Message);
    }

    [Fact]
    public async Task ExistingCrossCourseReference_CannotReadOrDeleteForeignFile()
    {
        var (_, victimMaterial) = await UploadVictimFileAsync();
        var (ownCourse, lecturer) = await LecturerWithCourseAsync();

        int legacyId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var legacy = new CourseMaterial
            {
                CourseId = ownCourse.Id,
                Title = "legacy",
                Url = victimMaterial.Url,
                Type = MaterialTypes.File,
                CreatedAt = DateTime.UtcNow
            };
            db.CourseMaterials.Add(legacy);
            await db.SaveChangesAsync();
            legacyId = legacy.Id;
        }

        Assert.Equal(HttpStatusCode.NotFound, (await lecturer.GetAsync($"/api/materials/{legacyId}/file")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await lecturer.DeleteAsync($"/api/materials/{legacyId}")).StatusCode);

        var admin = await AdminAsync();
        var victimFile = await admin.GetAsync($"/api/materials/{victimMaterial.Id}/file");
        Assert.Equal(HttpStatusCode.OK, victimFile.StatusCode);
        Assert.Equal("%PDF-victim", await victimFile.Content.ReadAsStringAsync());
    }

    private async Task<(Course Course, MaterialResult Material)> UploadVictimFileAsync()
    {
        var course = await _factory.CreateCourseAsync($"Vic-{Guid.NewGuid():N}"[..16], CourseStatuses.Published);
        var admin = await AdminAsync();

        using var form = new MultipartFormDataContent();
        form.Add(new StringContent("Victim"), "title");
        var file = new ByteArrayContent("%PDF-victim"u8.ToArray());
        file.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        form.Add(file, "file", "victim.pdf");

        var upload = await admin.PostAsync($"/api/courses/{course.Id}/materials/upload", form);
        Assert.Equal(HttpStatusCode.Created, upload.StatusCode);
        var material = await upload.Content.ReadFromJsonAsync<MaterialResult>();
        return (course, material!);
    }

    private async Task<(Course Course, HttpClient Client)> LecturerWithCourseAsync()
    {
        var course = await _factory.CreateCourseAsync($"Own-{Guid.NewGuid():N}"[..16]);
        var email = TestHelpers.UniqueEmail("iso-lec");
        var lecturer = await _factory.CreateUserAsync(email, role: "Lecturer");
        await _factory.AssignCourseLecturerAsync(course.Id, lecturer.Id);
        var client = await _factory.CreateClientAsAsync(email, TestHelpers.ValidPassword);
        return (course, client);
    }

    private static async Task<ChapterResult> CreateChapterAsync(HttpClient client, int courseId)
    {
        var response = await client.PostAsJsonAsync($"/api/courses/{courseId}/chapters", new { title = "Ch" });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<ChapterResult>())!;
    }

    private Task<HttpClient> AdminAsync() =>
        _factory.CreateClientAsAsync(
            CustomWebApplicationFactory.AdminEmail,
            CustomWebApplicationFactory.AdminPassword);
}
