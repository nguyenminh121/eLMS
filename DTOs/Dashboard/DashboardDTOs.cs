namespace BasicLMS.DTOs.Dashboard;

public record WelcomeResponse(
    string FullName,
    string Email,
    IList<string> Roles,
    string Message,
    DateTime ServerTimeUtc
);
