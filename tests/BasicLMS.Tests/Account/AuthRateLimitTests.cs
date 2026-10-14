using System.Net;
using System.Net.Http.Json;
using BasicLMS.Tests.Infrastructure;

namespace BasicLMS.Tests.Account;

public class LowAuthRateLimitFactory : CustomWebApplicationFactory
{
    public const int Limit = 3;

    protected override int AuthPermitLimit => Limit;
}

public class AuthRateLimitTests : IClassFixture<LowAuthRateLimitFactory>
{
    private readonly LowAuthRateLimitFactory _factory;

    public AuthRateLimitTests(LowAuthRateLimitFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Login_OverPerIpLimit_Returns429_WithRetryAfter()
    {
        var client = _factory.CreateClient();
        var email = TestHelpers.UniqueEmail("ratelimit");

        for (var i = 0; i < LowAuthRateLimitFactory.Limit; i++)
        {
            var allowed = await client.PostLoginAsync(email, "Wrong@12345");
            Assert.Equal(HttpStatusCode.Unauthorized, allowed.StatusCode);
        }

        var throttled = await client.PostLoginAsync(email, "Wrong@12345");

        Assert.Equal(HttpStatusCode.TooManyRequests, throttled.StatusCode);
        Assert.True(throttled.Headers.Contains("Retry-After"));
        var body = await throttled.Content.ReadFromJsonAsync<ErrorResult>();
        Assert.Equal("Too many requests. Please try again later.", body!.Message);

        // Other endpoints are not throttled by the auth policy.
        var health = await client.GetAsync("/api/health");
        Assert.Equal(HttpStatusCode.OK, health.StatusCode);
    }
}
