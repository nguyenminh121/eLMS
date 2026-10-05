namespace BasicLMS.Models;

public class CourseLecturer
{
    public int CourseId { get; set; }

    public int LecturerId { get; set; }

    public Course Course { get; set; } = null!;

    public ApplicationUser Lecturer { get; set; } = null!;
}
