import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import { FullPageSpinner } from "./ui/Spinner";

interface Props {
    children: ReactNode;
    roles?: string[];
}

export default function ProtectedRoute({ children, roles }: Props) {
    const { isAuthenticated, loading, hasRole } = useAuth();
    const location = useLocation();

    if (loading) {
        return <FullPageSpinner />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    if (roles && roles.length > 0 && !hasRole(...roles)) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}
