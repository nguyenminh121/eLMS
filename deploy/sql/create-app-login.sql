-- Creates (or re-passwords) the least-privilege login the API connects with.
-- Idempotent. Run as sa after the migrate service has created the database:
--   docker compose --env-file .env -f deploy/docker-compose.yml --profile tools run --rm db-login
-- sqlcmd reads the scripting variables AppPassword and DatabaseName from the environment.
-- AppPassword must not contain a single quote.

SET NOCOUNT ON;

IF DB_ID(N'$(DatabaseName)') IS NULL
    RAISERROR(N'Database $(DatabaseName) does not exist. Run the migrate service first.', 16, 1);
GO

IF NOT EXISTS (SELECT 1 FROM sys.sql_logins WHERE name = N'lms_app')
    CREATE LOGIN [lms_app] WITH PASSWORD = N'$(AppPassword)', CHECK_POLICY = ON;
ELSE
    ALTER LOGIN [lms_app] WITH PASSWORD = N'$(AppPassword)';
GO

USE [$(DatabaseName)];
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'lms_app')
    CREATE USER [lms_app] FOR LOGIN [lms_app];
ELSE
    ALTER USER [lms_app] WITH LOGIN = [lms_app];

ALTER ROLE db_datareader ADD MEMBER [lms_app];
ALTER ROLE db_datawriter ADD MEMBER [lms_app];
GO

PRINT N'Login lms_app is ready on $(DatabaseName).';
GO
