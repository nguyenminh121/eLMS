import type { ButtonHTMLAttributes } from "react";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "icon" | "icon-sm";

const STYLES: Record<Variant, string> = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm shadow-indigo-100 focus-visible:ring-indigo-300",
    secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm focus-visible:ring-slate-200",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-200",
    danger: "bg-red-600 text-white hover:bg-red-500 shadow-sm shadow-red-100 focus-visible:ring-red-300",
};

const SIZES: Record<Size, string> = {
    sm: "h-8 px-3 text-xs font-semibold rounded-lg",
    md: "h-9 px-3.5 text-xs font-semibold rounded-xl",
    lg: "h-10 px-4 text-sm font-semibold rounded-xl",
    icon: "size-9 p-0 rounded-xl",
    "icon-sm": "size-8 p-0 rounded-lg",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    loading?: boolean;
}

export default function Button({
    variant = "primary",
    size = "md",
    loading = false,
    disabled,
    className = "",
    children,
    type = "button",
    ...props
}: Props) {
    return (
        <button
            type={type}
            disabled={disabled || loading}
            className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${SIZES[size]} ${STYLES[variant]} ${className}`}
            {...props}
        >
            {loading && <Spinner className="size-3.5" />}
            {children}
        </button>
    );
}
