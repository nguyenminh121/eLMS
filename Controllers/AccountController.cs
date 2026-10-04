using BasicLMS.DTOs.Auth;
using BasicLMS.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace BasicLMS.Controllers;

[ApiController]
[Route("api/account")]
public class AccountController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _users;
    private readonly IConfiguration _config;

    public AccountController(
        UserManager<ApplicationUser> users,
        IConfiguration config)
    {
        _users = users;
        _config = config;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FullName = request.FullName
        };

        var result = await _users.CreateAsync(user, request.Password);

        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(x => x.Description));

        await _users.AddToRoleAsync(user, "Student");

        return Ok(new { message = "Register successful" });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var user = await _users.FindByEmailAsync(request.Email);

        if (user == null || !user.IsActive ||
            !await _users.CheckPasswordAsync(user, request.Password))
        {
            return Unauthorized(new
            {
                message = "Invalid email or password"
            });
        }

        var roles = await _users.GetRolesAsync(user);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email!),
            new(ClaimTypes.Name, user.UserName!)
        };

        claims.AddRange(
            roles.Select(role => new Claim(ClaimTypes.Role, role))
        );

        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_config["Jwt:Key"]!)
        );

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(
                double.Parse(_config["Jwt:ExpireMinutes"] ?? "60")
            ),
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

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var id = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var user = await _users.FindByIdAsync(id!);

        if (user == null)
            return Unauthorized();

        return Ok(new
        {
            user.Id,
            user.FullName,
            user.Email,
            Roles = await _users.GetRolesAsync(user)
        });
    }
}