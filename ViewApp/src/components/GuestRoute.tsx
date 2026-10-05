import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import { FullPageSpinner } from "./ui/Spinner";

export default function GuestRoute({ children }: { children: ReactNode }) {
    const { isAuthenticated, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <FullPageSpinner />;
    }

    if (isAuthenticated) {
        const from = (location.state as { from?: string } | null)?.from;
        return <Navigate to={from ?? "/dashboard"} replace />;
    }

    return children;
}
