using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using BasicLMS.Models;

namespace BasicLMS.Data;

public class ApplicationDbContext
    : IdentityDbContext<ApplicationUser, IdentityRole<int>, int>
{
    public ApplicationDbContext(
        DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<CourseLecturer> CourseLecturers => Set<CourseLecturer>();
    public DbSet<Chapter> Chapters => Set<Chapter>();
    public DbSet<Lesson> Lessons => Set<Lesson>();
    public DbSet<CourseMaterial> CourseMaterials => Set<CourseMaterial>();
    public DbSet<Class> Classes => Set<Class>();
    public DbSet<ClassLecturer> ClassLecturers => Set<ClassLecturer>();
    public DbSet<ClassEnrollment> ClassEnrollments => Set<ClassEnrollment>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Category>(entity =>
        {
            entity.Property(x => x.Name).HasMaxLength(150).IsRequired();
            entity.Property(x => x.Description).HasMaxLength(500);
            entity.HasIndex(x => x.Name).IsUnique();
        });

        builder.Entity<Course>(entity =>
        {
            entity.Property(x => x.Title).HasMaxLength(200).IsRequired();
            entity.Property(x => x.ThumbnailUrl).HasMaxLength(500);
            entity.Property(x => x.Level).HasMaxLength(30).IsRequired();
            entity.Property(x => x.Status).HasMaxLength(30).IsRequired();
            entity.HasIndex(x => x.CategoryId);

            entity.HasOne(x => x.Category)
                .WithMany(x => x.Courses)
                .HasForeignKey(x => x.CategoryId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<CourseLecturer>(entity =>
        {
            entity.HasKey(x => new { x.CourseId, x.LecturerId });
            entity.HasIndex(x => x.LecturerId);

            entity.HasOne(x => x.Course)
                .WithMany(x => x.Lecturers)
                .HasForeignKey(x => x.CourseId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Lecturer)
                .WithMany()
                .HasForeignKey(x => x.LecturerId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Chapter>(entity =>
        {
            entity.Property(x => x.Title).HasMaxLength(200).IsRequired();
            entity.HasIndex(x => x.CourseId);

            entity.HasOne(x => x.Course)
                .WithMany(x => x.Chapters)
                .HasForeignKey(x => x.CourseId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Lesson>(entity =>
        {
            entity.Property(x => x.Title).HasMaxLength(200).IsRequired();
            entity.Property(x => x.VideoUrl).HasMaxLength(500);
            entity.HasIndex(x => x.ChapterId);

            entity.HasOne(x => x.Chapter)
                .WithMany(x => x.Lessons)
                .HasForeignKey(x => x.ChapterId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<CourseMaterial>(entity =>
        {
            entity.Property(x => x.Title).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Url).HasMaxLength(1000).IsRequired();
            entity.Property(x => x.Type).HasMaxLength(30).IsRequired();
            entity.HasIndex(x => x.CourseId);
            entity.HasIndex(x => x.LessonId);

            entity.HasOne(x => x.Course)
                .WithMany(x => x.Materials)
                .HasForeignKey(x => x.CourseId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Lesson)
                .WithMany(x => x.Materials)
                .HasForeignKey(x => x.LessonId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        builder.Entity<Class>(entity =>
        {
            entity.ToTable("Classes");
            entity.Property(x => x.Name).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Status).HasMaxLength(30).IsRequired();
            entity.HasIndex(x => x.CourseId);
            entity.HasIndex(x => x.Status);

            entity.HasOne(x => x.Course)
                .WithMany(x => x.Classes)
                .HasForeignKey(x => x.CourseId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<ClassLecturer>(entity =>
        {
            entity.HasKey(x => new { x.ClassId, x.LecturerId });
            entity.HasIndex(x => x.LecturerId);

            entity.HasOne(x => x.Class)
                .WithMany(x => x.Lecturers)
                .HasForeignKey(x => x.ClassId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Lecturer)
                .WithMany()
                .HasForeignKey(x => x.LecturerId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<ClassEnrollment>(entity =>
        {
            entity.Property(x => x.Status).HasMaxLength(30).IsRequired();
            entity.HasIndex(x => new { x.StudentId, x.ClassId }).IsUnique();
            entity.HasIndex(x => x.StudentId);
            entity.HasIndex(x => x.ClassId);

            entity.HasOne(x => x.Class)
                .WithMany(x => x.Enrollments)
                .HasForeignKey(x => x.ClassId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Student)
                .WithMany()
                .HasForeignKey(x => x.StudentId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        if (Database.IsSqlServer())
        {
            builder.Entity<Course>().ToTable(t =>
            {
                t.HasCheckConstraint(
                    "CK_Courses_Level",
                    "[Level] IN (N'Beginner', N'Intermediate', N'Advanced')");
                t.HasCheckConstraint(
                    "CK_Courses_Status",
                    "[Status] IN (N'Draft', N'Published', N'Archived')");
            });

            builder.Entity<Lesson>().ToTable(t =>
            {
                t.HasCheckConstraint(
                    "CK_Lessons_Duration",
                    "[DurationSeconds] IS NULL OR [DurationSeconds] >= 0");
            });

            builder.Entity<Class>().ToTable("Classes", t =>
            {
                t.HasCheckConstraint(
                    "CK_Classes_Status",
                    "[Status] IN (N'Draft', N'Open', N'Closed', N'Archived')");
                t.HasCheckConstraint(
                    "CK_Classes_Capacity",
                    "[Capacity] IS NULL OR [Capacity] > 0");
            });

            builder.Entity<ClassEnrollment>().ToTable(t =>
            {
                t.HasCheckConstraint(
                    "CK_ClassEnrollments_Status",
                    "[Status] IN (N'Active', N'Completed', N'Cancelled')");
            });

            builder.Entity<CourseMaterial>().ToTable(t =>
            {
                t.HasCheckConstraint(
                    "CK_CourseMaterials_Type",
                    "[Type] IN (N'Link', N'File', N'Video')");
            });
        }
    }
}
