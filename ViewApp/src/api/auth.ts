import api from "./axios";

export interface RegisterRequest {
    fullName: string;
    email: string;
    password: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface AuthResponse {
    token: string;
    userId: number;
    fullName: string;
    email: string;
    roles: string[];
}

export interface MeResponse {
    id: number;
    email: string;
    fullName: string;
    roles: string[];
}

export interface WelcomeResponse {
    fullName: string;
    email: string;
    roles: string[];
    message: string;
    serverTimeUtc: string;
}

export interface AdminUser {
    id: number;
    fullName: string;
    email: string;
    roles: string[];
    isActive: boolean;
    createdAt: string;
}

export const register = (data: RegisterRequest) => {
    return api.post<{ message: string }>("/account/register", data);
};

export const login = (data: LoginRequest) => {
    return api.post<AuthResponse>("/account/login", data);
};

export const getMe = () => {
    return api.get<MeResponse>("/account/me");
};

export const getWelcome = () => {
    return api.get<WelcomeResponse>("/dashboard/welcome");
};

export const adminListUsers = (search?: string) => {
    return api.get<AdminUser[]>("/admin/users", {
        params: search ? { search } : undefined,
    });
};

export const adminResetPassword = (userId: number, newPassword: string) => {
    return api.post<{ message: string }>(
        `/admin/users/${userId}/reset-password`,
        { newPassword }
    );
};
