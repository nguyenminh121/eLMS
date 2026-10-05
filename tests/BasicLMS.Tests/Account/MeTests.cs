using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using BasicLMS.Tests.Infrastructure;
using Microsoft.IdentityModel.Tokens;

namespace BasicLMS.Tests.Account;

public class MeTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public MeTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Me_WithoutToken_Returns401()
    {
        var response = await _factory.CreateClient().GetAsync("/api/account/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Me_WithGarbageToken_Returns401()
    {
        var client = _factory.CreateAuthorizedClient("this.is.not-a-jwt");

        var response = await client.GetAsync("/api/account/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Me_WithTokenSignedByAnotherKey_Returns401()
    {
        var forged = new JwtSecurityToken(
            issuer: CustomWebApplicationFactory.JwtIssuer,
            audience: CustomWebApplicationFactory.JwtAudience,
            claims: [new Claim(ClaimTypes.NameIdentifier, "1"), new Claim(ClaimTypes.Role, "Admin")],
            expires: DateTime.UtcNow.AddMinutes(10),
            signingCredentials: new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes("Attacker-Controlled-Key-Of-32-Bytes-Long!!")),
                SecurityAlgorithms.HmacSha256));

        var client = _factory.CreateAuthorizedClient(
            new JwtSecurityTokenHandler().WriteToken(forged));

        var response = await client.GetAsync("/api/account/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Me_WithExpiredToken_Returns401()
    {
        var expired = new JwtSecurityToken(
            issuer: CustomWebApplicationFactory.JwtIssuer,
            audience: CustomWebApplicationFactory.JwtAudience,
            claims: [new Claim(ClaimTypes.NameIdentifier, "1")],
            notBefore: DateTime.UtcNow.AddMinutes(-20),
            expires: DateTime.UtcNow.AddMinutes(-10),
            signingCredentials: new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(CustomWebApplicationFactory.JwtKey)),
                SecurityAlgorithms.HmacSha256));

        var client = _factory.CreateAuthorizedClient(
            new JwtSecurityTokenHandler().WriteToken(expired));

        var response = await client.GetAsync("/api/account/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Me_WithValidToken_ReturnsProfile()
    {
        var email = TestHelpers.UniqueEmail("me");
        var user = await _factory.CreateUserAsync(email, fullName: "Pham Thi D");

        var client = await _factory.CreateClientAsAsync(email, TestHelpers.ValidPassword);

        var response = await client.GetAsync("/api/account/me");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<MeResult>();
        Assert.NotNull(body);
        Assert.Equal(user.Id, body.Id);
        Assert.Equal(email, body.Email);
        Assert.Equal("Pham Thi D", body.FullName);
        Assert.Equal(["Student"], body.Roles);
    }
}
