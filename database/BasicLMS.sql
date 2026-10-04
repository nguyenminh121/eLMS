USE master;
GO

-- Xóa database cũ
IF DB_ID(N'BasicLMS') IS NOT NULL
BEGIN
    ALTER DATABASE BasicLMS
    SET SINGLE_USER WITH ROLLBACK IMMEDIATE;

    DROP DATABASE BasicLMS;
END
GO

-- Tạo database mới
CREATE DATABASE BasicLMS;
GO

USE BasicLMS;
GO


-- =====================================================
-- 1. ROLES
-- =====================================================
CREATE TABLE Roles
(
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(50) NOT NULL UNIQUE
);
GO


-- =====================================================
-- 2. USERS
-- =====================================================
CREATE TABLE Users
(
    Id INT IDENTITY(1,1) PRIMARY KEY,
    RoleId INT NOT NULL,
    Email NVARCHAR(255) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    FullName NVARCHAR(150) NOT NULL,
    Phone NVARCHAR(20) NULL,
    DateOfBirth DATE NULL,
    AvatarUrl NVARCHAR(500) NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_Users_Roles
        FOREIGN KEY (RoleId)
        REFERENCES Roles(Id)
);
GO


-- =====================================================
-- 3. CATEGORIES
-- =====================================================
CREATE TABLE Categories
(
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(150) NOT NULL UNIQUE,
    Description NVARCHAR(500) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO


-- =====================================================
-- 4. COURSES
-- =====================================================
CREATE TABLE Courses
(
    Id INT IDENTITY(1,1) PRIMARY KEY,
    CategoryId INT NULL,
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    ThumbnailUrl NVARCHAR(500) NULL,
    Level NVARCHAR(30) NOT NULL DEFAULT N'Beginner',
    Status NVARCHAR(30) NOT NULL DEFAULT N'Draft',
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_Courses_Categories
        FOREIGN KEY (CategoryId)
        REFERENCES Categories(Id),

    CONSTRAINT CK_Courses_Level
        CHECK (Level IN
        (
            N'Beginner',
            N'Intermediate',
            N'Advanced'
        )),

    CONSTRAINT CK_Courses_Status
        CHECK (Status IN
        (
            N'Draft',
            N'Published',
            N'Archived'
        ))
);
GO


-- =====================================================
-- 5. COURSE LECTURERS
-- Một course có thể có nhiều lecturer
-- =====================================================
CREATE TABLE CourseLecturers
(
    CourseId INT NOT NULL,
    LecturerId INT NOT NULL,

    PRIMARY KEY (CourseId, LecturerId),

    CONSTRAINT FK_CourseLecturers_Courses
        FOREIGN KEY (CourseId)
        REFERENCES Courses(Id)
        ON DELETE CASCADE,

    CONSTRAINT FK_CourseLecturers_Users
        FOREIGN KEY (LecturerId)
        REFERENCES Users(Id)
);
GO


-- =====================================================
-- 6. LESSONS
-- =====================================================
CREATE TABLE Lessons
(
    Id INT IDENTITY(1,1) PRIMARY KEY,
    CourseId INT NOT NULL,
    Title NVARCHAR(200) NOT NULL,
    Content NVARCHAR(MAX) NULL,
    VideoUrl NVARCHAR(500) NULL,
    DurationSeconds INT NULL,
    SortOrder INT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_Lessons_Courses
        FOREIGN KEY (CourseId)
        REFERENCES Courses(Id)
        ON DELETE CASCADE,

    CONSTRAINT CK_Lessons_Duration
        CHECK (DurationSeconds IS NULL OR DurationSeconds >= 0)
);
GO


-- =====================================================
-- 7. ENROLLMENTS
-- Student đăng ký Course
-- =====================================================
CREATE TABLE Enrollments
(
    Id INT IDENTITY(1,1) PRIMARY KEY,
    StudentId INT NOT NULL,
    CourseId INT NOT NULL,
    EnrolledAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CompletedAt DATETIME2 NULL,
    Status NVARCHAR(30) NOT NULL DEFAULT N'Active',

    CONSTRAINT UQ_Enrollments
        UNIQUE (StudentId, CourseId),

    CONSTRAINT FK_Enrollments_Students
        FOREIGN KEY (StudentId)
        REFERENCES Users(Id),

    CONSTRAINT FK_Enrollments_Courses
        FOREIGN KEY (CourseId)
        REFERENCES Courses(Id),

    CONSTRAINT CK_Enrollments_Status
        CHECK (Status IN
        (
            N'Active',
            N'Completed',
            N'Cancelled'
        ))
);
GO


-- =====================================================
-- 8. LESSON PROGRESS
-- Theo dõi tiến độ học của Student
-- =====================================================
CREATE TABLE LessonProgress
(
    Id INT IDENTITY(1,1) PRIMARY KEY,
    StudentId INT NOT NULL,
    LessonId INT NOT NULL,
    ProgressPercent DECIMAL(5,2) NOT NULL DEFAULT 0,
    IsCompleted BIT NOT NULL DEFAULT 0,
    LastPositionSeconds INT NOT NULL DEFAULT 0,
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT UQ_LessonProgress
        UNIQUE (StudentId, LessonId),

    CONSTRAINT FK_LessonProgress_Students
        FOREIGN KEY (StudentId)
        REFERENCES Users(Id),

    CONSTRAINT FK_LessonProgress_Lessons
        FOREIGN KEY (LessonId)
        REFERENCES Lessons(Id)
        ON DELETE CASCADE,

    CONSTRAINT CK_LessonProgress_Percent
        CHECK (ProgressPercent >= 0 AND ProgressPercent <= 100),

    CONSTRAINT CK_LessonProgress_Position
        CHECK (LastPositionSeconds >= 0)
);
GO


-- =====================================================
-- INDEX
-- =====================================================
CREATE INDEX IX_Users_RoleId
ON Users(RoleId);

CREATE INDEX IX_Courses_CategoryId
ON Courses(CategoryId);

CREATE INDEX IX_CourseLecturers_LecturerId
ON CourseLecturers(LecturerId);

CREATE INDEX IX_Lessons_CourseId
ON Lessons(CourseId);

CREATE INDEX IX_Enrollments_StudentId
ON Enrollments(StudentId);

CREATE INDEX IX_Enrollments_CourseId
ON Enrollments(CourseId);

CREATE INDEX IX_LessonProgress_StudentId
ON LessonProgress(StudentId);

CREATE INDEX IX_LessonProgress_LessonId
ON LessonProgress(LessonId);
GO


-- =====================================================
-- SEED ROLES
-- =====================================================
INSERT INTO Roles (Name)
VALUES
    (N'Admin'),
    (N'Lecturer'),
    (N'Student');
GO


-- =====================================================
-- KIỂM TRA
-- =====================================================
SELECT * FROM Roles;

SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;
GO
