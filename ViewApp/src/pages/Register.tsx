import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { register as registerApi } from "../api/auth";

export default function Register() {
    const navigate = useNavigate();

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const validatePassword = (password: string) => {
        const errors: string[] = [];

        if (password.length < 6) {
            errors.push("Mật khẩu phải có ít nhất 6 ký tự.");
        }

        if (!/[A-Z]/.test(password)) {
            errors.push("Mật khẩu phải có ít nhất 1 chữ hoa.");
        }

        if (!/[0-9]/.test(password)) {
            errors.push("Mật khẩu phải có ít nhất 1 chữ số.");
        }

        return errors;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setError("");

        // Validate password phía frontend
        const passwordErrors = validatePassword(password);

        if (passwordErrors.length > 0) {
            setError(passwordErrors.join(" "));
            return;
        }

        try {
            setLoading(true);

            await registerApi({
                fullName,
                email,
                password,
            });

            // Register thành công
            navigate("/login");
        } catch (error: any) {
            console.error("REGISTER ERROR:", error.response?.data);

            const backendErrors = error.response?.data?.errors;

            if (Array.isArray(backendErrors)) {
                setError(
                    backendErrors
                        .map((item: any) => item.description)
                        .join(" ")
                );
            } else {
                setError(
                    error.response?.data?.message ||
                    "Đăng ký thất bại."
                );
            }
        } finally {
            setLoading(false);
        }
    };

    const passwordLengthValid = password.length >= 6;
    const passwordUpperValid = /[A-Z]/.test(password);
    const passwordDigitValid = /[0-9]/.test(password);

    return (
        <div>
            <h1>Register</h1>

            {error && (
                <p style={{ color: "red" }}>
                    {error}
                </p>
            )}

            <form onSubmit={handleSubmit}>
                {/* Full Name */}
                <div>
                    <label>Full name</label>

                    <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                    />
                </div>

                {/* Email */}
                <div>
                    <label>Email</label>

                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                {/* Password */}
                <div>
                    <label>Password</label>

                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                {/* Password requirements */}
                <div>
                    <p>Mật khẩu phải có:</p>

                    <ul>
                        <li
                            style={{
                                color: passwordLengthValid
                                    ? "green"
                                    : "red",
                            }}
                        >
                            {passwordLengthValid ? "✓" : "✗"} Ít nhất 6 ký tự
                        </li>

                        <li
                            style={{
                                color: passwordUpperValid
                                    ? "green"
                                    : "red",
                            }}
                        >
                            {passwordUpperValid ? "✓" : "✗"} Ít nhất 1 chữ hoa
                        </li>

                        <li
                            style={{
                                color: passwordDigitValid
                                    ? "green"
                                    : "red",
                            }}
                        >
                            {passwordDigitValid ? "✓" : "✗"} Ít nhất 1 chữ số
                        </li>
                    </ul>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={loading}
                >
                    {loading ? "Registering..." : "Register"}
                </button>
            </form>

            <p>
                Đã có tài khoản?{" "}
                <button
                    type="button"
                    onClick={() => navigate("/login")}
                >
                    Login
                </button>
            </p>
        </div>
    );
}