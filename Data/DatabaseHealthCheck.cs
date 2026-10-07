using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace BasicLMS.Data;

public class DatabaseHealthCheck : IHealthCheck
{
    private readonly ApplicationDbContext _db;

    public DatabaseHealthCheck(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        return await _db.Database.CanConnectAsync(cancellationToken)
            ? HealthCheckResult.Healthy()
            : HealthCheckResult.Unhealthy("Database is unreachable.");
    }
}
