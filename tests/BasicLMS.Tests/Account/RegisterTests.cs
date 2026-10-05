using System.Net;
using System.Net.Http.Json;
using BasicLMS.Tests.Infrastructure;

namespace BasicLMS.Tests.Account;

public class RegisterTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public RegisterTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private Task<HttpResponseMessage> RegisterAsync(object body) =>
        _client.PostAsJsonAsync("/api/account/register", body);

    [Fact]
    public async Task Register_ValidRequest_Returns200_AndAssignsStudentRole()
    {
        var email = TestHelpers.UniqueEmail("register");

        var response = await RegisterAsync(new
        {
            fullName = "Nguyen Van A",
            email,
            password = TestHelpers.ValidPassword
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var user = await _factory.FindUserByEmailAsync(email);
        Assert.NotNull(user);
        Assert.Equal("Nguyen Van A", user.FullName);
        Assert.True(user.IsActive);

        var roles = await _factory.GetRolesAsync(email);
        Assert.Equal(["Student"], roles);
    }

    [Fact]
    public async Task Register_TrimsFullNameAndEmail()
    {
        var email = TestHelpers.UniqueEmail("trim");

        var response = await RegisterAsync(new
        {
            fullName = "   Tran Thi B   ",
            email = $"   {email}   ",
            password = TestHelpers.ValidPassword
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var user = await _factory.FindUserByEmailAsync(email);
        Assert.NotNull(user);
        Assert.Equal("Tran Thi B", user.FullName);
        Assert.Equal(email, user.Email);
    }

    [Fact]
    public async Task Register_MissingFullName_Returns400()
    {
        var response = await RegisterAsync(new
        {
            email = TestHelpers.UniqueEmail("nofullname"),
            password = TestHelpers.ValidPassword
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<ErrorResult>();
        Assert.NotNull(body);
        Assert.False(string.IsNullOrWhiteSpace(body.Message));
    }

    [Fact]
    public async Task Register_WhitespaceFullName_Returns400()
    {
        var response = await RegisterAsync(new
        {
            fullName = "    ",
            email = TestHelpers.UniqueEmail("blankname"),
            password = TestHelpers.ValidPassword
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData("not-an-email")]
    [InlineData("missing-at.com")]
    [InlineData("")]
    public async Task Register_InvalidEmail_Returns400(string email)
    {
        var response = await RegisterAsync(new
        {
            fullName = "Invalid Email",
            email,
            password = TestHelpers.ValidPassword
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Register_PasswordShorterThan6_Returns400()
    {
        var response = await RegisterAsync(new
        {
            fullName = "Short Password",
            email = TestHelpers.UniqueEmail("short"),
            password = "Ab1!"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<ErrorResult>();
        Assert.NotNull(body);
        Assert.Contains("6", body.Message);
    }

    [Theory]
    [InlineData("abcdef1!", "PasswordRequiresUpper")]
    [InlineData("ABCDEF1!", "PasswordRequiresLower")]
    [InlineData("Abcdefg!", "PasswordRequiresDigit")]
    [InlineData("Abcdef12", "PasswordRequiresNonAlphanumeric")]
    public async Task Register_PasswordViolatesIdentityPolicy_Returns400WithErrors(
        string password, string expectedCode)
    {
        var email = TestHelpers.UniqueEmail("policy");

        var response = await RegisterAsync(new
        {
            fullName = "Weak Password",
            email,
            password
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<ErrorResult>();
        Assert.NotNull(body);
        Assert.NotNull(body.Errors);
        Assert.Contains(body.Errors, e => e.Code == expectedCode);

        Assert.Null(await _factory.FindUserByEmailAsync(email));
    }

    [Fact]
    public async Task Register_DuplicateEmail_Returns409()
    {
        var email = TestHelpers.UniqueEmail("dup");
        await _factory.CreateUserAsync(email);

        var response = await RegisterAsync(new
        {
            fullName = "Duplicate",
            email,
            password = TestHelpers.ValidPassword
        });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Register_DuplicateEmailDifferentCase_Returns409()
    {
        var email = TestHelpers.UniqueEmail("case");
        await _factory.CreateUserAsync(email);

        var response = await RegisterAsync(new
        {
            fullName = "Duplicate Upper",
            email = email.ToUpperInvariant(),
            password = TestHelpers.ValidPassword
        });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Register_ThenLogin_Succeeds()
    {
        var email = TestHelpers.UniqueEmail("flow");

        var register = await RegisterAsync(new
        {
            fullName = "Flow User",
            email,
            password = TestHelpers.ValidPassword
        });
        Assert.Equal(HttpStatusCode.OK, register.StatusCode);

        var token = await _client.LoginAsync(email, TestHelpers.ValidPassword);
        Assert.False(string.IsNullOrWhiteSpace(token));
    }
}
