import axios from "axios";

export const TOKEN_STORAGE_KEY = "token";
export const UNAUTHORIZED_EVENT = "auth:unauthorized";

const api = axios.create({
    baseURL: "/api",
    headers: {
        "Content-Type": "application/json",
    },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
        delete config.headers["Content-Type"];
    }

    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const isLoginRequest = error.config?.url?.includes("/account/login");

        // Expired, forged or revoked token: drop the session so routes redirect to /login.
        if (error.response?.status === 401 && !isLoginRequest) {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
        }

        return Promise.reject(error);
    }
);

export default api;
