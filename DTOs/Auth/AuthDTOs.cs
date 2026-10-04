namespace BasicLMS.DTOs.Auth;

public record RegisterRequest(
    string FullName,
    string Email,
    string Password
);

public record LoginRequest(
    string Email,
    string Password
);

public record AuthResponse(
    string Token,
    int UserId,
    string FullName,
    string Email,
    IList<string> Roles
);