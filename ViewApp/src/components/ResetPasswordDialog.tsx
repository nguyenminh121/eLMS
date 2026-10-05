import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminResetPassword } from "../api/auth";
import type { AdminUser } from "../api/auth";
import { getApiErrorMessages } from "../api/errors";
import { generatePassword, isPasswordValid } from "../utils/password";
import TextField from "./ui/TextField";
import Button from "./ui/Button";
import Alert from "./ui/Alert";
import PasswordChecklist from "./PasswordChecklist";

interface Props {
    user: AdminUser;
    onClose: () => void;
}

export default function ResetPasswordDialog({ user, onClose }: Props) {
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [fieldError, setFieldError] = useState<string>();
    const [errors, setErrors] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [resetDone, setResetDone] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !submitting) onClose();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose, submitting]);

    const handleGenerate = () => {
        const password = generatePassword();
        setNewPassword(password);
        setConfirmPassword(password);
        setFieldError(undefined);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setErrors([]);

        if (!isPasswordValid(newPassword)) {
            setFieldError("Mật khẩu chưa đáp ứng đủ yêu cầu.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setFieldError("Mật khẩu xác nhận không khớp.");
            return;
        }

        setFieldError(undefined);

        try {
            setSubmitting(true);
            await adminResetPassword(user.id, newPassword);
            setResetDone(true);
        } catch (error) {
            setErrors(getApiErrorMessages(error, "Đặt lại mật khẩu thất bại."));
        } finally {
            setSubmitting(false);
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(newPassword);
            setCopied(true);
        } catch {
            setErrors(["Không thể sao chép tự động, vui lòng sao chép thủ công."]);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget && !submitting) onClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="reset-password-title"
                className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            >
                <h2 id="reset-password-title" className="text-lg font-semibold text-slate-900">
                    Đặt lại mật khẩu
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                    {user.fullName} &middot; {user.email}
                </p>

                {resetDone ? (
                    <div className="mt-5 space-y-4">
                        <Alert variant="success">
                            Đã đặt lại mật khẩu. Hãy gửi mật khẩu mới cho người dùng qua kênh an toàn.
                        </Alert>

                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <code className="flex-1 break-all font-mono text-sm text-slate-900">{newPassword}</code>
                            <Button variant="secondary" onClick={handleCopy}>
                                {copied ? "Đã sao chép" : "Sao chép"}
                            </Button>
                        </div>

                        <Alert messages={errors} />

                        <div className="flex justify-end">
                            <Button onClick={onClose}>Đóng</Button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
                        <Alert messages={errors} />

                        <div className="space-y-2">
                            <div className="flex items-end gap-2">
                                <TextField
                                    label="Mật khẩu mới"
                                    type="password"
                                    autoComplete="new-password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    disabled={submitting}
                                    className="flex-1"
                                    autoFocus
                                />
                                <Button variant="secondary" onClick={handleGenerate} disabled={submitting}>
                                    Tạo ngẫu nhiên
                                </Button>
                            </div>
                            <PasswordChecklist password={newPassword} />
                        </div>

                        <TextField
                            label="Xác nhận mật khẩu mới"
                            type="password"
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            error={fieldError}
                            disabled={submitting}
                        />

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="ghost" onClick={onClose} disabled={submitting}>
                                Hủy
                            </Button>
                            <Button type="submit" variant="danger" loading={submitting}>
                                Đặt lại mật khẩu
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
