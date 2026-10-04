USE master;
GO

-- 1. Tạo LOGIN ở cấp SQL Server
CREATE LOGIN lms_app
WITH PASSWORD = 'LmsApp@2026#StrongPassword';
GO

-- 2. Chuyển vào database BasicLMS
USE BasicLMS;
GO

-- 3. Tạo USER tương ứng với LOGIN
CREATE USER lms_app
FOR LOGIN lms_app;
GO

-- 4. Cho quyền đọc và ghi dữ liệu
ALTER ROLE db_datareader ADD MEMBER lms_app;
ALTER ROLE db_datawriter ADD MEMBER lms_app;
GO
