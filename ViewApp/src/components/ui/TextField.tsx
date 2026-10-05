import { useId, useState } from "react";
import type { InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
}

export default function TextField({ label, error, type = "text", className = "", ...props }: Props) {
    const id = useId();
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";

    return (
        <div className={className}>
            <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
                {label}
            </label>

            <div className="relative">
                <input
                    id={id}
                    type={isPassword && showPassword ? "text" : type}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${id}-error` : undefined}
                    className={`block w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 ${
                        isPassword ? "pr-16" : ""
                    } ${
                        error
                            ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                            : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-200"
                    }`}
                    {...props}
                />

                {isPassword && (
                    <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-slate-500 hover:text-indigo-600"
                    >
                        {showPassword ? "Ẩn" : "Hiện"}
                    </button>
                )}
            </div>

            {error && (
                <p id={`${id}-error`} className="mt-1 text-xs text-red-600">
                    {error}
                </p>
            )}
        </div>
    );
}
