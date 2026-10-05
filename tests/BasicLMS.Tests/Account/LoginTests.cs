using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using BasicLMS.Tests.Infrastructure;

namespace BasicLMS.Tests.Account;

public class LoginTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public LoginTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Login_SeededAdmin_Returns200_WithValidJwt()
    {
        var response = await _client.PostLoginAsync(
            CustomWebApplicationFactory.AdminEmail,
            CustomWebApplicationFactory.AdminPassword);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<AuthResult>();
        Assert.NotNull(body);
        Assert.Equal(CustomWebApplicationFactory.AdminEmail, body.Email);
        Assert.Equal("System Administrator", body.FullName);
        Assert.Contains("Admin", body.Roles);

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(body.Token);

        Assert.Equal(CustomWebApplicationFactory.JwtIssuer, jwt.Issuer);
        Assert.Contains(CustomWebApplicationFactory.JwtAudience, jwt.Audiences);
        Assert.Equal(body.UserId.ToString(), jwt.Claims.Single(c => c.Type == ClaimTypes.NameIdentifier).Value);
        Assert.Equal(CustomWebApplicationFactory.AdminEmail, jwt.Claims.Single(c => c.Type == ClaimTypes.Email).Value);
        Assert.Contains(jwt.Claims, c => c.Type == ClaimTypes.Role && c.Value == "Admin");

        var lifetime = jwt.ValidTo - DateTime.UtcNow;
        Assert.InRange(lifetime.TotalMinutes, 55, 61);
    }

    [Fact]
    public async Task Login_Student_ReturnsStudentRole()
    {
        var email = TestHelpers.UniqueEmail("student");
        await _factory.CreateUserAsync(email, fullName: "Le Van C");

        var response = await _client.PostLoginAsync(email, TestHelpers.ValidPassword);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<AuthResult>();
        Assert.NotNull(body);
        Assert.Equal("Le Van C", body.FullName);
        Assert.Equal(["Student"], body.Roles);
    }

    [Fact]
    public async Task Login_EmailIsCaseInsensitiveAndTrimmed()
    {
        var email = TestHelpers.UniqueEmail("ci");
        await _factory.CreateUserAsync(email);

        var response = await _client.PostLoginAsync(
            $"  {email.ToUpperInvariant()}  ",
            TestHelpers.ValidPassword);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Login_WrongPassword_Returns401()
    {
        var response = await _client.PostLoginAsync(
            CustomWebApplicationFactory.AdminEmail,
            "Wrong@123456");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<ErrorResult>();
        Assert.NotNull(body);
        Assert.Equal("Invalid email or password", body.Message);
    }

    [Fact]
    public async Task Login_UnknownEmail_Returns401_WithSameMessage()
    {
        var response = await _client.PostLoginAsync(
            TestHelpers.UniqueEmail("ghost"),
            TestHelpers.ValidPassword);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<ErrorResult>();
        Assert.NotNull(body);
        Assert.Equal("Invalid email or password", body.Message);
    }

    [Fact]
    public async Task Login_InactiveUser_Returns401()
    {
        var email = TestHelpers.UniqueEmail("inactive");
        await _factory.CreateUserAsync(email, isActive: false);

        var response = await _client.PostLoginAsync(email, TestHelpers.ValidPassword);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-an-email")]
    public async Task Login_InvalidEmail_Returns400(string email)
    {
        var response = await _client.PostLoginAsync(email, TestHelpers.ValidPassword);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Login_EmptyPassword_Returns400()
    {
        var response = await _client.PostLoginAsync(
            CustomWebApplicationFactory.AdminEmail, "");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
