using BasicLMS.DTOs.Dashboard;
using BasicLMS.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BasicLMS.Controllers;

[ApiController]
[Authorize]
[Route("api/dashboard")]
public class DashboardController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _users;

    public DashboardController(UserManager<ApplicationUser> users)
    {
        _users = users;
    }

    // GET: /api/dashboard/welcome
    [HttpGet("welcome")]
    public async Task<IActionResult> Welcome()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (userId == null)
            return Unauthorized(new { message = "Unauthorized" });

        var user = await _users.FindByIdAsync(userId);

        if (user == null || !user.IsActive)
            return Unauthorized(new { message = "Account is not available" });

        var roles = await _users.GetRolesAsync(user);

        return Ok(new WelcomeResponse(
            user.FullName,
            user.Email!,
            roles,
            BuildMessage(user.FullName, roles),
            DateTime.UtcNow
        ));
    }

    private static string BuildMessage(string fullName, IList<string> roles)
    {
        var name = string.IsNullOrWhiteSpace(fullName) ? "bạn" : fullName;

        if (roles.Contains("Admin"))
            return $"Chào mừng quản trị viên {name} quay trở lại hệ thống BasicLMS.";

        if (roles.Contains("Lecturer"))
            return $"Chào mừng giảng viên {name}! Sẵn sàng cho buổi giảng dạy hôm nay chưa?";

        return $"Chào mừng {name}! Chúc bạn có một buổi học hiệu quả.";
    }
}
