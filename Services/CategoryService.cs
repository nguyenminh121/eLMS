using BasicLMS.Data;
using BasicLMS.DTOs.Lms;
using BasicLMS.Models;
using Microsoft.EntityFrameworkCore;

namespace BasicLMS.Services;

public class CategoryService : ICategoryService
{
    private readonly ApplicationDbContext _db;

    public CategoryService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<CategoryResponse>> ListAsync()
    {
        return await _db.Categories
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .Select(c => new CategoryResponse(c.Id, c.Name, c.Description, c.CreatedAt, c.Courses.Count))
            .ToListAsync();
    }

    public async Task<ServiceResult<CategoryResponse>> CreateAsync(CategoryRequest request)
    {
        var name = request.Name?.Trim();
        if (string.IsNullOrWhiteSpace(name))
            return ServiceResult<CategoryResponse>.Fail(StatusCodes.Status400BadRequest, "Category name is required");

        if (await _db.Categories.AnyAsync(c => c.Name == name))
            return ServiceResult<CategoryResponse>.Fail(StatusCodes.Status409Conflict, "Category name already exists");

        var category = new Category
        {
            Name = name,
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _db.Categories.Add(category);
        await _db.SaveChangesAsync();

        return ServiceResult<CategoryResponse>.Created(
            new CategoryResponse(category.Id, category.Name, category.Description, category.CreatedAt, 0));
    }

    public async Task<ServiceResult<CategoryResponse>> UpdateAsync(int id, CategoryRequest request)
    {
        var category = await _db.Categories.FindAsync(id);
        if (category == null)
            return ServiceResult<CategoryResponse>.Fail(StatusCodes.Status404NotFound, "Category not found");

        var name = request.Name?.Trim();
        if (string.IsNullOrWhiteSpace(name))
            return ServiceResult<CategoryResponse>.Fail(StatusCodes.Status400BadRequest, "Category name is required");

        if (await _db.Categories.AnyAsync(c => c.Name == name && c.Id != id))
            return ServiceResult<CategoryResponse>.Fail(StatusCodes.Status409Conflict, "Category name already exists");

        category.Name = name;
        category.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        await _db.SaveChangesAsync();

        return ServiceResult<CategoryResponse>.Ok(
            new CategoryResponse(category.Id, category.Name, category.Description, category.CreatedAt,
                await _db.Courses.CountAsync(c => c.CategoryId == category.Id)));
    }

    public async Task<ServiceResult> DeleteAsync(int id)
    {
        var category = await _db.Categories.FindAsync(id);
        if (category == null)
            return ServiceResult.Fail(StatusCodes.Status404NotFound, "Category not found");

        if (await _db.Courses.AnyAsync(c => c.CategoryId == id))
            return ServiceResult.Fail(StatusCodes.Status409Conflict, "Category is in use by one or more courses");

        _db.Categories.Remove(category);
        await _db.SaveChangesAsync();
        return ServiceResult.Ok();
    }
}
