using System.Net;
using System.Net.Http.Json;
using BasicLMS.Tests.Infrastructure;

namespace BasicLMS.Tests.Admin;

public class AdminUsersTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public AdminUsersTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private Task<HttpClient> AdminClientAsync() =>
        _factory.CreateClientAsAsync(
            CustomWebApplicationFactory.AdminEmail,
            CustomWebApplicationFactory.AdminPassword);

    private static string ResetUrl(int id) => $"/api/admin/users/{id}/reset-password";

    // ---------- Reset password ----------

    [Fact]
    public async Task ResetPassword_WithoutToken_Returns401()
    {
        var response = await _factory.CreateClient()
            .PostAsJsonAsync(ResetUrl(1), new { newPassword = "New@12345" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ResetPassword_AsStudent_Returns403()
    {
        var email = TestHelpers.UniqueEmail("student-reset");
        var student = await _factory.CreateUserAsync(email);
        var client = await _factory.CreateClientAsAsync(email, TestHelpers.ValidPassword);

        var response = await client.PostAsJsonAsync(
            ResetUrl(student.Id), new { newPassword = "New@12345" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task ResetPassword_AsLecturer_Returns403()
    {
        var email = TestHelpers.UniqueEmail("lecturer-reset");
        var lecturer = await _factory.CreateUserAsync(email, role: "Lecturer");
        var client = await _factory.CreateClientAsAsync(email, TestHelpers.ValidPassword);

        var response = await client.PostAsJsonAsync(
            ResetUrl(lecturer.Id), new { newPassword = "New@12345" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task ResetPassword_UnknownUser_Returns404()
    {
        var client = await AdminClientAsync();

        var response = await client.PostAsJsonAsync(
            ResetUrl(999_999), new { newPassword = "New@12345" });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task ResetPassword_EmptyPassword_Returns400()
    {
        var user = await _factory.CreateUserAsync(TestHelpers.UniqueEmail("empty-reset"));
        var client = await AdminClientAsync();

        var response = await client.PostAsJsonAsync(
            ResetUrl(user.Id), new { newPassword = "" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ResetPassword_WeakPassword_Returns400WithErrors_AndKeepsOldPassword()
    {
        var email = TestHelpers.UniqueEmail("weak-reset");
        var user = await _factory.CreateUserAsync(email);
        var client = await AdminClientAsync();

        var response = await client.PostAsJsonAsync(
            ResetUrl(user.Id), new { newPassword = "weakpass" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<ErrorResult>();
        Assert.NotNull(body);
        Assert.NotNull(body.Errors);
        Assert.NotEmpty(body.Errors);

        var login = await _factory.CreateClient().PostLoginAsync(email, TestHelpers.ValidPassword);
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
    }

    [Fact]
    public async Task ResetPassword_Valid_Returns200_OldPasswordRejected_NewPasswordAccepted()
    {
        const string newPassword = "Reset@2026";

        var email = TestHelpers.UniqueEmail("reset");
        var user = await _factory.CreateUserAsync(email);
        var client = await AdminClientAsync();

        var response = await client.PostAsJsonAsync(
            ResetUrl(user.Id), new { newPassword });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var anonymous = _factory.CreateClient();

        var oldLogin = await anonymous.PostLoginAsync(email, TestHelpers.ValidPassword);
        Assert.Equal(HttpStatusCode.Unauthorized, oldLogin.StatusCode);

        var newLogin = await anonymous.PostLoginAsync(email, newPassword);
        Assert.Equal(HttpStatusCode.OK, newLogin.StatusCode);
    }

    // ---------- List users ----------

    [Fact]
    public async Task ListUsers_WithoutToken_Returns401()
    {
        var response = await _factory.CreateClient().GetAsync("/api/admin/users");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ListUsers_AsStudent_Returns403()
    {
        var email = TestHelpers.UniqueEmail("student-list");
        await _factory.CreateUserAsync(email);
        var client = await _factory.CreateClientAsAsync(email, TestHelpers.ValidPassword);

        var response = await client.GetAsync("/api/admin/users");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task ListUsers_AsAdmin_ReturnsUsersWithRoles()
    {
        var client = await AdminClientAsync();

        var users = await client.GetFromJsonAsync<List<AdminUserResult>>("/api/admin/users");

        Assert.NotNull(users);
        var admin = Assert.Single(users, u => u.Email == CustomWebApplicationFactory.AdminEmail);
        Assert.Contains("Admin", admin.Roles);
        Assert.True(admin.IsActive);
    }

    [Fact]
    public async Task ListUsers_Search_FiltersByEmailAndFullName_CaseInsensitive()
    {
        var marker = Guid.NewGuid().ToString("N")[..8];

        var byEmail = await _factory.CreateUserAsync($"find-{marker}@test.local", fullName: "Someone");
        var byName = await _factory.CreateUserAsync(TestHelpers.UniqueEmail("other"), fullName: $"Name {marker} User");
        await _factory.CreateUserAsync(TestHelpers.UniqueEmail("unrelated"), fullName: "Unrelated");

        var client = await AdminClientAsync();

        var users = await client.GetFromJsonAsync<List<AdminUserResult>>(
            $"/api/admin/users?search={marker.ToUpperInvariant()}");

        Assert.NotNull(users);
        Assert.Equal(
            new[] { byEmail.Id, byName.Id }.Order(),
            users.Select(u => u.Id).Order());
        Assert.All(users, u => Assert.Equal(["Student"], u.Roles));
    }
}
