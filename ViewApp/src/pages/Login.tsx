import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getApiErrorMessages } from "../api/errors";
import AuthLayout from "../components/layout/AuthLayout";
import TextField from "../components/ui/TextField";
import Button from "../components/ui/Button";
import Alert from "../components/ui/Alert";

interface LoginLocationState {
    from?: string;
    registeredEmail?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    const state = (location.state as LoginLocationState | null) ?? {};

    const [email, setEmail] = useState(state.registeredEmail ?? "");
    const [password, setPassword] = useState("");
    const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
    const [errors, setErrors] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const validate = () => {
        const next: typeof fieldErrors = {};

        if (!email.trim()) next.email = "Vui lòng nhập email.";
        else if (!EMAIL_PATTERN.test(email.trim())) next.email = "Email không hợp lệ.";

        if (!password) next.password = "Vui lòng nhập mật khẩu.";

        setFieldErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setErrors([]);

        if (!validate()) return;

        try {
            setSubmitting(true);
            await login(email, password);
            navigate(state.from ?? "/dashboard", { replace: true });
        } catch (error) {
            setErrors(getApiErrorMessages(error, "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin."));
            setPassword("");
        } finally {
            setSubmitting(false);
        }
    };

    const fillDemo = (demoEmail: string, demoPass: string) => {
        setEmail(demoEmail);
        setPassword(demoPass);
        setFieldErrors({});
    };

    return (
        <AuthLayout
            title="Đăng nhập tài khoản"
            subtitle="Truy cập hệ thống đào tạo BasicLMS"
            footer={
                <>
                    Chưa có tài khoản học viên?{" "}
                    <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-500">
                        Đăng ký ngay
                    </Link>
                </>
            }
        >
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {state.registeredEmail && errors.length === 0 && (
                    <Alert variant="success">Đăng ký thành công! Vui lòng đăng nhập để tiếp tục.</Alert>
                )}

                <Alert messages={errors} />

                <TextField
                    label="Địa chỉ email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={fieldErrors.email}
                    disabled={submitting}
                    autoFocus={!state.registeredEmail}
                />

                <TextField
                    label="Mật khẩu"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={fieldErrors.password}
                    disabled={submitting}
                    autoFocus={!!state.registeredEmail}
                />

                <Button type="submit" loading={submitting} className="w-full shadow-md shadow-indigo-200">
                    {submitting ? "Đang xác thực..." : "Đăng nhập vào hệ thống"}
                </Button>

                {/* Demo Helper Box */}
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                    <p className="font-semibold text-slate-700 mb-1.5">Tài khoản mặc định hệ thống:</p>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => fillDemo("admin@basiclms.local", "Admin@123456")}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition"
                        >
                            Quản trị viên (Admin)
                        </button>
                    </div>
                </div>

                <p className="text-center text-xs text-slate-400">
                    Quên mật khẩu? Vui lòng liên hệ quản trị viên để được cấp lại.
                </p>
            </form>
        </AuthLayout>
    );
}
