-- Full BasicLMS schema. Matches EF Core migrations:
--   20261004041602_InitialIdentity
--   20261005033134_LmsDomain
--
-- Drops and recreates the database. Local / other machines: delete is expected.
--
--   sqlcmd -S 127.0.0.1 -U sa -P "$MSSQL_SA_PASSWORD" -C -d master \
--     -v AppPassword="$MSSQL_APP_PASSWORD" -i database/BasicLMS.sql
--
-- AppPassword is optional. When set, creates login/user lms_app (read/write, no DDL).

USE master;
GO

IF DB_ID(N'BasicLMS') IS NOT NULL
BEGIN
    ALTER DATABASE BasicLMS SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE BasicLMS;
END
GO

CREATE DATABASE BasicLMS;
GO

USE BasicLMS;
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- =====================================================
-- ASP.NET Identity (int keys) + ApplicationUser
-- =====================================================

CREATE TABLE [dbo].[AspNetRoles] (
    [Id] int NOT NULL IDENTITY,
    [Name] nvarchar(256) NULL,
    [NormalizedName] nvarchar(256) NULL,
    [ConcurrencyStamp] nvarchar(max) NULL,
    CONSTRAINT [PK_AspNetRoles] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [dbo].[AspNetUsers] (
    [Id] int NOT NULL IDENTITY,
    [FullName] nvarchar(max) NOT NULL,
    [DateOfBirth] datetime2 NULL,
    [AvatarUrl] nvarchar(max) NULL,
    [IsActive] bit NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NOT NULL,
    [UserName] nvarchar(256) NULL,
    [NormalizedUserName] nvarchar(256) NULL,
    [Email] nvarchar(256) NULL,
    [NormalizedEmail] nvarchar(256) NULL,
    [EmailConfirmed] bit NOT NULL,
    [PasswordHash] nvarchar(max) NULL,
    [SecurityStamp] nvarchar(max) NULL,
    [ConcurrencyStamp] nvarchar(max) NULL,
    [PhoneNumber] nvarchar(max) NULL,
    [PhoneNumberConfirmed] bit NOT NULL,
    [TwoFactorEnabled] bit NOT NULL,
    [LockoutEnd] datetimeoffset NULL,
    [LockoutEnabled] bit NOT NULL,
    [AccessFailedCount] int NOT NULL,
    CONSTRAINT [PK_AspNetUsers] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [dbo].[AspNetRoleClaims] (
    [Id] int NOT NULL IDENTITY,
    [RoleId] int NOT NULL,
    [ClaimType] nvarchar(max) NULL,
    [ClaimValue] nvarchar(max) NULL,
    CONSTRAINT [PK_AspNetRoleClaims] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_AspNetRoleClaims_AspNetRoles_RoleId] FOREIGN KEY ([RoleId])
        REFERENCES [dbo].[AspNetRoles] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [dbo].[AspNetUserClaims] (
    [Id] int NOT NULL IDENTITY,
    [UserId] int NOT NULL,
    [ClaimType] nvarchar(max) NULL,
    [ClaimValue] nvarchar(max) NULL,
    CONSTRAINT [PK_AspNetUserClaims] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_AspNetUserClaims_AspNetUsers_UserId] FOREIGN KEY ([UserId])
        REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [dbo].[AspNetUserLogins] (
    [LoginProvider] nvarchar(450) NOT NULL,
    [ProviderKey] nvarchar(450) NOT NULL,
    [ProviderDisplayName] nvarchar(max) NULL,
    [UserId] int NOT NULL,
    CONSTRAINT [PK_AspNetUserLogins] PRIMARY KEY ([LoginProvider], [ProviderKey]),
    CONSTRAINT [FK_AspNetUserLogins_AspNetUsers_UserId] FOREIGN KEY ([UserId])
        REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [dbo].[AspNetUserRoles] (
    [UserId] int NOT NULL,
    [RoleId] int NOT NULL,
    CONSTRAINT [PK_AspNetUserRoles] PRIMARY KEY ([UserId], [RoleId]),
    CONSTRAINT [FK_AspNetUserRoles_AspNetRoles_RoleId] FOREIGN KEY ([RoleId])
        REFERENCES [dbo].[AspNetRoles] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_AspNetUserRoles_AspNetUsers_UserId] FOREIGN KEY ([UserId])
        REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [dbo].[AspNetUserTokens] (
    [UserId] int NOT NULL,
    [LoginProvider] nvarchar(450) NOT NULL,
    [Name] nvarchar(450) NOT NULL,
    [Value] nvarchar(max) NULL,
    CONSTRAINT [PK_AspNetUserTokens] PRIMARY KEY ([UserId], [LoginProvider], [Name]),
    CONSTRAINT [FK_AspNetUserTokens_AspNetUsers_UserId] FOREIGN KEY ([UserId])
        REFERENCES [dbo].[AspNetUsers] ([Id]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_AspNetRoleClaims_RoleId] ON [dbo].[AspNetRoleClaims] ([RoleId]);
CREATE UNIQUE INDEX [RoleNameIndex] ON [dbo].[AspNetRoles] ([NormalizedName]) WHERE [NormalizedName] IS NOT NULL;
CREATE INDEX [IX_AspNetUserClaims_UserId] ON [dbo].[AspNetUserClaims] ([UserId]);
CREATE INDEX [IX_AspNetUserLogins_UserId] ON [dbo].[AspNetUserLogins] ([UserId]);
CREATE INDEX [IX_AspNetUserRoles_RoleId] ON [dbo].[AspNetUserRoles] ([RoleId]);
CREATE INDEX [EmailIndex] ON [dbo].[AspNetUsers] ([NormalizedEmail]);
CREATE UNIQUE INDEX [UserNameIndex] ON [dbo].[AspNetUsers] ([NormalizedUserName]) WHERE [NormalizedUserName] IS NOT NULL;
GO

-- =====================================================
-- LMS domain
-- =====================================================

CREATE TABLE [dbo].[Categories] (
    [Id] int NOT NULL IDENTITY,
    [Name] nvarchar(150) NOT NULL,
    [Description] nvarchar(500) NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_Categories] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [dbo].[Courses] (
    [Id] int NOT NULL IDENTITY,
    [CategoryId] int NULL,
    [Title] nvarchar(200) NOT NULL,
    [Description] nvarchar(max) NULL,
    [ThumbnailUrl] nvarchar(500) NULL,
    [Level] nvarchar(30) NOT NULL,
    [Status] nvarchar(30) NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_Courses] PRIMARY KEY ([Id]),
    CONSTRAINT [CK_Courses_Level] CHECK ([Level] IN (N'Beginner', N'Intermediate', N'Advanced')),
    CONSTRAINT [CK_Courses_Status] CHECK ([Status] IN (N'Draft', N'Published', N'Archived')),
    CONSTRAINT [FK_Courses_Categories_CategoryId] FOREIGN KEY ([CategoryId])
        REFERENCES [dbo].[Categories] ([Id]) ON DELETE SET NULL
);
GO

CREATE TABLE [dbo].[Chapters] (
    [Id] int NOT NULL IDENTITY,
    [CourseId] int NOT NULL,
    [Title] nvarchar(200) NOT NULL,
    [SortOrder] int NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_Chapters] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Chapters_Courses_CourseId] FOREIGN KEY ([CourseId])
        REFERENCES [dbo].[Courses] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [dbo].[Lessons] (
    [Id] int NOT NULL IDENTITY,
    [ChapterId] int NOT NULL,
    [Title] nvarchar(200) NOT NULL,
    [Content] nvarchar(max) NULL,
    [VideoUrl] nvarchar(500) NULL,
    [DurationSeconds] int NULL,
    [SortOrder] int NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_Lessons] PRIMARY KEY ([Id]),
    CONSTRAINT [CK_Lessons_Duration] CHECK ([DurationSeconds] IS NULL OR [DurationSeconds] >= 0),
    CONSTRAINT [FK_Lessons_Chapters_ChapterId] FOREIGN KEY ([ChapterId])
        REFERENCES [dbo].[Chapters] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [dbo].[CourseLecturers] (
    [CourseId] int NOT NULL,
    [LecturerId] int NOT NULL,
    CONSTRAINT [PK_CourseLecturers] PRIMARY KEY ([CourseId], [LecturerId]),
    CONSTRAINT [FK_CourseLecturers_Courses_CourseId] FOREIGN KEY ([CourseId])
        REFERENCES [dbo].[Courses] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_CourseLecturers_AspNetUsers_LecturerId] FOREIGN KEY ([LecturerId])
        REFERENCES [dbo].[AspNetUsers] ([Id])
);
GO

CREATE TABLE [dbo].[CourseMaterials] (
    [Id] int NOT NULL IDENTITY,
    [CourseId] int NOT NULL,
    [LessonId] int NULL,
    [Title] nvarchar(200) NOT NULL,
    [Url] nvarchar(1000) NOT NULL,
    [Type] nvarchar(30) NOT NULL,
    [SortOrder] int NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_CourseMaterials] PRIMARY KEY ([Id]),
    CONSTRAINT [CK_CourseMaterials_Type] CHECK ([Type] IN (N'Link', N'File', N'Video')),
    CONSTRAINT [FK_CourseMaterials_Courses_CourseId] FOREIGN KEY ([CourseId])
        REFERENCES [dbo].[Courses] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_CourseMaterials_Lessons_LessonId] FOREIGN KEY ([LessonId])
        REFERENCES [dbo].[Lessons] ([Id])
);
GO

