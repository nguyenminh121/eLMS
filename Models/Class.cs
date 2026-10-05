namespace BasicLMS.Models;

public class Class
{
    public int Id { get; set; }

    public int CourseId { get; set; }

    public string Name { get; set; } = string.Empty;

    public DateTime? StartDate { get; set; }

    public DateTime? EndDate { get; set; }

    public string Status { get; set; } = ClassStatuses.Draft;

    public int? Capacity { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public Course Course { get; set; } = null!;

    public ICollection<ClassLecturer> Lecturers { get; set; } = [];

    public ICollection<ClassEnrollment> Enrollments { get; set; } = [];
}
