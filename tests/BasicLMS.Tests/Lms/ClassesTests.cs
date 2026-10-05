using System.Net;
using System.Net.Http.Json;
using BasicLMS.Models;
using BasicLMS.Tests.Infrastructure;

namespace BasicLMS.Tests.Lms;

public class ClassesTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public ClassesTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task List_WithoutToken_Returns401()
    {
        var response = await _factory.CreateClient().GetAsync("/api/classes");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Create_AsStudent_Returns403()
    {
        var course = await _factory.CreateCourseAsync($"StuCls-{Guid.NewGuid():N}"[..16], CourseStatuses.Published);
        var email = TestHelpers.UniqueEmail("cls-student");
        await _factory.CreateUserAsync(email);
        var client = await _factory.CreateClientAsAsync(email, TestHelpers.ValidPassword);

        var response = await client.PostAsJsonAsync("/api/classes", new
        {
            courseId = course.Id,
            name = "Student class"
        });
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Create_WithoutStatus_IsOpen()
    {
        var course = await _factory.CreateCourseAsync($"OpenDef-{Guid.NewGuid():N}"[..16], CourseStatuses.Published);
        var admin = await _factory.CreateClientAsAsync(
            CustomWebApplicationFactory.AdminEmail,
            CustomWebApplicationFactory.AdminPassword);

        var response = await admin.PostAsJsonAsync("/api/classes", new
        {
            courseId = course.Id,
            name = "Default open"
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ClassDetailResult>();
        Assert.Equal("Open", body!.Status);
        Assert.True(body.CanManage);
    }

    [Fact]
    public async Task Create_WithDraftStatus_IsDraft()
    {
        var course = await _factory.CreateCourseAsync($"DraftDef-{Guid.NewGuid():N}"[..16], CourseStatuses.Published);
        var admin = await _factory.CreateClientAsAsync(
            CustomWebApplicationFactory.AdminEmail,
            CustomWebApplicationFactory.AdminPassword);

        var response = await admin.PostAsJsonAsync("/api/classes", new
        {
            courseId = course.Id,
            name = "Explicit draft",
            status = "Draft"
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ClassDetailResult>();
        Assert.Equal("Draft", body!.Status);
    }

    [Fact]
    public async Task Create_AsUnassignedLecturer_Returns403()
    {
        var course = await _factory.CreateCourseAsync($"Cls-{Guid.NewGuid():N}"[..16]);
        var email = TestHelpers.UniqueEmail("cls-lec");
        await _factory.CreateUserAsync(email, role: "Lecturer");
        var client = await _factory.CreateClientAsAsync(email, TestHelpers.ValidPassword);

        var response = await client.PostAsJsonAsync("/api/classes", new
        {
            courseId = course.Id,
            name = "Forbidden class"
        });
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AssignedLecturer_CanCreateClass()
    {
        var course = await _factory.CreateCourseAsync($"OwnedC-{Guid.NewGuid():N}"[..16], CourseStatuses.Published);
        var email = TestHelpers.UniqueEmail("cls-owner");
        var lecturer = await _factory.CreateUserAsync(email, role: "Lecturer");
        await _factory.AssignCourseLecturerAsync(course.Id, lecturer.Id);

        var client = await _factory.CreateClientAsAsync(email, TestHelpers.ValidPassword);
        var response = await client.PostAsJsonAsync("/api/classes", new
        {
            courseId = course.Id,
            name = "Evening cohort",
            status = "Open"
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ClassDetailResult>();
        Assert.NotNull(body);
        Assert.Contains(body.Lecturers, l => l.Id == lecturer.Id);
    }

    [Fact]
    public async Task Student_CannotSeeDraftClass_UntilEnrolledOrOpen()
    {
        var course = await _factory.CreateCourseAsync($"Vis-{Guid.NewGuid():N}"[..16], CourseStatuses.Published);
        var draft = await _factory.CreateClassAsync(course.Id, "Hidden", ClassStatuses.Draft);
        var open = await _factory.CreateClassAsync(course.Id, "Visible", ClassStatuses.Open);

        var email = TestHelpers.UniqueEmail("cls-stu");
        await _factory.CreateUserAsync(email);
        var student = await _factory.CreateClientAsAsync(email, TestHelpers.ValidPassword);

        var list = await student.GetFromJsonAsync<List<ClassListResult>>("/api/classes");
        Assert.DoesNotContain(list!, c => c.Id == draft.Id);
        Assert.Contains(list!, c => c.Id == open.Id);

        var hidden = await student.GetAsync($"/api/classes/{draft.Id}");
        Assert.Equal(HttpStatusCode.NotFound, hidden.StatusCode);
    }

    [Fact]
    public async Task Enroll_StudentSelf_ThenOldPasswordStyle_Duplicate_Returns409()
    {
        var course = await _factory.CreateCourseAsync($"Enr-{Guid.NewGuid():N}"[..16], CourseStatuses.Published);
        var cls = await _factory.CreateClassAsync(course.Id, "Open class", ClassStatuses.Open);

        var email = TestHelpers.UniqueEmail("enroll");
        var student = await _factory.CreateUserAsync(email);
        var client = await _factory.CreateClientAsAsync(email, TestHelpers.ValidPassword);

        var first = await client.PostAsJsonAsync($"/api/classes/{cls.Id}/enrollments", new { });
        Assert.Equal(HttpStatusCode.Created, first.StatusCode);

        var enrollment = await first.Content.ReadFromJsonAsync<EnrollmentResult>();
        Assert.NotNull(enrollment);
        Assert.Equal(student.Id, enrollment.StudentId);

        var second = await client.PostAsJsonAsync($"/api/classes/{cls.Id}/enrollments", new { });
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);

        var detail = await client.GetFromJsonAsync<ClassDetailResult>($"/api/classes/{cls.Id}");
        Assert.Contains(detail!.Enrollments, e => e.StudentId == student.Id);
    }

    [Fact]
    public async Task Enroll_WhenClassNotOpen_Returns400()
    {
        var course = await _factory.CreateCourseAsync($"Closed-{Guid.NewGuid():N}"[..16], CourseStatuses.Published);
        var cls = await _factory.CreateClassAsync(course.Id, "Closed", ClassStatuses.Closed);

        var email = TestHelpers.UniqueEmail("closed-enroll");
        await _factory.CreateUserAsync(email);
        var client = await _factory.CreateClientAsAsync(email, TestHelpers.ValidPassword);

        var response = await client.PostAsJsonAsync($"/api/classes/{cls.Id}/enrollments", new { });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Enroll_WhenFull_Returns409()
    {
        var course = await _factory.CreateCourseAsync($"Full-{Guid.NewGuid():N}"[..16], CourseStatuses.Published);
        var cls = await _factory.CreateClassAsync(course.Id, "Tiny", ClassStatuses.Open, capacity: 1);

        var firstEmail = TestHelpers.UniqueEmail("seat1");
        await _factory.CreateUserAsync(firstEmail);
        var first = await _factory.CreateClientAsAsync(firstEmail, TestHelpers.ValidPassword);
        Assert.Equal(HttpStatusCode.Created,
            (await first.PostAsJsonAsync($"/api/classes/{cls.Id}/enrollments", new { })).StatusCode);

        var secondEmail = TestHelpers.UniqueEmail("seat2");
        await _factory.CreateUserAsync(secondEmail);
        var second = await _factory.CreateClientAsAsync(secondEmail, TestHelpers.ValidPassword);
        var response = await second.PostAsJsonAsync($"/api/classes/{cls.Id}/enrollments", new { });
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Admin_CanEnrollStudent_AndStudentCanUnenroll()
    {
        var course = await _factory.CreateCourseAsync($"AdmEnr-{Guid.NewGuid():N}"[..16], CourseStatuses.Published);
        var cls = await _factory.CreateClassAsync(course.Id, "Admin enroll", ClassStatuses.Open);

        var email = TestHelpers.UniqueEmail("enrolled-by-admin");
        var student = await _factory.CreateUserAsync(email);
        var admin = await AdminAsync();

        var enroll = await admin.PostAsJsonAsync($"/api/classes/{cls.Id}/enrollments", new { studentId = student.Id });
        Assert.Equal(HttpStatusCode.Created, enroll.StatusCode);
        var row = await enroll.Content.ReadFromJsonAsync<EnrollmentResult>();
        Assert.NotNull(row);

        var studentClient = await _factory.CreateClientAsAsync(email, TestHelpers.ValidPassword);
        var cancel = await studentClient.DeleteAsync($"/api/enrollments/{row.Id}");
        Assert.Equal(HttpStatusCode.OK, cancel.StatusCode);
    }

    [Fact]
    public async Task Student_CannotEnrollSomeoneElse()
    {
        var course = await _factory.CreateCourseAsync($"Other-{Guid.NewGuid():N}"[..16], CourseStatuses.Published);
        var cls = await _factory.CreateClassAsync(course.Id, "Open", ClassStatuses.Open);

        var other = await _factory.CreateUserAsync(TestHelpers.UniqueEmail("target"));
        var email = TestHelpers.UniqueEmail("attacker");
        await _factory.CreateUserAsync(email);
        var client = await _factory.CreateClientAsAsync(email, TestHelpers.ValidPassword);

        var response = await client.PostAsJsonAsync(
            $"/api/classes/{cls.Id}/enrollments",
            new { studentId = other.Id });
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AssignClassLecturer_AsStudent_Returns403()
    {
        var course = await _factory.CreateCourseAsync($"Asg-{Guid.NewGuid():N}"[..16]);
        var cls = await _factory.CreateClassAsync(course.Id, "C1");
        var lecturer = await _factory.CreateUserAsync(TestHelpers.UniqueEmail("to-assign"), role: "Lecturer");

        var email = TestHelpers.UniqueEmail("stu-asg");
        await _factory.CreateUserAsync(email);
        var client = await _factory.CreateClientAsAsync(email, TestHelpers.ValidPassword);

        var response = await client.PostAsync($"/api/classes/{cls.Id}/lecturers/{lecturer.Id}", null);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Get_UnknownClass_Returns404()
    {
        var admin = await AdminAsync();
        var response = await admin.GetAsync("/api/classes/999999");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private Task<HttpClient> AdminAsync() =>
        _factory.CreateClientAsAsync(
            CustomWebApplicationFactory.AdminEmail,
            CustomWebApplicationFactory.AdminPassword);
}
