using BasicLMS.DTOs.Lms;
using BasicLMS.Models;
using BasicLMS.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BasicLMS.Controllers;

[ApiController]
[Authorize]
[Route("api/courses")]
public class CoursesController : ControllerBase
{
    private readonly ICourseService _courses;

    public CoursesController(ICourseService courses)
    {
        _courses = courses;
    }

    // GET: /api/courses
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? search, [FromQuery] string? status, [FromQuery] int? categoryId)
    {
        var actor = this.CurrentActor();
        if (actor == null)
            return Unauthorized(new { message = "Unauthorized" });

        return Ok(await _courses.ListAsync(actor, search, status, categoryId));
    }

    // GET: /api/courses/{id}
    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var actor = this.CurrentActor();
        if (actor == null)
            return Unauthorized(new { message = "Unauthorized" });

        return this.ToActionResult(await _courses.GetAsync(actor, id));
    }

    // POST: /api/courses
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CourseRequest request)
    {
        var actor = this.CurrentActor();
        if (actor == null)
            return Unauthorized(new { message = "Unauthorized" });

        return this.ToActionResult(await _courses.CreateAsync(actor, request));
    }

    // PUT: /api/courses/{id}
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] CourseRequest request)
    {
        var actor = this.CurrentActor();
        if (actor == null)
            return Unauthorized(new { message = "Unauthorized" });

        return this.ToActionResult(await _courses.UpdateAsync(actor, id, request));
    }

    // PATCH: /api/courses/{id}/status
    [HttpPatch("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] CourseStatusRequest request)
    {
        var actor = this.CurrentActor();
        if (actor == null)
            return Unauthorized(new { message = "Unauthorized" });

        return this.ToActionResult(await _courses.UpdateStatusAsync(actor, id, request.Status));
    }

    // DELETE: /api/courses/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var actor = this.CurrentActor();
        if (actor == null)
            return Unauthorized(new { message = "Unauthorized" });

        return this.ToActionResult(await _courses.DeleteAsync(actor, id));
    }

    // POST: /api/courses/{courseId}/chapters
    [HttpPost("{courseId:int}/chapters")]
    public async Task<IActionResult> CreateChapter(int courseId, [FromBody] ChapterRequest request)
    {
        var actor = this.CurrentActor();
        if (actor == null)
            return Unauthorized(new { message = "Unauthorized" });

        return this.ToActionResult(await _courses.CreateChapterAsync(actor, courseId, request));
    }

    // POST: /api/courses/{courseId}/materials
    [HttpPost("{courseId:int}/materials")]
    public async Task<IActionResult> CreateMaterial(int courseId, [FromBody] MaterialRequest request)
    {
        var actor = this.CurrentActor();
        if (actor == null)
            return Unauthorized(new { message = "Unauthorized" });

        return this.ToActionResult(await _courses.CreateMaterialAsync(actor, courseId, request));
    }

    // POST: /api/courses/{courseId}/materials/upload
    [HttpPost("{courseId:int}/materials/upload")]
    [RequestSizeLimit(StoredMedia.MaxBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = StoredMedia.MaxBytes)]
    public async Task<IActionResult> UploadMaterial(int courseId, [FromForm] MaterialUploadRequest request)
    {
        var actor = this.CurrentActor();
        if (actor == null)
            return Unauthorized(new { message = "Unauthorized" });

        return this.ToActionResult(await _courses.UploadMaterialAsync(actor, courseId, request));
    }

    // POST: /api/courses/{courseId}/lecturers/{userId}
    [HttpPost("{courseId:int}/lecturers/{userId:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AssignLecturer(int courseId, int userId)
    {
        var actor = this.CurrentActor();
        if (actor == null)
            return Unauthorized(new { message = "Unauthorized" });

        return this.ToActionResult(await _courses.AssignLecturerAsync(actor, courseId, userId));
    }

    // DELETE: /api/courses/{courseId}/lecturers/{userId}
    [HttpDelete("{courseId:int}/lecturers/{userId:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UnassignLecturer(int courseId, int userId)
    {
        var actor = this.CurrentActor();
        if (actor == null)
            return Unauthorized(new { message = "Unauthorized" });

        return this.ToActionResult(await _courses.UnassignLecturerAsync(actor, courseId, userId));
    }
}

[ApiController]
[Authorize]
[Route("api/chapters")]
public class ChaptersController : ControllerBase
{
    private readonly ICourseService _courses;

    public ChaptersController(ICourseService courses)
    {
        _courses = courses;
    }

    // PUT: /api/chapters/{id}
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] ChapterRequest request)
    {
        var actor = this.CurrentActor();
        if (actor == null)
            return Unauthorized(new { message = "Unauthorized" });

        return this.ToActionResult(await _courses.UpdateChapterAsync(actor, id, request));
    }

    // DELETE: /api/chapters/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var actor = this.CurrentActor();
        if (actor == null)
            return Unauthorized(new { message = "Unauthorized" });

        return this.ToActionResult(await _courses.DeleteChapterAsync(actor, id));
    }

    // POST: /api/chapters/{chapterId}/lessons
    [HttpPost("{chapterId:int}/lessons")]
    public async Task<IActionResult> CreateLesson(int chapterId, [FromBody] LessonRequest request)
    {
        var actor = this.CurrentActor();
        if (actor == null)
            return Unauthorized(new { message = "Unauthorized" });

        return this.ToActionResult(await _courses.CreateLessonAsync(actor, chapterId, request));
    }
}

[ApiController]
[Authorize]
[Route("api/lessons")]
public class LessonsController : ControllerBase
{
    private readonly ICourseService _courses;

    public LessonsController(ICourseService courses)
    {
        _courses = courses;
    }

    // PUT: /api/lessons/{id}
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] LessonRequest request)
    {
        var actor = this.CurrentActor();
        if (actor == null)
            return Unauthorized(new { message = "Unauthorized" });

        return this.ToActionResult(await _courses.UpdateLessonAsync(actor, id, request));
    }

    // DELETE: /api/lessons/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var actor = this.CurrentActor();
        if (actor == null)
            return Unauthorized(new { message = "Unauthorized" });

        return this.ToActionResult(await _courses.DeleteLessonAsync(actor, id));
    }

    // POST: /api/lessons/{id}/video
    [HttpPost("{id:int}/video")]
    [RequestSizeLimit(StoredMedia.MaxBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = StoredMedia.MaxBytes)]
    public async Task<IActionResult> UploadVideo(int id, [FromForm] LessonVideoUploadRequest request)
    {
        var actor = this.CurrentActor();
        if (actor == null)
            return Unauthorized(new { message = "Unauthorized" });

        return this.ToActionResult(await _courses.UploadLessonVideoAsync(actor, id, request));
    }

    // GET: /api/lessons/{id}/video
    [HttpGet("{id:int}/video")]
    public async Task<IActionResult> DownloadVideo(int id)
    {
        var actor = this.CurrentActor();
        if (actor == null)
            return Unauthorized(new { message = "Unauthorized" });

        return this.ToFileResult(await _courses.OpenLessonVideoAsync(actor, id));
    }
}

[ApiController]
[Authorize]
[Route("api/materials")]
public class MaterialsController : ControllerBase
{
    private readonly ICourseService _courses;

    public MaterialsController(ICourseService courses)
    {
        _courses = courses;
    }

    // PUT: /api/materials/{id}
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] MaterialRequest request)
    {
        var actor = this.CurrentActor();
        if (actor == null)
            return Unauthorized(new { message = "Unauthorized" });

        return this.ToActionResult(await _courses.UpdateMaterialAsync(actor, id, request));
    }

    // DELETE: /api/materials/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var actor = this.CurrentActor();
        if (actor == null)
            return Unauthorized(new { message = "Unauthorized" });

        return this.ToActionResult(await _courses.DeleteMaterialAsync(actor, id));
    }

    // GET: /api/materials/{id}/file
    [HttpGet("{id:int}/file")]
    public async Task<IActionResult> Download(int id)
    {
        var actor = this.CurrentActor();
        if (actor == null)
            return Unauthorized(new { message = "Unauthorized" });

        return this.ToFileResult(await _courses.OpenMaterialFileAsync(actor, id));
    }
}
