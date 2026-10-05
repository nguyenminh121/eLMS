namespace BasicLMS.Models;

public class Course
{
    public int Id { get; set; }

    public int? CategoryId { get; set; }

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string? ThumbnailUrl { get; set; }

    public string Level { get; set; } = CourseLevels.Beginner;

    public string Status { get; set; } = CourseStatuses.Draft;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public Category? Category { get; set; }

    public ICollection<Chapter> Chapters { get; set; } = [];

    public ICollection<CourseMaterial> Materials { get; set; } = [];

    public ICollection<CourseLecturer> Lecturers { get; set; } = [];

    public ICollection<Class> Classes { get; set; } = [];
}
