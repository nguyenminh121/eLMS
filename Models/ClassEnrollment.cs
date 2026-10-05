namespace BasicLMS.Models;

public class ClassEnrollment
{
    public int Id { get; set; }

    public int ClassId { get; set; }

    public int StudentId { get; set; }

    public DateTime EnrolledAt { get; set; }

    public DateTime? CompletedAt { get; set; }

    public string Status { get; set; } = EnrollmentStatuses.Active;

    public Class Class { get; set; } = null!;

    public ApplicationUser Student { get; set; } = null!;
}
