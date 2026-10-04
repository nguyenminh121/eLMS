USE [SecureLms];
GO

-- Xóa FK của các bảng LMS đang tham chiếu users
IF OBJECT_ID('dbo.course_lecturers', 'U') IS NOT NULL
BEGIN
    ALTER TABLE dbo.course_lecturers
    DROP CONSTRAINT IF EXISTS FK_course_lecturers_users;
END
GO

IF OBJECT_ID('dbo.enrollments', 'U') IS NOT NULL
BEGIN
    ALTER TABLE dbo.enrollments
    DROP CONSTRAINT IF EXISTS FK_enrollments_users;
END
GO

IF OBJECT_ID('dbo.lesson_progress', 'U') IS NOT NULL
BEGIN
    ALTER TABLE dbo.lesson_progress
    DROP CONSTRAINT IF EXISTS FK_lesson_progress_users;
END
GO

-- Xóa bảng cũ
DROP TABLE IF EXISTS dbo.lesson_progress;
DROP TABLE IF EXISTS dbo.enrollments;
DROP TABLE IF EXISTS dbo.course_lecturers;
DROP TABLE IF EXISTS dbo.users;
DROP TABLE IF EXISTS dbo.roles;
GO
