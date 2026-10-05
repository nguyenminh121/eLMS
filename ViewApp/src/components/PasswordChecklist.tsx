import { PASSWORD_RULES } from "../utils/password";

export default function PasswordChecklist({ password }: { password: string }) {
    return (
        <ul className="grid gap-1.5 rounded-lg bg-slate-50 p-3 text-xs sm:grid-cols-2">
            {PASSWORD_RULES.map((rule) => {
                const passed = rule.test(password);

                return (
                    <li
                        key={rule.id}
                        className={`flex items-center gap-2 ${passed ? "text-emerald-600" : "text-slate-500"}`}
                    >
                        <span
                            aria-hidden
                            className={`flex size-4 items-center justify-center rounded-full text-[10px] font-bold ${
                                passed ? "bg-emerald-100" : "bg-slate-200"
                            }`}
                        >
                            {passed ? "✓" : "•"}
                        </span>
                        {rule.label}
                    </li>
                );
            })}
        </ul>
    );
}
