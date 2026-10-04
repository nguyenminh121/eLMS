import { useAuth } from "../contexts/AuthContext";

export default function Dashboard() {
    const { user, logout } = useAuth();

    return (
        <div>
            <h1>Dashboard</h1>

            <p>
                Xin chào {user?.fullName}
            </p>

            <button onClick={logout}>
                Logout
            </button>
        </div>
    );
}