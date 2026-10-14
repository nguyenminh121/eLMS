using BasicLMS.DTOs.Auth;
using BasicLMS.Models;
using BasicLMS.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace BasicLMS.Controllers;

[ApiController]
[Route("api/account")]
public class AccountController : ControllerBase
{
    public const string AuthRateLimitPolicy = "auth";

    private readonly UserManager<ApplicationUser> _users;
    private readonly IConfiguration _config;

    public AccountController(
        UserManager<ApplicationUser> users,
        IConfiguration config)
    {
        _users = users;
        _config = config;
    }

    // POST: /api/account/register
    [AllowAnonymous]
    [EnableRateLimiting(AuthRateLimitPolicy)]
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (request == null)
        {
            return BadRequest(new
            {
                message = "Request body is required"
            });
        }

        var fullName = request.FullName?.Trim();
        var email = request.Email?.Trim();
        var password = request.Password;

        if (string.IsNullOrWhiteSpace(fullName))
        {
            return BadRequest(new
            {
                message = "Full name is required"
            });
        }

        if (string.IsNullOrWhiteSpace(email) ||
            !new EmailAddressAttribute().IsValid(email))
        {
            return BadRequest(new
            {
                message = "A valid email is required"
            });
        }

        if (string.IsNullOrWhiteSpace(password) || password.Length < 6)
        {
            return BadRequest(new
            {
                message = "Password must be at least 6 characters long"
            });
        }

        var existingUser = await _users.FindByEmailAsync(email);

        if (existingUser != null)
        {
            return Conflict(new
            {
                message = "Email is already registered"
            });
        }

        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            FullName = fullName,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var result = await _users.CreateAsync(user, password);

        if (!result.Succeeded)
        {
            return BadRequest(new
            {
                message = "Register failed",
                errors = result.Errors.Select(x => new
                {
                    x.Code,
                    x.Description
                })
            });
        }

        var roleResult = await _users.AddToRoleAsync(user, "Student");

        if (!roleResult.Succeeded)
        {
            await _users.DeleteAsync(user);

            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Register failed while assigning the default role",
                errors = roleResult.Errors.Select(x => new
                {
                    x.Code,
                    x.Description
                })
            });
        }

        return Ok(new
        {
            message = "Register successful"
        });
    }

    // POST: /api/account/login
    [AllowAnonymous]
    [EnableRateLimiting(AuthRateLimitPolicy)]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (request == null)
        {
            return BadRequest(new
            {
                message = "Request body is required"
            });
        }

        var email = request.Email?.Trim();
        var password = request.Password;

        if (string.IsNullOrWhiteSpace(email) ||
            !new EmailAddressAttribute().IsValid(email))
        {
            return BadRequest(new
            {
                message = "A valid email is required"
            });
        }

        if (string.IsNullOrWhiteSpace(password))
        {
            return BadRequest(new
            {
                message = "Password is required"
            });
        }

        var user = await _users.FindByEmailAsync(email);

        if (user == null || !user.IsActive)
            return InvalidCredentials();

        if (await _users.IsLockedOutAsync(user))
            return LockedOut();

        if (!await _users.CheckPasswordAsync(user, password))
        {
            await _users.AccessFailedAsync(user);
            return await _users.IsLockedOutAsync(user) ? LockedOut() : InvalidCredentials();
        }

        await _users.ResetAccessFailedCountAsync(user);

        if (string.IsNullOrEmpty(user.SecurityStamp))
            await _users.UpdateSecurityStampAsync(user);

        var roles = await _users.GetRolesAsync(user);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email!),
            new(ClaimTypes.Name, user.UserName!),
            new(JwtSessionValidator.SecurityStampClaim, user.SecurityStamp!)
        };

        claims.AddRange(
            roles.Select(role =>
                new Claim(ClaimTypes.Role, role))
        );

        var jwtKey = _config["Jwt:Key"];

        if (string.IsNullOrWhiteSpace(jwtKey))
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "JWT configuration is missing"
            });
        }

        var expireMinutes = 60d;
        var expireMinutesConfig = _config["Jwt:ExpireMinutes"];

        if (!string.IsNullOrWhiteSpace(expireMinutesConfig) &&
            !double.TryParse(expireMinutesConfig, out expireMinutes))
        {
            expireMinutes = 60d;
        }

        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(jwtKey)
        );

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expireMinutes),
            signingCredentials: new SigningCredentials(
                key,
                SecurityAlgorithms.HmacSha256
            )
        );

        return Ok(new AuthResponse(
            new JwtSecurityTokenHandler().WriteToken(token),
            user.Id,
            user.FullName ?? "",
            user.Email!,
            roles
        ));
    }

    // GET: /api/account/me
    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var userId = User.FindFirstValue(
            ClaimTypes.NameIdentifier
        );

        if (userId == null)
            return Unauthorized(new { message = "Unauthorized" });

        var user = await _users.FindByIdAsync(userId);

        if (user == null)
            return NotFound(new { message = "User not found" });

        var roles = await _users.GetRolesAsync(user);

        return Ok(new
        {
            id = user.Id,
            email = user.Email,
            fullName = user.FullName,
            roles
        });
    }

    private UnauthorizedObjectResult InvalidCredentials() =>
        Unauthorized(new { message = "Invalid email or password" });

    private ObjectResult LockedOut() =>
        StatusCode(StatusCodes.Status429TooManyRequests, new
        {
            message = "Too many failed login attempts. Try again later."
        });
}