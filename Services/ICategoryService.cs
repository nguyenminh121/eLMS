using BasicLMS.DTOs.Lms;

namespace BasicLMS.Services;

public interface ICategoryService
{
    Task<IReadOnlyList<CategoryResponse>> ListAsync();
    Task<ServiceResult<CategoryResponse>> CreateAsync(CategoryRequest request);
    Task<ServiceResult<CategoryResponse>> UpdateAsync(int id, CategoryRequest request);
    Task<ServiceResult> DeleteAsync(int id);
}
