import { createContext } from "react";

export interface User {
    id: number;
    email: string;
    fullName: string;
    roles: string[];
}

export interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    loading: boolean;
    login: (email: string, password: string) => Promise<User>;
    logout: () => void;
    hasRole: (...roles: string[]) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
