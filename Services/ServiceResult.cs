namespace BasicLMS.Services;

public class ServiceResult
{
    public bool Succeeded { get; }
    public int StatusCode { get; }
    public string? Message { get; }

    protected ServiceResult(bool succeeded, int statusCode, string? message)
    {
        Succeeded = succeeded;
        StatusCode = statusCode;
        Message = message;
    }

    public static ServiceResult Ok() => new(true, StatusCodes.Status200OK, null);

    public static ServiceResult Fail(int statusCode, string message) =>
        new(false, statusCode, message);
}

public class ServiceResult<T> : ServiceResult
{
    public T? Value { get; }

    private ServiceResult(bool succeeded, int statusCode, string? message, T? value)
        : base(succeeded, statusCode, message)
    {
        Value = value;
    }

    public static ServiceResult<T> Ok(T value) =>
        new(true, StatusCodes.Status200OK, null, value);

    public static ServiceResult<T> Created(T value) =>
        new(true, StatusCodes.Status201Created, null, value);

    public new static ServiceResult<T> Fail(int statusCode, string message) =>
        new(false, statusCode, message, default);
}

public record Actor(int UserId, IReadOnlyCollection<string> Roles)
{
    public bool IsAdmin => Roles.Contains("Admin");
    public bool IsLecturer => Roles.Contains("Lecturer");
    public bool IsStudent => Roles.Contains("Student");
}
