interface BadgeConfig {
    label: string;
    badgeClass: string;
    dotClass?: string;
}

const CONFIGS: Record<string, BadgeConfig> = {
    // Course & Class Status
    Draft: {
        label: "Bản nháp",
        badgeClass: "bg-slate-100 text-slate-700 ring-slate-300/60",
        dotClass: "bg-slate-400",
    },
    Published: {
        label: "Đã xuất bản",
        badgeClass: "bg-emerald-50 text-emerald-700 ring-emerald-300/60",
        dotClass: "bg-emerald-500",
    },
    Open: {
        label: "Đang mở",
        badgeClass: "bg-emerald-50 text-emerald-700 ring-emerald-300/60",
        dotClass: "bg-emerald-500",
    },
    Closed: {
        label: "Đã đóng",
        badgeClass: "bg-rose-50 text-rose-700 ring-rose-300/60",
        dotClass: "bg-rose-500",
    },
    Archived: {
        label: "Lưu trữ",
        badgeClass: "bg-zinc-100 text-zinc-600 ring-zinc-300/60",
        dotClass: "bg-zinc-400",
    },

    // Enrollment Status
    Active: {
        label: "Đang học",
        badgeClass: "bg-sky-50 text-sky-700 ring-sky-300/60",
        dotClass: "bg-sky-500",
    },
    Completed: {
        label: "Hoàn thành",
        badgeClass: "bg-indigo-50 text-indigo-700 ring-indigo-300/60",
        dotClass: "bg-indigo-500",
    },
    Cancelled: {
        label: "Đã hủy",
        badgeClass: "bg-red-50 text-red-700 ring-red-300/60",
        dotClass: "bg-red-500",
    },

    // Levels
    Beginner: {
        label: "Cơ bản",
        badgeClass: "bg-teal-50 text-teal-700 ring-teal-300/60",
    },
    Intermediate: {
        label: "Trung cấp",
        badgeClass: "bg-blue-50 text-blue-700 ring-blue-300/60",
    },
    Advanced: {
        label: "Nâng cao",
        badgeClass: "bg-purple-50 text-purple-700 ring-purple-300/60",
    },
};

export default function StatusBadge({ value }: { value: string }) {
    const config = CONFIGS[value] ?? {
        label: value,
        badgeClass: "bg-slate-100 text-slate-700 ring-slate-300/60",
    };

    return (
        <span
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${config.badgeClass}`}
        >
            {config.dotClass && (
                <span className={`size-1.5 rounded-full ${config.dotClass}`} />
            )}
            {config.label}
        </span>
    );
}
