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

export const register = (data: RegisterRequest) => {
    return api.post("/account/register", data);
};

export const login = (data: LoginRequest) => {
    return api.post("/account/login", data);
};

export const getMe = () => {
    return api.get("/account/me");
};