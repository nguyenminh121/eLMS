using System.Net;
using System.Net.Http.Json;
using BasicLMS.Tests.Infrastructure;

namespace BasicLMS.Tests.Admin;

public class UsersLookupTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public UsersLookupTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Lookup_WithoutToken_Returns401()
    {
        var response = await _factory.CreateClient().GetAsync("/api/users");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Lookup_AsStudent_Returns403()
    {
        var email = TestHelpers.UniqueEmail("lookup-stu");
        await _factory.CreateUserAsync(email);
        var client = await _factory.CreateClientAsAsync(email, TestHelpers.ValidPassword);

        var response = await client.GetAsync("/api/users?role=Student");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Theory]
    [InlineData("Admin")]
    [InlineData("Lecturer")]
    public async Task Lookup_AsLecturer_ForNonStudentRole_Returns403(string role)
    {
        var client = await LecturerAsync();

        var response = await client.GetAsync($"/api/users?role={role}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ErrorResult>();
        Assert.Equal("You can only look up students", body!.Message);
    }

    [Fact]
    public async Task Lookup_AsLecturer_WithoutRole_ReturnsOnlyStudents()
    {
        var marker = Guid.NewGuid().ToString("N")[..8];
        var studentEmail = TestHelpers.UniqueEmail($"lk-{marker}-stu");
        var otherLecturerEmail = TestHelpers.UniqueEmail($"lk-{marker}-lec");
        await _factory.CreateUserAsync(studentEmail);
        await _factory.CreateUserAsync(otherLecturerEmail, role: "Lecturer");
        var client = await LecturerAsync();

        var users = await client.GetFromJsonAsync<List<UserSummaryResult>>($"/api/users?search={marker}");

        Assert.NotNull(users);
        Assert.Contains(users, u => u.Email == studentEmail);
        Assert.DoesNotContain(users, u => u.Email == otherLecturerEmail);
    }

    [Fact]
    public async Task Lookup_AsAdmin_ForLecturerRole_ReturnsLecturers()
    {
        var email = TestHelpers.UniqueEmail("lookup-admin-lec");
        await _factory.CreateUserAsync(email, role: "Lecturer");
        var admin = await _factory.CreateClientAsAsync(
            CustomWebApplicationFactory.AdminEmail, CustomWebApplicationFactory.AdminPassword);

        var users = await admin.GetFromJsonAsync<List<UserSummaryResult>>($"/api/users?role=Lecturer&search={email}");

        Assert.NotNull(users);
        Assert.Contains(users, u => u.Email == email);
    }

    private async Task<HttpClient> LecturerAsync()
    {
        var email = TestHelpers.UniqueEmail("lookup-lec");
        await _factory.CreateUserAsync(email, role: "Lecturer");
        return await _factory.CreateClientAsAsync(email, TestHelpers.ValidPassword);
    }
}
