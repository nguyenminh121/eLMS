using BasicLMS.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace BasicLMS.Tests.Infrastructure;

public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    public const string JwtKey = "BasicLMS-Integration-Test-Signing-Key-2026!";
    public const string JwtIssuer = "BasicLMS";
    public const string JwtAudience = "BasicLMS.Client";

    public const string AdminEmail = "admin@basiclms.local";
    public const string AdminPassword = "Admin@123456";

    private readonly SqliteConnection _connection;
    private readonly string _storageRoot;

    public CustomWebApplicationFactory()
    {
        _storageRoot = Path.Combine(Path.GetTempPath(), "basiclms-tests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_storageRoot);

        // The in-memory database lives as long as this connection stays open.
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        // Schema must exist before Program.cs runs IdentitySeeder right after app.Build().
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(_connection)
            .Options;

        using var db = new ApplicationDbContext(options);
        db.Database.EnsureCreated();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("Jwt:Key", JwtKey);
        builder.UseSetting("Jwt:Issuer", JwtIssuer);
        builder.UseSetting("Jwt:Audience", JwtAudience);
        builder.UseSetting("Storage:Root", _storageRoot);

        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<DbContextOptions<ApplicationDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<ApplicationDbContext>>();

            services.AddDbContext<ApplicationDbContext>(options =>
                options.UseSqlite(_connection));
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);

        if (disposing)
        {
            _connection.Dispose();
            try
            {
                if (Directory.Exists(_storageRoot))
                    Directory.Delete(_storageRoot, recursive: true);
            }
            catch (IOException)
            {
            }
        }
    }
}
