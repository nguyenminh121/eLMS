using Microsoft.AspNetCore.Identity;
using BasicLMS.Models;

namespace BasicLMS.Data;

public static class IdentitySeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        var roleManager =
            services.GetRequiredService<RoleManager<IdentityRole<int>>>();

        var userManager =
            services.GetRequiredService<UserManager<ApplicationUser>>();

        // =========================
        // Roles
        // =========================

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

        // =========================
        // Admin
        // =========================

        const string adminEmail = "admin@basiclms.local";
        const string adminPassword = "Admin@123456";

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

            var result = await userManager.CreateAsync(
                admin,
                adminPassword
            );

            if (!result.Succeeded)
            {
                throw new Exception(
                    string.Join(
                        ", ",
                        result.Errors.Select(x => x.Description)
                    )
                );
            }

            await userManager.AddToRoleAsync(admin, "Admin");
        }
    }
}