import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminListUsers } from "../api/auth";
import type { AdminUser } from "../api/auth";
import { getApiErrorMessages } from "../api/errors";
import AppLayout from "../components/layout/AppLayout";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import RoleBadge from "../components/RoleBadge";
import ResetPasswordDialog from "../components/ResetPasswordDialog";
import EmptyState from "../components/ui/EmptyState";
import { SearchIcon, UsersIcon } from "../components/ui/icons";

export default function AdminUsers() {
    const [search, setSearch] = useState("");
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [query, setQuery] = useState({ term: "" });

    useEffect(() => {
        let cancelled = false;

        adminListUsers(query.term || undefined)
            .then(({ data }) => {
                if (cancelled) return;
                setUsers(data);
                setErrors([]);
            })
            .catch((error) => {
                if (!cancelled) setErrors(getApiErrorMessages(error, "Không tải được danh sách người dùng."));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [query]);

    const handleSearch = (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setQuery({ term: search.trim() });
    };

    const handleClear = () => {
        setSearch("");
        setLoading(true);
        setQuery({ term: "" });
    };

    const closeDialog = useCallback(() => setSelectedUser(null), []);

    const getInitials = (name?: string) => {
        if (!name) return "U";
        const parts = name.trim().split(" ");
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    return (
        <AppLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                        Quản trị người dùng
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Tìm kiếm người dùng, theo dõi vai trò và cấp lại mật khẩu truy cập hệ thống.
                    </p>
                </div>

                {/* Search Bar */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                    <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="relative flex-1">
                            <SearchIcon
                                size={18}
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Tìm theo địa chỉ email hoặc họ tên..."
                                aria-label="Tìm kiếm người dùng"
                                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit" loading={loading}>
                                Tìm kiếm
                            </Button>
                            {search && (
                                <Button variant="ghost" onClick={handleClear} disabled={loading}>
                                    Xóa lọc
                                </Button>
                            )}
                        </div>
                    </form>
                </div>

                <Alert messages={errors} />

                {/* Users Table */}
                <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                    {loading && users.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-indigo-600">
                            <Spinner className="size-8" />
                            <p className="mt-3 text-xs text-slate-400">Đang tải danh sách người dùng...</p>
                        </div>
                    ) : users.length === 0 ? (
                        <EmptyState
                            icon={<UsersIcon size={28} />}
                            title="Không tìm thấy người dùng"
                            description="Không có tài khoản nào phù hợp với từ khóa tìm kiếm của bạn."
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 text-sm">
                                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    <tr>
                                        <th className="px-5 py-3.5">Họ tên & Tài khoản</th>
                                        <th className="px-5 py-3.5">Email</th>
                                        <th className="px-5 py-3.5">Vai trò</th>
                                        <th className="px-5 py-3.5">Trạng thái</th>
                                        <th className="px-5 py-3.5 text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {users.map((u) => (
                                        <tr key={u.id} className="hover:bg-slate-50/80 transition">
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-slate-100 to-slate-200 font-bold text-xs text-slate-700 ring-1 ring-slate-200">
                                                        {getInitials(u.fullName)}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-900 leading-tight">
                                                            {u.fullName || "—"}
                                                        </p>
                                                        <p className="text-[11px] text-slate-400">
                                                            ID: #{u.id}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-600">
                                                {u.email}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {u.roles.map((role) => (
                                                        <RoleBadge key={role} role={role} />
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                                                        u.isActive
                                                            ? "bg-emerald-50 text-emerald-700 ring-emerald-300/60"
                                                            : "bg-slate-100 text-slate-600 ring-slate-300/60"
                                                    }`}
                                                >
                                                    <span
                                                        className={`size-1.5 rounded-full ${
                                                            u.isActive ? "bg-emerald-500" : "bg-slate-400"
                                                        }`}
                                                    />
                                                    {u.isActive ? "Hoạt động" : "Đã khóa"}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <Button
                                                    variant="secondary"
                                                    onClick={() => setSelectedUser(u)}
                                                    className="py-1 px-3 text-xs"
                                                >
                                                    Đặt lại mật khẩu
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {selectedUser && (
                <ResetPasswordDialog user={selectedUser} onClose={closeDialog} />
            )}
        </AppLayout>
    );
}
