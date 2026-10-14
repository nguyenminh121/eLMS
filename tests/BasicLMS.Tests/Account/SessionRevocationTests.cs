using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using BasicLMS.Models;
using BasicLMS.Tests.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace BasicLMS.Tests.Account;

public class SessionRevocationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public SessionRevocationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Token_AfterUserDeactivated_Returns401()
    {
        var email = TestHelpers.UniqueEmail("revoke-off");
        await _factory.CreateUserAsync(email);
        var client = await _factory.CreateClientAsAsync(email, TestHelpers.ValidPassword);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/account/me")).StatusCode);

        await UpdateUserAsync(email, async (users, user) =>
        {
            user.IsActive = false;
            await users.UpdateAsync(user);
        });

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/account/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/courses")).StatusCode);
    }

    [Fact]
    public async Task Token_AfterAdminResetsPassword_Returns401()
    {
        var email = TestHelpers.UniqueEmail("revoke-reset");
        var user = await _factory.CreateUserAsync(email);
        var client = await _factory.CreateClientAsAsync(email, TestHelpers.ValidPassword);

        var admin = await _factory.CreateClientAsAsync(
            CustomWebApplicationFactory.AdminEmail, CustomWebApplicationFactory.AdminPassword);
        var reset = await admin.PostAsJsonAsync(
            $"/api/admin/users/{user.Id}/reset-password", new { newPassword = "Changed@2026" });
        Assert.Equal(HttpStatusCode.OK, reset.StatusCode);

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/account/me")).StatusCode);

        var fresh = await _factory.CreateClientAsAsync(email, "Changed@2026");
        Assert.Equal(HttpStatusCode.OK, (await fresh.GetAsync("/api/account/me")).StatusCode);
    }

    [Fact]
    public async Task Token_RoleGrantedAfterLogin_AppliesImmediately()
    {
        var email = TestHelpers.UniqueEmail("revoke-role");
        await _factory.CreateUserAsync(email);
        var client = await _factory.CreateClientAsAsync(email, TestHelpers.ValidPassword);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/users")).StatusCode);

        await UpdateUserAsync(email, (users, user) => users.AddToRoleAsync(user, "Lecturer"));

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/users")).StatusCode);
    }

    [Fact]
    public async Task Token_RoleRemovedAfterLogin_AppliesImmediately()
    {
        var email = TestHelpers.UniqueEmail("revoke-demote");
        await _factory.CreateUserAsync(email, role: "Lecturer");
        var client = await _factory.CreateClientAsAsync(email, TestHelpers.ValidPassword);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/users")).StatusCode);

        await UpdateUserAsync(email, (users, user) => users.RemoveFromRoleAsync(user, "Lecturer"));

        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/users")).StatusCode);
    }

    [Fact]
    public async Task Token_WithoutSecurityStamp_Returns401()
    {
        var email = TestHelpers.UniqueEmail("revoke-nostamp");
        var user = await _factory.CreateUserAsync(email);

        var token = new JwtSecurityToken(
            issuer: CustomWebApplicationFactory.JwtIssuer,
            audience: CustomWebApplicationFactory.JwtAudience,
            claims: [new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()), new Claim(ClaimTypes.Role, "Admin")],
            expires: DateTime.UtcNow.AddMinutes(10),
            signingCredentials: new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(CustomWebApplicationFactory.JwtKey)),
                SecurityAlgorithms.HmacSha256));

        var client = _factory.CreateAuthorizedClient(new JwtSecurityTokenHandler().WriteToken(token));

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/account/me")).StatusCode);
    }

    private async Task UpdateUserAsync(
        string email, Func<UserManager<ApplicationUser>, ApplicationUser, Task> change)
    {
        using var scope = _factory.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var user = await users.FindByEmailAsync(email);
        await change(users, user!);
    }
}
