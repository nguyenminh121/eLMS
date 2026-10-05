using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using BasicLMS.Models;
using BasicLMS.Tests.Infrastructure;

namespace BasicLMS.Tests.Lms;

public class UploadsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public UploadsTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task UploadMaterial_AsStudent_Returns403()
    {
        var course = await _factory.CreateCourseAsync($"UpS-{Guid.NewGuid():N}"[..16], CourseStatuses.Published);
        var email = TestHelpers.UniqueEmail("up-stu");
        await _factory.CreateUserAsync(email);
        var client = await _factory.CreateClientAsAsync(email, TestHelpers.ValidPassword);

        var response = await client.PostAsync(
            $"/api/courses/{course.Id}/materials/upload",
            PdfForm("notes.pdf", "Notes"));
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task UploadMaterial_WithoutFile_Returns400()
    {
        var course = await _factory.CreateCourseAsync($"UpE-{Guid.NewGuid():N}"[..16]);
        var admin = await AdminAsync();
        using var form = new MultipartFormDataContent();
        form.Add(new StringContent("Empty"), "title");

        var response = await admin.PostAsync($"/api/courses/{course.Id}/materials/upload", form);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UploadMaterial_BadExtension_Returns400()
    {
        var course = await _factory.CreateCourseAsync($"UpX-{Guid.NewGuid():N}"[..16]);
        var admin = await AdminAsync();
        using var form = new MultipartFormDataContent();
        form.Add(new StringContent("Nope"), "title");
        form.Add(ByteFile("malware.exe", [1, 2, 3], "application/octet-stream"), "file", "malware.exe");

        var response = await admin.PostAsync($"/api/courses/{course.Id}/materials/upload", form);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UploadMaterial_Admin_ThenStudentCanDownloadWhenPublished()
    {
        var course = await _factory.CreateCourseAsync($"UpP-{Guid.NewGuid():N}"[..16], CourseStatuses.Published);
        var admin = await AdminAsync();

        var upload = await admin.PostAsync(
            $"/api/courses/{course.Id}/materials/upload",
            PdfForm("slides.pdf", "Slides"));
        Assert.Equal(HttpStatusCode.Created, upload.StatusCode);
        var material = await upload.Content.ReadFromJsonAsync<MaterialResult>();
        Assert.NotNull(material);
        Assert.True(material.IsFile);

        var adminFile = await admin.GetAsync($"/api/materials/{material.Id}/file");
        Assert.Equal(HttpStatusCode.OK, adminFile.StatusCode);
        Assert.Equal("%PDF-test", await adminFile.Content.ReadAsStringAsync());

        var email = TestHelpers.UniqueEmail("up-dl");
        await _factory.CreateUserAsync(email);
        var student = await _factory.CreateClientAsAsync(email, TestHelpers.ValidPassword);

        var studentFile = await student.GetAsync($"/api/materials/{material.Id}/file");
        Assert.Equal(HttpStatusCode.OK, studentFile.StatusCode);
    }

    [Fact]
    public async Task DownloadMaterial_OnDraft_AsStudent_Returns404()
    {
        var course = await _factory.CreateCourseAsync($"UpD-{Guid.NewGuid():N}"[..16], CourseStatuses.Draft);
        var admin = await AdminAsync();
        var upload = await admin.PostAsync(
            $"/api/courses/{course.Id}/materials/upload",
            PdfForm("hidden.pdf", "Hidden"));
        var material = await upload.Content.ReadFromJsonAsync<MaterialResult>();

        var email = TestHelpers.UniqueEmail("up-hide");
        await _factory.CreateUserAsync(email);
        var student = await _factory.CreateClientAsAsync(email, TestHelpers.ValidPassword);

        var hidden = await student.GetAsync($"/api/materials/{material!.Id}/file");
        Assert.Equal(HttpStatusCode.NotFound, hidden.StatusCode);
    }

    [Fact]
    public async Task UploadLessonVideo_ThenStream()
    {
        var course = await _factory.CreateCourseAsync($"Vid-{Guid.NewGuid():N}"[..16], CourseStatuses.Published);
        var admin = await AdminAsync();
        var chapterRes = await admin.PostAsJsonAsync($"/api/courses/{course.Id}/chapters", new { title = "Media" });
        var chapter = await chapterRes.Content.ReadFromJsonAsync<ChapterResult>();
        var lessonRes = await admin.PostAsJsonAsync($"/api/chapters/{chapter!.Id}/lessons", new { title = "Clip" });
        var lesson = await lessonRes.Content.ReadFromJsonAsync<LessonResult>();

        using var form = new MultipartFormDataContent();
        form.Add(ByteFile("intro.mp4", [0, 0, 0, 1], "video/mp4"), "file", "intro.mp4");

        var upload = await admin.PostAsync($"/api/lessons/{lesson!.Id}/video", form);
        Assert.Equal(HttpStatusCode.OK, upload.StatusCode);

        var stream = await admin.GetAsync($"/api/lessons/{lesson.Id}/video");
        Assert.Equal(HttpStatusCode.OK, stream.StatusCode);
        Assert.Equal("video/mp4", stream.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task DownloadFile_WithoutToken_Returns401()
    {
        var response = await _factory.CreateClient().GetAsync("/api/materials/1/file");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private Task<HttpClient> AdminAsync() =>
        _factory.CreateClientAsAsync(
            CustomWebApplicationFactory.AdminEmail,
            CustomWebApplicationFactory.AdminPassword);

    private static MultipartFormDataContent PdfForm(string fileName, string title)
    {
        var form = new MultipartFormDataContent();
        form.Add(new StringContent(title), "title");
        form.Add(ByteFile(fileName, "%PDF-test"u8.ToArray(), "application/pdf"), "file", fileName);
        return form;
    }

    private static ByteArrayContent ByteFile(string name, byte[] bytes, string contentType)
    {
        var content = new ByteArrayContent(bytes);
        content.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        content.Headers.ContentDisposition = new ContentDispositionHeaderValue("form-data")
        {
            Name = "file",
            FileName = name
        };
        return content;
    }
}
