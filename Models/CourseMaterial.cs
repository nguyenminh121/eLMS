namespace BasicLMS.Models;

public class CourseMaterial
{
    public int Id { get; set; }

    public int CourseId { get; set; }

    public int? LessonId { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Url { get; set; } = string.Empty;

    public string Type { get; set; } = MaterialTypes.Link;

    public int SortOrder { get; set; }

    public DateTime CreatedAt { get; set; }

    public Course Course { get; set; } = null!;

    public Lesson? Lesson { get; set; }
}
