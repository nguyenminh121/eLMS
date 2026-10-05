import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../../hooks/useAuth";
import RoleBadge from "../RoleBadge";
import {
    AcademicCapIcon,
    BookOpenIcon,
    ChevronDownIcon,
    CloseIcon,
    HomeIcon,
    LogoutIcon,
    MenuIcon,
    UsersIcon,
} from "../ui/icons";

interface Props {
    children: ReactNode;
}

export default function AppLayout({ children }: Props) {
    const { user, logout, hasRole } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);

    // Close user dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setUserMenuOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setUserMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    const getInitials = (name?: string) => {
        if (!name) return "U";
        const parts = name.trim().split(" ");
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const navLinkClass = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition shrink-0 ${
            isActive
                ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200/60 font-semibold"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }`;

    const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-3 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition ${
            isActive
                ? "bg-indigo-50 text-indigo-700 font-semibold ring-1 ring-indigo-200/60"
                : "text-slate-700 hover:bg-slate-100"
        }`;

    const panelItemClass = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition ${
            isActive
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
        }`;

    return (
        <div className="flex min-h-svh flex-col bg-slate-50/70 text-slate-800">
            {/* Header */}
            <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                    {/* Brand & Desktop Nav */}
                    <div className="flex items-center gap-6 lg:gap-8">
                        <NavLink to="/dashboard" className="flex items-center gap-2.5 shrink-0">
                            <img
                                src="/BasicLMS.png"
                                alt="BasicLMS"
                                className="size-9 rounded-xl object-cover shadow-md shadow-indigo-200 shrink-0"
                            />
                            <div className="flex flex-col whitespace-nowrap">
                                <span className="text-base font-bold tracking-tight text-slate-900 leading-none">
                                    Basic<span className="text-indigo-600">LMS</span>
                                </span>
                                <span className="text-[11px] font-medium text-slate-400">
                                    Hệ thống đào tạo
                                </span>
                            </div>
                        </NavLink>

                        <nav className="hidden items-center gap-1.5 md:flex">
                            <NavLink to="/dashboard" className={navLinkClass}>
                                <HomeIcon size={18} />
                                <span>Bàn làm việc</span>
                            </NavLink>
                            <NavLink to="/courses" className={navLinkClass}>
                                <BookOpenIcon size={18} />
                                <span>Khóa học</span>
                            </NavLink>
                            <NavLink to="/classes" className={navLinkClass}>
                                <AcademicCapIcon size={18} />
                                <span>Lớp học</span>
                            </NavLink>
                            {hasRole("Admin") && (
                                <NavLink to="/admin/users" className={navLinkClass}>
                                    <UsersIcon size={18} />
                                    <span>Người dùng</span>
                                </NavLink>
                            )}
                        </nav>
                    </div>

                    {/* Right Side: Compact User Panel Menu */}
                    <div className="flex items-center gap-2">
                        {/* Desktop User Dropdown Menu */}
                        <div className="relative hidden sm:block" ref={userMenuRef}>
                            <button
                                type="button"
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                                className={`flex items-center gap-2.5 rounded-2xl p-1.5 pr-3 transition focus:outline-none ring-1 ${
                                    userMenuOpen
                                        ? "bg-slate-100 ring-slate-300"
                                        : "hover:bg-slate-50 ring-transparent hover:ring-slate-200"
                                }`}
                                aria-expanded={userMenuOpen}
                                aria-label="Menu tài khoản"
                            >
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 font-bold text-xs text-white shadow-sm shadow-indigo-200">
                                    {getInitials(user?.fullName)}
                                </div>
                                <div className="text-left hidden md:block whitespace-nowrap">
                                    <p className="text-xs font-bold text-slate-900 leading-tight">
                                        {user?.fullName}
                                    </p>
                                    <p className="text-[10px] text-slate-400">
                                        {user?.roles?.[0] || "Tài khoản"}
                                    </p>
                                </div>
                                <ChevronDownIcon
                                    size={14}
                                    className={`text-slate-400 transition-transform duration-150 ${
                                        userMenuOpen ? "rotate-180 text-indigo-600" : ""
                                    }`}
                                />
                            </button>

                            {/* Dropdown Panel */}
                            {userMenuOpen && (
                                <div className="absolute right-0 top-full mt-2 w-72 origin-top-right rounded-2xl border border-slate-200/80 bg-white p-2 shadow-2xl ring-1 ring-slate-900/5 z-50 animate-in fade-in zoom-in-95 duration-100">
                                    {/* User Info Header */}
                                    <div className="flex items-center gap-3 rounded-xl bg-slate-50/80 p-3 mb-1">
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 font-bold text-sm text-white">
                                            {getInitials(user?.fullName)}
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="truncate text-xs font-bold text-slate-900 leading-tight">
                                                {user?.fullName}
                                            </p>
                                            <p className="truncate text-[11px] text-slate-500">
                                                {user?.email}
                                            </p>
                                            <div className="mt-1">
                                                {user?.roles?.[0] && <RoleBadge role={user.roles[0]} />}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Links inside panel */}
                                    <div className="space-y-0.5 py-1">
                                        <NavLink
                                            to="/dashboard"
                                            onClick={() => setUserMenuOpen(false)}
                                            className={panelItemClass}
                                        >
                                            <HomeIcon size={16} />
                                            <span>Bàn làm việc</span>
                                        </NavLink>
                                        <NavLink
                                            to="/courses"
                                            onClick={() => setUserMenuOpen(false)}
                                            className={panelItemClass}
                                        >
                                            <BookOpenIcon size={16} />
                                            <span>Khóa học</span>
                                        </NavLink>
                                        <NavLink
                                            to="/classes"
                                            onClick={() => setUserMenuOpen(false)}
                                            className={panelItemClass}
                                        >
                                            <AcademicCapIcon size={16} />
                                            <span>Lớp học</span>
                                        </NavLink>
                                        {hasRole("Admin") && (
                                            <NavLink
                                                to="/admin/users"
                                                onClick={() => setUserMenuOpen(false)}
                                                className={panelItemClass}
                                            >
                                                <UsersIcon size={16} />
                                                <span>Quản trị người dùng</span>
                                            </NavLink>
                                        )}
                                    </div>

                                    {/* Logout Divider & Action */}
                                    <div className="border-t border-slate-100 pt-1 mt-1">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setUserMenuOpen(false);
                                                logout();
                                            }}
                                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
                                        >
                                            <LogoutIcon size={16} />
                                            <span>Đăng xuất khỏi hệ thống</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="rounded-xl border border-slate-200 p-2 text-slate-600 md:hidden hover:bg-slate-100 shrink-0"
                            aria-label="Menu"
                        >
                            {mobileMenuOpen ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Drawer */}
                {mobileMenuOpen && (
                    <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden shadow-lg animate-in slide-in-from-top duration-150">
                        {/* Mobile User Bar */}
                        <div className="mb-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 font-bold text-sm text-white">
                                {getInitials(user?.fullName)}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="truncate text-sm font-semibold text-slate-900">
                                    {user?.fullName}
                                </p>
                                <p className="truncate text-xs text-slate-400">{user?.email}</p>
                            </div>
                            {user?.roles?.[0] && <RoleBadge role={user.roles[0]} />}
                        </div>

                        {/* Mobile Navigation Links */}
                        <nav className="space-y-1">
                            <NavLink
                                to="/dashboard"
                                onClick={() => setMobileMenuOpen(false)}
                                className={mobileNavLinkClass}
                            >
                                <HomeIcon size={18} />
                                <span>Bàn làm việc</span>
                            </NavLink>
                            <NavLink
                                to="/courses"
                                onClick={() => setMobileMenuOpen(false)}
                                className={mobileNavLinkClass}
                            >
                                <BookOpenIcon size={18} />
                                <span>Khóa học</span>
                            </NavLink>
                            <NavLink
                                to="/classes"
                                onClick={() => setMobileMenuOpen(false)}
                                className={mobileNavLinkClass}
                            >
                                <AcademicCapIcon size={18} />
                                <span>Lớp học</span>
                            </NavLink>
                            {hasRole("Admin") && (
                                <NavLink
                                    to="/admin/users"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={mobileNavLinkClass}
                                >
                                    <UsersIcon size={18} />
                                    <span>Quản lý người dùng</span>
                                </NavLink>
                            )}
                        </nav>

                        <div className="mt-4 pt-3 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => {
                                    setMobileMenuOpen(false);
                                    logout();
                                }}
                                className="flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-red-50 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 transition"
                            >
                                <LogoutIcon size={18} />
                                <span>Đăng xuất</span>
                            </button>
                        </div>
                    </div>
                )}
            </header>

            {/* Main Page Content */}
            <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
                {children}
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-200/80 bg-white py-6">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-xs text-slate-400 sm:flex-row sm:px-6 lg:px-8">
                    <p>© 2026 BasicLMS - Hệ thống quản lý học tập và đào tạo trực tuyến.</p>
                    <div className="flex items-center gap-4 whitespace-nowrap">
                        <span>Bản phát hành v1.0</span>
                        <span>•</span>
                        <span>Hỗ trợ kỹ thuật</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
