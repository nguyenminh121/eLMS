namespace BasicLMS.Models;

public class Lesson
{
    public int Id { get; set; }

    public int ChapterId { get; set; }

    public string Title { get; set; } = string.Empty;

    public string? Content { get; set; }

    public string? VideoUrl { get; set; }

    public int? DurationSeconds { get; set; }

    public int SortOrder { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public Chapter Chapter { get; set; } = null!;

    public ICollection<CourseMaterial> Materials { get; set; } = [];
}
