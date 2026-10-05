export function Spinner({ className = "size-5" }: { className?: string }) {
    return (
        <span
            role="status"
            aria-label="Đang tải"
            className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
        />
    );
}

export function FullPageSpinner() {
    return (
        <div className="flex min-h-svh items-center justify-center text-indigo-600">
            <Spinner className="size-10" />
        </div>
    );
}
