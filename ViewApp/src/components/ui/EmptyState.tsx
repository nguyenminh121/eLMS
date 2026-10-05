import type { ReactNode } from "react";
import { FolderIcon } from "./icons";

interface Props {
    icon?: ReactNode;
    title: string;
    description?: string;
    action?: ReactNode;
}

export default function EmptyState({
    icon,
    title,
    description,
    action,
}: Props) {
    return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/50 px-6 py-12 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-inner">
                {icon ?? <FolderIcon size={28} />}
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
            {description && (
                <p className="mt-1.5 max-w-sm text-sm text-slate-500 leading-relaxed">
                    {description}
                </p>
            )}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}
