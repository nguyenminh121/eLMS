namespace BasicLMS.Models;

public static class CourseLevels
{
    public const string Beginner = "Beginner";
    public const string Intermediate = "Intermediate";
    public const string Advanced = "Advanced";

    public static readonly string[] All = [Beginner, Intermediate, Advanced];

    public static bool IsValid(string? value) =>
        value != null && All.Contains(value);
}

public static class CourseStatuses
{
    public const string Draft = "Draft";
    public const string Published = "Published";
    public const string Archived = "Archived";

    public static readonly string[] All = [Draft, Published, Archived];

    public static bool IsValid(string? value) =>
        value != null && All.Contains(value);
}

public static class ClassStatuses
{
    public const string Draft = "Draft";
    public const string Open = "Open";
    public const string Closed = "Closed";
    public const string Archived = "Archived";

    public static readonly string[] All = [Draft, Open, Closed, Archived];

    public static bool IsValid(string? value) =>
        value != null && All.Contains(value);
}

public static class EnrollmentStatuses
{
    public const string Active = "Active";
    public const string Completed = "Completed";
    public const string Cancelled = "Cancelled";

    public static readonly string[] All = [Active, Completed, Cancelled];

    public static bool IsValid(string? value) =>
        value != null && All.Contains(value);
}

public static class MaterialTypes
{
    public const string Link = "Link";
    public const string File = "File";
    public const string Video = "Video";

    public static readonly string[] All = [Link, File, Video];

    public static bool IsValid(string? value) =>
        value != null && All.Contains(value);
}
