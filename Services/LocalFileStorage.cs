using BasicLMS.Models;
using Microsoft.Extensions.Options;

namespace BasicLMS.Services;

public class StorageOptions
{
    public string Root { get; set; } = "uploads";
}

public class LocalFileStorage : IFileStorage
{
    private readonly string _root;

    public LocalFileStorage(IOptions<StorageOptions> options, IWebHostEnvironment env)
    {
        var configured = string.IsNullOrWhiteSpace(options.Value.Root) ? "uploads" : options.Value.Root;
        _root = Path.IsPathRooted(configured)
            ? Path.GetFullPath(configured)
            : Path.GetFullPath(Path.Combine(env.ContentRootPath, configured));
        Directory.CreateDirectory(_root);
    }

    public async Task<string> SaveAsync(string folder, string originalFileName, Stream content)
    {
        var ext = Path.GetExtension(originalFileName);
        if (!StoredMedia.IsAllowedExtension(ext))
            throw new InvalidOperationException("File type is not allowed");

        var safeFolder = SanitizeSegment(folder);
        var fileName = $"{Guid.NewGuid():N}{ext.ToLowerInvariant()}";
        var directory = EnsureInsideRoot(Path.Combine(_root, safeFolder));
        Directory.CreateDirectory(directory);

        var fullPath = Path.Combine(directory, fileName);
        await using var output = File.Create(fullPath);
        await content.CopyToAsync(output);

        return Path.Combine(safeFolder, fileName).Replace('\\', '/');
    }

    public Stream OpenRead(string relativeKey)
    {
        var fullPath = ResolveExisting(relativeKey);
        return new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read);
    }

    public void Delete(string? relativeKey)
    {
        if (string.IsNullOrWhiteSpace(relativeKey))
            return;

        try
        {
            var fullPath = ResolveExisting(relativeKey);
            File.Delete(fullPath);
        }
        catch (FileNotFoundException)
        {
        }
    }

    public void DeleteFolder(string folder)
    {
        var directory = EnsureInsideRoot(Path.Combine(_root, SanitizeSegment(folder)));
        if (Directory.Exists(directory))
            Directory.Delete(directory, recursive: true);
    }

    private string ResolveExisting(string relativeKey)
    {
        var combined = Path.Combine(_root, relativeKey.Replace('/', Path.DirectorySeparatorChar));
        var fullPath = EnsureInsideRoot(combined);
        if (!File.Exists(fullPath))
            throw new FileNotFoundException("Stored file not found", fullPath);
        return fullPath;
    }

    private string EnsureInsideRoot(string path)
    {
        var full = Path.GetFullPath(path);
        var root = _root.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        if (!full.StartsWith(root, StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(full, _root, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Invalid storage path");
        return full;
    }

    private static string SanitizeSegment(string folder)
    {
        var trimmed = folder.Trim().Replace('\\', '/');
        if (trimmed.Contains("..", StringComparison.Ordinal) || trimmed.Contains('/', StringComparison.Ordinal))
            throw new InvalidOperationException("Invalid storage folder");
        return trimmed;
    }
}
