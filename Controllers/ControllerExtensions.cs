using System.Security.Claims;
using BasicLMS.DTOs.Lms;
using BasicLMS.Services;
using Microsoft.AspNetCore.Mvc;

namespace BasicLMS.Controllers;

internal static class ControllerExtensions
{
    public static Actor? CurrentActor(this ControllerBase controller)
    {
        var idValue = controller.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(idValue, out var userId))
            return null;

        var roles = controller.User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
        return new Actor(userId, roles);
    }

    public static IActionResult ToActionResult(this ControllerBase controller, ServiceResult result)
    {
        if (result.Succeeded)
            return controller.Ok(new { message = "Success" });

        return controller.StatusCode(result.StatusCode, new { message = result.Message });
    }

    public static IActionResult ToActionResult<T>(this ControllerBase controller, ServiceResult<T> result)
    {
        if (!result.Succeeded)
            return controller.StatusCode(result.StatusCode, new { message = result.Message });

        if (result.StatusCode == StatusCodes.Status201Created)
            return controller.StatusCode(StatusCodes.Status201Created, result.Value);

        return controller.Ok(result.Value);
    }

    public static IActionResult ToFileResult(this ControllerBase controller, ServiceResult<StoredFileResponse> result)
    {
        if (!result.Succeeded)
            return controller.StatusCode(result.StatusCode, new { message = result.Message });

        var file = result.Value!;
        if (file.Inline)
            return controller.File(file.Stream, file.ContentType, enableRangeProcessing: true);

        return controller.File(file.Stream, file.ContentType, file.FileName, enableRangeProcessing: true);
    }
}