CREATE TABLE [dbo].[Classes] (
    [Id] int NOT NULL IDENTITY,
    [CourseId] int NOT NULL,
    [Name] nvarchar(200) NOT NULL,
    [StartDate] datetime2 NULL,
    [EndDate] datetime2 NULL,
    [Status] nvarchar(30) NOT NULL,
    [Capacity] int NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_Classes] PRIMARY KEY ([Id]),
    CONSTRAINT [CK_Classes_Capacity] CHECK ([Capacity] IS NULL OR [Capacity] > 0),
    CONSTRAINT [CK_Classes_Status] CHECK ([Status] IN (N'Draft', N'Open', N'Closed', N'Archived')),
    CONSTRAINT [FK_Classes_Courses_CourseId] FOREIGN KEY ([CourseId])
        REFERENCES [dbo].[Courses] ([Id])
);
GO

CREATE TABLE [dbo].[ClassLecturers] (
    [ClassId] int NOT NULL,
    [LecturerId] int NOT NULL,
    CONSTRAINT [PK_ClassLecturers] PRIMARY KEY ([ClassId], [LecturerId]),
    CONSTRAINT [FK_ClassLecturers_Classes_ClassId] FOREIGN KEY ([ClassId])
        REFERENCES [dbo].[Classes] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_ClassLecturers_AspNetUsers_LecturerId] FOREIGN KEY ([LecturerId])
        REFERENCES [dbo].[AspNetUsers] ([Id])
);
GO

