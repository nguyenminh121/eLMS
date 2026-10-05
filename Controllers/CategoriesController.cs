using BasicLMS.DTOs.Lms;
using BasicLMS.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BasicLMS.Controllers;

[ApiController]
[Authorize]
[Route("api/categories")]
public class CategoriesController : ControllerBase
{
    private readonly ICategoryService _categories;

    public CategoriesController(ICategoryService categories)
    {
        _categories = categories;
    }

    // GET: /api/categories
    [HttpGet]
    public async Task<IActionResult> List()
    {
        return Ok(await _categories.ListAsync());
    }

    // POST: /api/categories
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CategoryRequest request)
    {
        return this.ToActionResult(await _categories.CreateAsync(request));
    }

    // PUT: /api/categories/{id}
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] CategoryRequest request)
    {
        return this.ToActionResult(await _categories.UpdateAsync(id, request));
    }

    // DELETE: /api/categories/{id}
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        return this.ToActionResult(await _categories.DeleteAsync(id));
    }
}
