import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { getMe, login as loginApi } from "../api/auth";
import { TOKEN_STORAGE_KEY, UNAUTHORIZED_EVENT } from "../api/axios";
import { AuthContext } from "./auth-context";
import type { User } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
    const navigate = useNavigate();

    const [token, setToken] = useState<string | null>(() =>
        localStorage.getItem(TOKEN_STORAGE_KEY)
    );
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(() =>
        !!localStorage.getItem(TOKEN_STORAGE_KEY)
    );

    // Restore the session once on app start (e.g. after F5).
    useEffect(() => {
        if (!localStorage.getItem(TOKEN_STORAGE_KEY)) {
            return;
        }

        let cancelled = false;

        getMe()
            .then((response) => {
                if (!cancelled) setUser(response.data);
            })
            .catch(() => {
                if (cancelled) return;
                localStorage.removeItem(TOKEN_STORAGE_KEY);
                setToken(null);
                setUser(null);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const handleUnauthorized = () => {
            setToken(null);
            setUser(null);
        };

        window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
        return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const { data } = await loginApi({ email: email.trim(), password });

        const loggedInUser: User = {
            id: data.userId,
            email: data.email,
            fullName: data.fullName,
            roles: data.roles,
        };

        localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
        setToken(data.token);
        setUser(loggedInUser);

        return loggedInUser;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken(null);
        setUser(null);
        navigate("/login", { replace: true });
    }, [navigate]);

    const hasRole = useCallback(
        (...roles: string[]) => !!user && roles.some((role) => user.roles.includes(role)),
        [user]
    );

    const value = useMemo(
        () => ({
            user,
            token,
            isAuthenticated: !!token && !!user,
            loading,
            login,
            logout,
            hasRole,
        }),
        [user, token, loading, login, logout, hasRole]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
