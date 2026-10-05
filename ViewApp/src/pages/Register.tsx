import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register as registerApi } from "../api/auth";
import { getApiErrorMessages } from "../api/errors";
import { isPasswordValid } from "../utils/password";
import AuthLayout from "../components/layout/AuthLayout";
import TextField from "../components/ui/TextField";
import Button from "../components/ui/Button";
import Alert from "../components/ui/Alert";
import PasswordChecklist from "../components/PasswordChecklist";

interface FieldErrors {
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
    const navigate = useNavigate();

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [errors, setErrors] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const validate = () => {
        const next: FieldErrors = {};

        if (!fullName.trim()) next.fullName = "Vui lòng nhập họ tên.";

        if (!email.trim()) next.email = "Vui lòng nhập email.";
        else if (!EMAIL_PATTERN.test(email.trim())) next.email = "Email không hợp lệ.";

        if (!password) next.password = "Vui lòng nhập mật khẩu.";
        else if (!isPasswordValid(password)) next.password = "Mật khẩu chưa đáp ứng đủ yêu cầu bên dưới.";

        if (!confirmPassword) next.confirmPassword = "Vui lòng nhập lại mật khẩu.";
        else if (confirmPassword !== password) next.confirmPassword = "Mật khẩu xác nhận không khớp.";

        setFieldErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setErrors([]);

        if (!validate()) return;

        const trimmedEmail = email.trim();

        try {
            setSubmitting(true);

            await registerApi({
                fullName: fullName.trim(),
                email: trimmedEmail,
                password,
            });

            navigate("/login", { replace: true, state: { registeredEmail: trimmedEmail } });
        } catch (error) {
            setErrors(getApiErrorMessages(error, "Đăng ký thất bại. Vui lòng thử lại."));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AuthLayout
            title="Đăng ký tài khoản"
            subtitle="Tạo tài khoản học viên để tham gia các khóa học"
            footer={
                <>
                    Đã có tài khoản?{" "}
                    <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
                        Đăng nhập
                    </Link>
                </>
            }
        >
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <Alert messages={errors} />

                <TextField
                    label="Họ và tên học viên"
                    autoComplete="name"
                    placeholder="Nguyễn Văn A"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    error={fieldErrors.fullName}
                    disabled={submitting}
                    autoFocus
                />

                <TextField
                    label="Địa chỉ email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={fieldErrors.email}
                    disabled={submitting}
                />

                <div className="space-y-2">
                    <TextField
                        label="Mật khẩu"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Tối thiểu 6 ký tự..."
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        error={fieldErrors.password}
                        disabled={submitting}
                    />
                    <PasswordChecklist password={password} />
                </div>

                <TextField
                    label="Xác nhận mật khẩu"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Nhập lại mật khẩu vừa tạo"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    error={fieldErrors.confirmPassword}
                    disabled={submitting}
                />

                <Button type="submit" loading={submitting} className="w-full shadow-md shadow-indigo-200">
                    {submitting ? "Đang tạo tài khoản..." : "Hoàn tất đăng ký"}
                </Button>
            </form>
        </AuthLayout>
    );
}
