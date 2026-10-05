# Database

SQL Server 2022. Schema lives in **one file**: `BasicLMS.sql`.
It drops and recreates `BasicLMS`, then creates Identity + LMS tables and records
both EF migrations in `__EFMigrationsHistory`.

Equivalent: `dotnet ef database update` against an empty database.

Secrets stay in the repo-root `.env` (from `.env.example`). This script has no passwords.

## Local SQL Server

```bash
docker compose --env-file .env -f database/docker-compose.yml up -d
```

Publishes `1433` for local `dotnet run`.

## Apply

```bash
sqlcmd -S 127.0.0.1 -U sa -P "$MSSQL_SA_PASSWORD" -C -d master \
  -v AppPassword="$MSSQL_APP_PASSWORD" -i database/BasicLMS.sql
```

`-v AppPassword=...` creates login `lms_app` (`db_datareader` + `db_datawriter`).
Omit it if you only want the schema.

Or, with the .NET SDK, on an empty server:

```bash
dotnet ef database update --connection "Server=127.0.0.1,1433;Database=BasicLMS;User Id=sa;Password=$MSSQL_SA_PASSWORD;TrustServerCertificate=True"
```

When the EF model changes: `dotnet ef migrations add <Name>`, then **rewrite** `BasicLMS.sql`
to match the new full schema (and insert the new row in `__EFMigrationsHistory`).
Other machines drop the database and run this file again.
