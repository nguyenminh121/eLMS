namespace BasicLMS.Models;

public class ClassLecturer
{
    public int ClassId { get; set; }

    public int LecturerId { get; set; }

    public Class Class { get; set; } = null!;

    public ApplicationUser Lecturer { get; set; } = null!;
}
