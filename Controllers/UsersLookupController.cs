using BasicLMS.Data;
using BasicLMS.DTOs.Lms;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BasicLMS.Controllers;

[ApiController]
[Authorize(Roles = "Admin,Lecturer")]
[Route("api/users")]
public class UsersLookupController : ControllerBase
{
    private const int MaxResults = 50;

    private readonly ApplicationDbContext _db;

    public UsersLookupController(ApplicationDbContext db)
    {
        _db = db;
    }

    // GET: /api/users?role=Student&search=
    [HttpGet]
    public async Task<IActionResult> Lookup([FromQuery] string? role, [FromQuery] string? search)
    {
        var query =
            from u in _db.Users.AsNoTracking()
            join ur in _db.UserRoles on u.Id equals ur.UserId
            join r in _db.Roles on ur.RoleId equals r.Id
            where u.IsActive
            select new { u.Id, u.FullName, u.Email, Role = r.Name };

        if (!string.IsNullOrWhiteSpace(role))
            query = query.Where(x => x.Role == role.Trim());

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToUpperInvariant();
            query = query.Where(x =>
                x.Email!.ToUpper().Contains(term) ||
                x.FullName.ToUpper().Contains(term));
        }

        var users = await query
            .OrderBy(x => x.Email)
            .Take(MaxResults)
            .Select(x => new UserSummary(x.Id, x.FullName, x.Email ?? ""))
            .ToListAsync();

        return Ok(users);
    }
}
