using BasicLMS.DTOs.Lms;
using BasicLMS.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BasicLMS.Controllers;

[ApiController]
[Authorize]
[Route("api/classes")]
public class ClassesController : ControllerBase
{
    private readonly IClassService _classes;

    public ClassesController(IClassService classes)
    {
        _classes = classes;
    }

    // GET: /api/classes
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int? courseId, [FromQuery] string? status)
    {
        var actor = this.CurrentActor();
        if (actor == null)
            return Unauthorized(new { message = "Unauthorized" });

        return Ok(await _classes.ListAsync(actor, courseId, status));
    }

    // GET: /api/classes/{id}
    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var actor = this.CurrentActor();
        if (actor == null)
            return Unauthorized(new { message = "Unauthorized" });

        return this.ToActionResult(await _classes.GetAsync(actor, id));
    }

    // POST: /api/classes
    [HttpPost]
    [Authorize(Roles = "Admin,Lecturer")]
    public async Task<IActionResult> Create([FromBody] ClassRequest request)
    {
        var actor = this.CurrentActor();
        if (actor == null)
            return Unauthorized(new { message = "Unauthorized" });

        return this.ToActionResult(await _classes.CreateAsync(actor, request));
    }

    // PUT: /api/classes/{id}
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,Lecturer")]
    public async Task<IActionResult> Update(int id, [FromBody] ClassRequest request)
    {
        var actor = this.CurrentActor();
        if (actor == null)
            return Unauthorized(new { message = "Unauthorized" });

        return this.ToActionResult(await _classes.UpdateAsync(actor, id, request));
    }

    // DELETE: /api/classes/{id}
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin,Lecturer")]
    public async Task<IActionResult> Delete(int id)
    {
        var actor = this.CurrentActor();
        if (actor == null)
            return Unauthorized(new { message = "Unauthorized" });

        return this.ToActionResult(await _classes.DeleteAsync(actor, id));
    }

    // POST: /api/classes/{classId}/lecturers/{userId}
    [HttpPost("{classId:int}/lecturers/{userId:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AssignLecturer(int classId, int userId)
    {
        var actor = this.CurrentActor();
        if (actor == null)
            return Unauthorized(new { message = "Unauthorized" });

        return this.ToActionResult(await _classes.AssignLecturerAsync(actor, classId, userId));
    }

    // DELETE: /api/classes/{classId}/lecturers/{userId}
    [HttpDelete("{classId:int}/lecturers/{userId:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UnassignLecturer(int classId, int userId)
    {
        var actor = this.CurrentActor();
        if (actor == null)
            return Unauthorized(new { message = "Unauthorized" });

        return this.ToActionResult(await _classes.UnassignLecturerAsync(actor, classId, userId));
    }

    // POST: /api/classes/{classId}/enrollments
    [HttpPost("{classId:int}/enrollments")]
    public async Task<IActionResult> Enroll(int classId, [FromBody] EnrollRequest? request)
    {
        var actor = this.CurrentActor();
        if (actor == null)
            return Unauthorized(new { message = "Unauthorized" });

        return this.ToActionResult(await _classes.EnrollAsync(actor, classId, request?.StudentId));
    }
}

[ApiController]
[Authorize]
[Route("api/enrollments")]
public class EnrollmentsController : ControllerBase
{
    private readonly IClassService _classes;

    public EnrollmentsController(IClassService classes)
    {
        _classes = classes;
    }

    // DELETE: /api/enrollments/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Unenroll(int id)
    {
        var actor = this.CurrentActor();
        if (actor == null)
            return Unauthorized(new { message = "Unauthorized" });

        return this.ToActionResult(await _classes.UnenrollAsync(actor, id));
    }
}
