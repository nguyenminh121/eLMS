const ROLE_STYLES: Record<string, { label: string; badgeClass: string; dotClass: string }> = {
    Admin: {
        label: "Quản trị viên",
        badgeClass: "bg-rose-50 text-rose-700 ring-rose-300/60",
        dotClass: "bg-rose-500",
    },
    Lecturer: {
        label: "Giảng viên",
        badgeClass: "bg-amber-50 text-amber-700 ring-amber-300/60",
        dotClass: "bg-amber-500",
    },
    Student: {
        label: "Học viên",
        badgeClass: "bg-indigo-50 text-indigo-700 ring-indigo-300/60",
        dotClass: "bg-indigo-500",
    },
};

export default function RoleBadge({ role }: { role: string }) {
    const style = ROLE_STYLES[role] ?? {
        label: role,
        badgeClass: "bg-slate-50 text-slate-700 ring-slate-300/60",
        dotClass: "bg-slate-400",
    };

    return (
        <span
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style.badgeClass}`}
        >
            <span className={`size-1.5 rounded-full ${style.dotClass}`} />
            {style.label}
        </span>
    );
}
