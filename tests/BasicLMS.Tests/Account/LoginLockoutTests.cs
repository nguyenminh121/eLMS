using System.Net;
using System.Net.Http.Json;
using BasicLMS.Tests.Infrastructure;

namespace BasicLMS.Tests.Account;

public class LoginLockoutTests : IClassFixture<CustomWebApplicationFactory>
{
    private const int MaxFailedAttempts = 5;

    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public LoginLockoutTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Login_AfterTooManyFailures_Returns429_EvenWithCorrectPassword()
    {
        var email = TestHelpers.UniqueEmail("lockout");
        await _factory.CreateUserAsync(email);

        for (var i = 0; i < MaxFailedAttempts - 1; i++)
        {
            var failed = await _client.PostLoginAsync(email, "Wrong@12345");
            Assert.Equal(HttpStatusCode.Unauthorized, failed.StatusCode);
        }

        var locking = await _client.PostLoginAsync(email, "Wrong@12345");
        Assert.Equal(HttpStatusCode.TooManyRequests, locking.StatusCode);

        var correct = await _client.PostLoginAsync(email, TestHelpers.ValidPassword);
        Assert.Equal(HttpStatusCode.TooManyRequests, correct.StatusCode);

        var body = await correct.Content.ReadFromJsonAsync<ErrorResult>();
        Assert.Equal("Too many failed login attempts. Try again later.", body!.Message);
    }

    [Fact]
    public async Task Login_SuccessResetsFailedCount()
    {
        var email = TestHelpers.UniqueEmail("lockout-reset");
        await _factory.CreateUserAsync(email);

        for (var i = 0; i < MaxFailedAttempts - 1; i++)
            await _client.PostLoginAsync(email, "Wrong@12345");

        var ok = await _client.PostLoginAsync(email, TestHelpers.ValidPassword);
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);

        for (var i = 0; i < MaxFailedAttempts - 1; i++)
            await _client.PostLoginAsync(email, "Wrong@12345");

        var stillOk = await _client.PostLoginAsync(email, TestHelpers.ValidPassword);
        Assert.Equal(HttpStatusCode.OK, stillOk.StatusCode);
    }
}