CREATE TABLE [dbo].[ClassEnrollments] (
    [Id] int NOT NULL IDENTITY,
    [ClassId] int NOT NULL,
    [StudentId] int NOT NULL,
    [EnrolledAt] datetime2 NOT NULL,
    [CompletedAt] datetime2 NULL,
    [Status] nvarchar(30) NOT NULL,
    CONSTRAINT [PK_ClassEnrollments] PRIMARY KEY ([Id]),
    CONSTRAINT [CK_ClassEnrollments_Status] CHECK ([Status] IN (N'Active', N'Completed', N'Cancelled')),
    CONSTRAINT [FK_ClassEnrollments_Classes_ClassId] FOREIGN KEY ([ClassId])
        REFERENCES [dbo].[Classes] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_ClassEnrollments_AspNetUsers_StudentId] FOREIGN KEY ([StudentId])
        REFERENCES [dbo].[AspNetUsers] ([Id])
);
GO

CREATE UNIQUE INDEX [IX_Categories_Name] ON [dbo].[Categories] ([Name]);
CREATE INDEX [IX_Chapters_CourseId] ON [dbo].[Chapters] ([CourseId]);
CREATE INDEX [IX_Courses_CategoryId] ON [dbo].[Courses] ([CategoryId]);
CREATE INDEX [IX_CourseLecturers_LecturerId] ON [dbo].[CourseLecturers] ([LecturerId]);
CREATE INDEX [IX_CourseMaterials_CourseId] ON [dbo].[CourseMaterials] ([CourseId]);
CREATE INDEX [IX_CourseMaterials_LessonId] ON [dbo].[CourseMaterials] ([LessonId]);
CREATE INDEX [IX_Lessons_ChapterId] ON [dbo].[Lessons] ([ChapterId]);
CREATE INDEX [IX_Classes_CourseId] ON [dbo].[Classes] ([CourseId]);
CREATE INDEX [IX_Classes_Status] ON [dbo].[Classes] ([Status]);
CREATE INDEX [IX_ClassLecturers_LecturerId] ON [dbo].[ClassLecturers] ([LecturerId]);
CREATE INDEX [IX_ClassEnrollments_ClassId] ON [dbo].[ClassEnrollments] ([ClassId]);
CREATE INDEX [IX_ClassEnrollments_StudentId] ON [dbo].[ClassEnrollments] ([StudentId]);
CREATE UNIQUE INDEX [IX_ClassEnrollments_StudentId_ClassId] ON [dbo].[ClassEnrollments] ([StudentId], [ClassId]);
GO

CREATE TABLE [dbo].[__EFMigrationsHistory] (
    [MigrationId] nvarchar(150) NOT NULL,
    [ProductVersion] nvarchar(32) NOT NULL,
    CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
);
GO

INSERT INTO [dbo].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES
    (N'20261004041602_InitialIdentity', N'10.0.12'),
    (N'20261005033134_LmsDomain', N'10.0.12');
GO

-- =====================================================
-- Optional app login (sqlcmd -v AppPassword=...)
-- =====================================================

USE master;
GO

IF N'$(AppPassword)' <> N'' AND N'$(AppPassword)' <> N'$' + N'(AppPassword)'
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.sql_logins WHERE name = N'lms_app')
        CREATE LOGIN [lms_app] WITH PASSWORD = '$(AppPassword)';
END
GO

USE BasicLMS;
GO

IF EXISTS (SELECT 1 FROM sys.sql_logins WHERE name = N'lms_app')
   AND NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'lms_app')
    CREATE USER [lms_app] FOR LOGIN [lms_app];
GO

IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'lms_app')
BEGIN
    ALTER ROLE db_datareader ADD MEMBER [lms_app];
    ALTER ROLE db_datawriter ADD MEMBER [lms_app];
END
GO
