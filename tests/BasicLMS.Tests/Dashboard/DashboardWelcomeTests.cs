using System.Net;
using System.Net.Http.Json;
using BasicLMS.Models;
using BasicLMS.Tests.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace BasicLMS.Tests.Dashboard;

public class DashboardWelcomeTests : IClassFixture<CustomWebApplicationFactory>
{
    private const string WelcomeUrl = "/api/dashboard/welcome";

    private readonly CustomWebApplicationFactory _factory;

    public DashboardWelcomeTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Welcome_WithoutToken_Returns401()
    {
        var response = await _factory.CreateClient().GetAsync(WelcomeUrl);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Welcome_Student_ReturnsStudentGreeting()
    {
        var email = TestHelpers.UniqueEmail("welcome-student");
        await _factory.CreateUserAsync(email, fullName: "Hoang Van E");

        var client = await _factory.CreateClientAsAsync(email, TestHelpers.ValidPassword);

        var response = await client.GetAsync(WelcomeUrl);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<WelcomeResult>();
        Assert.NotNull(body);
        Assert.Equal("Hoang Van E", body.FullName);
        Assert.Equal(email, body.Email);
        Assert.Equal(["Student"], body.Roles);
        Assert.Contains("Hoang Van E", body.Message);
        Assert.Contains("buổi học", body.Message);
        Assert.InRange(body.ServerTimeUtc, DateTime.UtcNow.AddMinutes(-1), DateTime.UtcNow.AddMinutes(1));
    }

    [Fact]
    public async Task Welcome_Lecturer_ReturnsLecturerGreeting()
    {
        var email = TestHelpers.UniqueEmail("welcome-lecturer");
        await _factory.CreateUserAsync(email, role: "Lecturer", fullName: "Vu Thi F");

        var client = await _factory.CreateClientAsAsync(email, TestHelpers.ValidPassword);

        var body = await client.GetFromJsonAsync<WelcomeResult>(WelcomeUrl);

        Assert.NotNull(body);
        Assert.Equal(["Lecturer"], body.Roles);
        Assert.Contains("giảng viên", body.Message);
    }

    [Fact]
    public async Task Welcome_Admin_ReturnsAdminGreeting()
    {
        var client = await _factory.CreateClientAsAsync(
            CustomWebApplicationFactory.AdminEmail,
            CustomWebApplicationFactory.AdminPassword);

        var body = await client.GetFromJsonAsync<WelcomeResult>(WelcomeUrl);

        Assert.NotNull(body);
        Assert.Contains("Admin", body.Roles);
        Assert.Contains("quản trị viên", body.Message);
    }

    [Fact]
    public async Task Welcome_UserDeactivatedAfterLogin_Returns401()
    {
        var email = TestHelpers.UniqueEmail("welcome-deactivated");
        await _factory.CreateUserAsync(email);

        var client = await _factory.CreateClientAsAsync(email, TestHelpers.ValidPassword);

        using (var scope = _factory.Services.CreateScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var user = await users.FindByEmailAsync(email);
            user!.IsActive = false;
            await users.UpdateAsync(user);
        }

        var response = await client.GetAsync(WelcomeUrl);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
