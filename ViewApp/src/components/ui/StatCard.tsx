import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface Props {
    title: string;
    value: string | number;
    description?: string;
    icon: ReactNode;
    to?: string;
    variant?: "indigo" | "sky" | "emerald" | "amber" | "rose" | "slate";
}

const COLOR_CLASSES = {
    indigo: {
        iconBg: "bg-indigo-50 text-indigo-600",
        borderHover: "hover:border-indigo-300 hover:shadow-indigo-50",
    },
    sky: {
        iconBg: "bg-sky-50 text-sky-600",
        borderHover: "hover:border-sky-300 hover:shadow-sky-50",
    },
    emerald: {
        iconBg: "bg-emerald-50 text-emerald-600",
        borderHover: "hover:border-emerald-300 hover:shadow-emerald-50",
    },
    amber: {
        iconBg: "bg-amber-50 text-amber-600",
        borderHover: "hover:border-amber-300 hover:shadow-amber-50",
    },
    rose: {
        iconBg: "bg-rose-50 text-rose-600",
        borderHover: "hover:border-rose-300 hover:shadow-rose-50",
    },
    slate: {
        iconBg: "bg-slate-100 text-slate-600",
        borderHover: "hover:border-slate-300",
    },
};

export default function StatCard({
    title,
    value,
    description,
    icon,
    to,
    variant = "indigo",
}: Props) {
    const color = COLOR_CLASSES[variant];

    const content = (
        <div
            className={`group relative flex items-center justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:shadow-md ${color.borderHover}`}
        >
            <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {title}
                </p>
                <p className="text-2xl font-bold tracking-tight text-slate-900">
                    {value}
                </p>
                {description && (
                    <p className="text-xs text-slate-500">{description}</p>
                )}
            </div>
            <div
                className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${color.iconBg} shadow-inner transition group-hover:scale-105`}
            >
                {icon}
            </div>
        </div>
    );

    if (to) {
        return (
            <Link to={to} className="block">
                {content}
            </Link>
        );
    }

    return content;
}
