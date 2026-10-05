using BasicLMS.Data;
using BasicLMS.DTOs.Admin;
using BasicLMS.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BasicLMS.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin/users")]
public class AdminUsersController : ControllerBase
{
    private const int MaxResults = 100;

    private readonly UserManager<ApplicationUser> _users;
    private readonly ApplicationDbContext _db;

    public AdminUsersController(
        UserManager<ApplicationUser> users,
        ApplicationDbContext db)
    {
        _users = users;
        _db = db;
    }

    // GET: /api/admin/users?search=
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? search)
    {
        var query = _db.Users.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToUpperInvariant();

            query = query.Where(u =>
                u.NormalizedEmail!.Contains(term) ||
                u.FullName.ToUpper().Contains(term));
        }

        var users = await query
            .OrderBy(u => u.Email)
            .Take(MaxResults)
            .Select(u => new
            {
                u.Id,
                u.FullName,
                u.Email,
                u.IsActive,
                u.CreatedAt,
                Roles = (
                    from ur in _db.UserRoles
                    join r in _db.Roles on ur.RoleId equals r.Id
                    where ur.UserId == u.Id
                    select r.Name!
                ).ToList()
            })
            .ToListAsync();

        return Ok(users.Select(u => new AdminUserItem(
            u.Id,
            u.FullName,
            u.Email ?? "",
            u.Roles,
            u.IsActive,
            u.CreatedAt
        )));
    }

    // POST: /api/admin/users/{id}/reset-password
    [HttpPost("{id:int}/reset-password")]
    public async Task<IActionResult> ResetPassword(
        int id,
        [FromBody] AdminResetPasswordRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.NewPassword))
        {
            return BadRequest(new
            {
                message = "New password is required"
            });
        }

        var user = await _users.FindByIdAsync(id.ToString());

        if (user == null)
        {
            return NotFound(new
            {
                message = "User not found"
            });
        }

        var token = await _users.GeneratePasswordResetTokenAsync(user);
        var result = await _users.ResetPasswordAsync(user, token, request.NewPassword);

        if (!result.Succeeded)
        {
            return BadRequest(new
            {
                message = "Reset password failed",
                errors = result.Errors.Select(x => new
                {
                    x.Code,
                    x.Description
                })
            });
        }

        user.UpdatedAt = DateTime.UtcNow;
        await _users.UpdateAsync(user);

        return Ok(new
        {
            message = "Password has been reset"
        });
    }
}
