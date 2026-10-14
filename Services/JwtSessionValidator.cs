using System.Security.Claims;
using BasicLMS.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;

namespace BasicLMS.Services;

// Runs after the JWT signature/lifetime checks so tokens stop working as soon as the account
// is deactivated or its security stamp changes (e.g. password reset), and roles always come
// from the database instead of the possibly stale token.
public static class JwtSessionValidator
{
    public const string SecurityStampClaim = "security_stamp";

    public static async Task ValidateAsync(TokenValidatedContext context)
    {
        var principal = context.Principal;
        var userId = principal?.FindFirstValue(ClaimTypes.NameIdentifier);
        var stamp = principal?.FindFirstValue(SecurityStampClaim);

        if (principal?.Identity is not ClaimsIdentity identity ||
            string.IsNullOrEmpty(userId) ||
            string.IsNullOrEmpty(stamp))
        {
            context.Fail("Token is missing required claims.");
            return;
        }

        var users = context.HttpContext.RequestServices
            .GetRequiredService<UserManager<ApplicationUser>>();
        var user = await users.FindByIdAsync(userId);

        if (user == null || !user.IsActive || !string.Equals(user.SecurityStamp, stamp, StringComparison.Ordinal))
        {
            context.Fail("Session is no longer valid.");
            return;
        }

        foreach (var claim in identity.FindAll(identity.RoleClaimType).ToList())
            identity.RemoveClaim(claim);

        var roles = await users.GetRolesAsync(user);
        identity.AddClaims(roles.Select(role => new Claim(identity.RoleClaimType, role)));
    }
}
