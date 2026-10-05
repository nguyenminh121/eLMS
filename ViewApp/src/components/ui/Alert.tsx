import type { ReactNode } from "react";

type Variant = "error" | "success" | "info";

const STYLES: Record<Variant, string> = {
    error: "border-red-200 bg-red-50 text-red-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    info: "border-sky-200 bg-sky-50 text-sky-700",
};

interface Props {
    variant?: Variant;
    messages?: string[];
    children?: ReactNode;
}

export default function Alert({ variant = "error", messages, children }: Props) {
    const hasMessages = messages && messages.length > 0;

    if (!hasMessages && !children) {
        return null;
    }

    return (
        <div
            role={variant === "error" ? "alert" : "status"}
            className={`rounded-lg border px-4 py-3 text-sm ${STYLES[variant]}`}
        >
            {hasMessages &&
                (messages.length === 1 ? (
                    <p>{messages[0]}</p>
                ) : (
                    <ul className="list-disc space-y-1 pl-5">
                        {messages.map((message) => (
                            <li key={message}>{message}</li>
                        ))}
                    </ul>
                ))}
            {children}
        </div>
    );
}
