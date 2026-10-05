namespace BasicLMS.Services;

public interface IFileStorage
{
    Task<string> SaveAsync(string folder, string originalFileName, Stream content);
    Stream OpenRead(string relativeKey);
    void Delete(string? relativeKey);
    void DeleteFolder(string folder);
}
