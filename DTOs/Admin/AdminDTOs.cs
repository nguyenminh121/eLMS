namespace BasicLMS.DTOs.Admin;

public record AdminUserItem(
    int Id,
    string FullName,
    string Email,
    IList<string> Roles,
    bool IsActive,
    DateTime CreatedAt
);

public record AdminResetPasswordRequest(
    string NewPassword
);
