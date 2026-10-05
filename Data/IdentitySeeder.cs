using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using BasicLMS.Models;

namespace BasicLMS.Data;

public static class IdentitySeeder
{
    public const string AdminEmail = "admin@basiclms.local";
    public const string AdminPassword = "Admin@123456";

    public static async Task SeedAsync(IServiceProvider services)
    {
        var roleManager =
            services.GetRequiredService<RoleManager<IdentityRole<int>>>();

        var userManager =
            services.GetRequiredService<UserManager<ApplicationUser>>();

        var config = services.GetRequiredService<IConfiguration>();
        var adminEmail = config["Seed:AdminEmail"];
        var adminPassword = config["Seed:AdminPassword"];

        if (string.IsNullOrWhiteSpace(adminEmail))
        {
            adminEmail = AdminEmail;
        }

        if (string.IsNullOrWhiteSpace(adminPassword))
        {
            var environment = services.GetRequiredService<IHostEnvironment>();
            if (environment.IsProduction())
            {
                throw new InvalidOperationException(
                    "Seed:AdminPassword is required when ASPNETCORE_ENVIRONMENT is Production.");
            }

            adminPassword = AdminPassword;
        }

        string[] roles =
        {
            "Admin",
            "Lecturer",
            "Student"
        };

        foreach (var role in roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(
                    new IdentityRole<int>
                    {
                        Name = role
                    });
            }
        }

        var admin = await userManager.FindByEmailAsync(adminEmail);

        if (admin == null)
        {
            admin = new ApplicationUser
            {
                UserName = adminEmail,
                Email = adminEmail,
                EmailConfirmed = true,
                FullName = "System Administrator",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var result = await userManager.CreateAsync(admin, adminPassword);

            if (!result.Succeeded)
            {
                throw new InvalidOperationException(
                    "Seed:AdminPassword does not meet the Identity policy " +
                    "(at least 6 characters, one uppercase, one lowercase, one digit, " +
                    "and one special character). " +
                    string.Join(" ", result.Errors.Select(x => x.Description)));
            }
        }
        else
        {
            var changed = false;

            if (!admin.IsActive)
            {
                admin.IsActive = true;
                changed = true;
            }

            if (!admin.EmailConfirmed)
            {
                admin.EmailConfirmed = true;
                changed = true;
            }

            if (changed)
            {
                admin.UpdatedAt = DateTime.UtcNow;
                await userManager.UpdateAsync(admin);
            }
        }

        if (!await userManager.IsInRoleAsync(admin, "Admin"))
        {
            var roleResult = await userManager.AddToRoleAsync(admin, "Admin");

            if (!roleResult.Succeeded)
            {
                throw new InvalidOperationException(
                    string.Join(", ", roleResult.Errors.Select(x => x.Description)));
            }
        }

        await SeedCourseCategoriesAsync(services);
    }

    private static async Task SeedCourseCategoriesAsync(IServiceProvider services)
    {
        var db = services.GetRequiredService<ApplicationDbContext>();
        (string Name, string Description)[] defaults =
        [
            ("Programming", "Software development and IT"),
            ("Design", "UI, UX and visual design"),
            ("Business", "Management, marketing and operations"),
            ("Language", "Foreign languages"),
            ("Soft skills", "Communication and workplace skills")
        ];

        var existing = await db.Categories.Select(c => c.Name).ToListAsync();
        var now = DateTime.UtcNow;
        foreach (var (name, description) in defaults)
        {
            if (existing.Contains(name))
                continue;

            db.Categories.Add(new Category
            {
                Name = name,
                Description = description,
                CreatedAt = now
            });
        }

        if (db.ChangeTracker.HasChanges())
            await db.SaveChangesAsync();
    }
}
