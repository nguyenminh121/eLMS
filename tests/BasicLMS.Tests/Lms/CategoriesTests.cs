using System.Net;
using System.Net.Http.Json;
using BasicLMS.Tests.Infrastructure;

namespace BasicLMS.Tests.Lms;

public class CategoriesTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public CategoriesTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task List_WithoutToken_Returns401()
    {
        var response = await _factory.CreateClient().GetAsync("/api/categories");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Create_AsStudent_Returns403()
    {
        var email = TestHelpers.UniqueEmail("cat-student");
        await _factory.CreateUserAsync(email);
        var client = await _factory.CreateClientAsAsync(email, TestHelpers.ValidPassword);

        var response = await client.PostAsJsonAsync("/api/categories", new { name = "Blocked" });
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Create_MissingName_Returns400()
    {
        var client = await _factory.CreateClientAsAsync(
            CustomWebApplicationFactory.AdminEmail, CustomWebApplicationFactory.AdminPassword);

        var response = await client.PostAsJsonAsync("/api/categories", new { name = "  " });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_ThenDuplicate_Returns409()
    {
        var client = await _factory.CreateClientAsAsync(
            CustomWebApplicationFactory.AdminEmail, CustomWebApplicationFactory.AdminPassword);

        var name = $"Programming-{Guid.NewGuid():N}"[..18];

        var created = await client.PostAsJsonAsync("/api/categories", new { name, description = "Desc" });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);

        var body = await created.Content.ReadFromJsonAsync<CategoryResult>();
        Assert.NotNull(body);
        Assert.Equal(name, body.Name);

        var duplicate = await client.PostAsJsonAsync("/api/categories", new { name });
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);
    }

    [Fact]
    public async Task Update_Unknown_Returns404()
    {
        var client = await _factory.CreateClientAsAsync(
            CustomWebApplicationFactory.AdminEmail, CustomWebApplicationFactory.AdminPassword);

        var response = await client.PutAsJsonAsync("/api/categories/999999", new { name = "Nope" });
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Delete_InUse_Returns409()
    {
        var category = await _factory.CreateCategoryAsync();
        await _factory.CreateCourseAsync("Uses category", categoryId: category.Id);

        var client = await _factory.CreateClientAsAsync(
            CustomWebApplicationFactory.AdminEmail, CustomWebApplicationFactory.AdminPassword);

        var response = await client.DeleteAsync($"/api/categories/{category.Id}");
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Delete_Unused_Returns200()
    {
        var category = await _factory.CreateCategoryAsync();
        var client = await _factory.CreateClientAsAsync(
            CustomWebApplicationFactory.AdminEmail, CustomWebApplicationFactory.AdminPassword);

        var response = await client.DeleteAsync($"/api/categories/{category.Id}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var list = await client.GetFromJsonAsync<List<CategoryResult>>("/api/categories");
        Assert.DoesNotContain(list!, c => c.Id == category.Id);
    }

    [Fact]
    public async Task List_IncludesSeededCourseCategories()
    {
        var client = await _factory.CreateClientAsAsync(
            CustomWebApplicationFactory.AdminEmail, CustomWebApplicationFactory.AdminPassword);

        var list = await client.GetFromJsonAsync<List<CategoryResult>>("/api/categories");
        Assert.Contains(list!, c => c.Name == "Programming");
    }
}
