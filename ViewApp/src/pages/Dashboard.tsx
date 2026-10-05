import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getWelcome } from "../api/auth";
import type { WelcomeResponse } from "../api/auth";
import { listClasses, listCourses } from "../api/lms";
import type { ClassListItem, CourseListItem } from "../api/lms";
import { getApiErrorMessages } from "../api/errors";
import { useAuth } from "../hooks/useAuth";
import AppLayout from "../components/layout/AppLayout";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import RoleBadge from "../components/RoleBadge";
import StatusBadge from "../components/StatusBadge";
import StatCard from "../components/ui/StatCard";
import {
    AcademicCapIcon,
    BookOpenIcon,
    ChevronRightIcon,
    ClockIcon,
    FolderIcon,
    SparklesIcon,
    UsersIcon,
} from "../components/ui/icons";

export default function Dashboard() {
    const { hasRole, user } = useAuth();

    const [welcome, setWelcome] = useState<WelcomeResponse | null>(null);
    const [courses, setCourses] = useState<CourseListItem[]>([]);
    const [classes, setClasses] = useState<ClassListItem[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [reloadKey, setReloadKey] = useState(0);

    const isAdmin = hasRole("Admin");
    const isLecturer = hasRole("Lecturer");
    const isStudent = hasRole("Student");

    useEffect(() => {
        let cancelled = false;

        Promise.all([
            getWelcome().then(({ data }) => data),
            listCourses()
                .then(({ data }) => data)
                .catch(() => [] as CourseListItem[]),
            listClasses()
                .then(({ data }) => data)
                .catch(() => [] as ClassListItem[]),
        ])
            .then(([welcomeData, courseList, classList]) => {
                if (cancelled) return;
                setWelcome(welcomeData);
                setCourses(courseList);
                setClasses(classList);
                setErrors([]);
            })
            .catch((error) => {
                if (!cancelled) setErrors(getApiErrorMessages(error, "Không tải được dữ liệu Dashboard."));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [reloadKey]);

    const retry = () => {
        setLoading(true);
        setReloadKey((key) => key + 1);
    };

    // Filter relevant classes based on role
    const myClasses = isLecturer
        ? classes.filter((c) => user && c.lecturers.some((l) => l.id === user.id))
        : classes;

    return (
        <AppLayout>
            {loading && !welcome ? (
                <div className="flex flex-col items-center justify-center py-24 text-indigo-600">
                    <Spinner className="size-10" />
                    <p className="mt-4 text-sm font-medium text-slate-500">Đang tải không gian làm việc...</p>
                </div>
            ) : errors.length > 0 && !welcome ? (
                <div className="mx-auto max-w-lg space-y-4">
                    <Alert messages={errors} />
                    <Button variant="secondary" onClick={retry} loading={loading}>
                        Thử lại
                    </Button>
                </div>
            ) : (
                welcome && (
                    <div className="space-y-8">
                        {/* Welcome Hero Banner */}
                        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-sky-600 p-6 text-white shadow-xl shadow-indigo-100 sm:p-8">
                            <div className="absolute -right-10 -top-10 size-64 rounded-full bg-white/10 blur-2xl" />
                            <div className="absolute -bottom-10 right-40 size-48 rounded-full bg-sky-400/20 blur-2xl" />

                            <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
                                <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-indigo-100">
                                        <ClockIcon size={14} />
                                        <span>
                                            {new Date(welcome.serverTimeUtc).toLocaleDateString("vi-VN", {
                                                weekday: "long",
                                                day: "2-digit",
                                                month: "2-digit",
                                                year: "numeric",
                                            })}
                                        </span>
                                        <span>•</span>
                                        <span>BasicLMS Cloud</span>
                                    </div>
                                    <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                                        Xin chào, {welcome.fullName}!
                                    </h1>
                                    <p className="max-w-2xl text-sm text-indigo-100 leading-relaxed">
                                        {welcome.message}
                                    </p>
                                </div>

                                <div className="flex shrink-0 flex-wrap items-center gap-2">
                                    {welcome.roles.map((role) => (
                                        <RoleBadge key={role} role={role} />
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* KPI / Stat Cards */}
                        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <StatCard
                                title="Tổng khóa học"
                                value={courses.length}
                                description="Các khóa học trong hệ thống"
                                icon={<BookOpenIcon size={22} />}
                                to="/courses"
                                variant="indigo"
                            />
                            <StatCard
                                title={isLecturer ? "Lớp phụ trách" : "Lớp học mở"}
                                value={myClasses.length}
                                description="Lớp đào tạo đang triển khai"
                                icon={<AcademicCapIcon size={22} />}
                                to="/classes"
                                variant="sky"
                            />
                            {isAdmin && (
                                <StatCard
                                    title="Quản lý danh mục"
                                    value="Phân loại"
                                    description="Cấu trúc chủ đề đào tạo"
                                    icon={<FolderIcon size={22} />}
                                    to="/categories"
                                    variant="amber"
                                />
                            )}
                            {isAdmin && (
                                <StatCard
                                    title="Người dùng"
                                    value="Phân quyền"
                                    description="Tài khoản & cấp lại mật khẩu"
                                    icon={<UsersIcon size={22} />}
                                    to="/admin/users"
                                    variant="rose"
                                />
                            )}
                            {!isAdmin && (
                                <StatCard
                                    title="Trạng thái tài khoản"
                                    value="Hoạt động"
                                    description={welcome.email}
                                    icon={<SparklesIcon size={22} />}
                                    variant="emerald"
                                />
                            )}
                            {isStudent && (
                                <StatCard
                                    title="Tham gia học tập"
                                    value="Khám phá"
                                    description="Đăng ký lớp học phù hợp"
                                    icon={<AcademicCapIcon size={22} />}
                                    to="/classes"
                                    variant="indigo"
                                />
                            )}
                        </section>

                        {/* Quick Shortcuts / Action Grid */}
                        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="text-base font-bold text-slate-900">
                                        Lối tắt thao tác nhanh
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        Các chức năng chính dành cho {welcome.roles.join(", ")}
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                <Link
                                    to="/courses"
                                    className="group flex items-start gap-3.5 rounded-xl border border-slate-200/80 p-4 transition duration-150 hover:border-indigo-300 hover:bg-indigo-50/40"
                                >
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
                                        <BookOpenIcon size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700">
                                                Quản lý khóa học
                                            </p>
                                            <ChevronRightIcon size={16} className="text-slate-400 group-hover:text-indigo-600 transition group-hover:translate-x-0.5" />
                                        </div>
                                        <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                                            {isStudent
                                                ? "Duyệt danh sách khóa học và giáo trình bài giảng."
                                                : "Soạn giáo án, chương học, video và tài liệu."}
                                        </p>
                                    </div>
                                </Link>

                                <Link
                                    to="/classes"
                                    className="group flex items-start gap-3.5 rounded-xl border border-slate-200/80 p-4 transition duration-150 hover:border-sky-300 hover:bg-sky-50/40"
                                >
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 transition group-hover:bg-sky-600 group-hover:text-white">
                                        <AcademicCapIcon size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-semibold text-slate-900 group-hover:text-sky-700">
                                                Lớp học & Ghi danh
                                            </p>
                                            <ChevronRightIcon size={16} className="text-slate-400 group-hover:text-sky-600 transition group-hover:translate-x-0.5" />
                                        </div>
                                        <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                                            {isStudent
                                                ? "Kiểm tra sĩ số và ghi danh vào các lớp đang mở."
                                                : "Theo dõi học viên, phân công giảng viên và điểm số."}
                                        </p>
                                    </div>
                                </Link>

                                {isAdmin && (
                                    <Link
                                        to="/categories"
                                        className="group flex items-start gap-3.5 rounded-xl border border-slate-200/80 p-4 transition duration-150 hover:border-amber-300 hover:bg-amber-50/40"
                                    >
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 transition group-hover:bg-amber-600 group-hover:text-white">
                                            <FolderIcon size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-semibold text-slate-900 group-hover:text-amber-700">
                                                    Danh mục đào tạo
                                                </p>
                                                <ChevronRightIcon size={16} className="text-slate-400 group-hover:text-amber-600 transition group-hover:translate-x-0.5" />
                                            </div>
                                            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                                                Phân nhóm chủ đề, lĩnh vực đào tạo trong trường.
                                            </p>
                                        </div>
                                    </Link>
                                )}

                                {isAdmin && (
                                    <Link
                                        to="/admin/users"
                                        className="group flex items-start gap-3.5 rounded-xl border border-slate-200/80 p-4 transition duration-150 hover:border-rose-300 hover:bg-rose-50/40"
                                    >
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 transition group-hover:bg-rose-600 group-hover:text-white">
                                            <UsersIcon size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-semibold text-slate-900 group-hover:text-rose-700">
                                                    Quản lý tài khoản
                                                </p>
                                                <ChevronRightIcon size={16} className="text-slate-400 group-hover:text-rose-600 transition group-hover:translate-x-0.5" />
                                            </div>
                                            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                                                Tìm kiếm người dùng và đặt lại mật khẩu an toàn.
                                            </p>
                                        </div>
                                    </Link>
                                )}
                            </div>
                        </section>

                        {/* Recent Courses and Active Classes Overview */}
                        <div className="grid gap-6 lg:grid-cols-2">
                            {/* Course Spotlight */}
                            <section className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                            <BookOpenIcon size={18} />
                                        </div>
                                        <h2 className="text-base font-bold text-slate-900">
                                            Khóa học mới nhất
                                        </h2>
                                    </div>
                                    <Link
                                        to="/courses"
                                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 hover:underline"
                                    >
                                        Xem tất cả ({courses.length}) →
                                    </Link>
                                </div>

                                {courses.length === 0 ? (
                                    <p className="py-8 text-center text-xs text-slate-400">
                                        Chưa có khóa học nào được đăng ký.
                                    </p>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {courses.slice(0, 4).map((course) => (
                                            <Link
                                                key={course.id}
                                                to={`/courses/${course.id}`}
                                                className="group flex items-center justify-between py-3 transition hover:bg-slate-50/80 -mx-2 px-2 rounded-xl"
                                            >
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600">
                                                            {course.title}
                                                        </p>
                                                        <StatusBadge value={course.status} />
                                                    </div>
                                                    <p className="text-xs text-slate-400">
                                                        {course.categoryName || "Chưa phân loại"} • {course.chapterCount} chương • {course.classCount} lớp
                                                    </p>
                                                </div>
                                                <ChevronRightIcon size={16} className="text-slate-400 group-hover:text-indigo-600 transition" />
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </section>

                            {/* Classes Spotlight */}
                            <section className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="flex size-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                                            <AcademicCapIcon size={18} />
                                        </div>
                                        <h2 className="text-base font-bold text-slate-900">
                                            Lớp học đang mở
                                        </h2>
                                    </div>
                                    <Link
                                        to="/classes"
                                        className="text-xs font-semibold text-sky-600 hover:text-sky-500 hover:underline"
                                    >
                                        Xem tất cả ({classes.length}) →
                                    </Link>
                                </div>

                                {classes.length === 0 ? (
                                    <p className="py-8 text-center text-xs text-slate-400">
                                        Chưa có lớp học nào được tạo.
                                    </p>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {classes.slice(0, 4).map((cls) => (
                                            <Link
                                                key={cls.id}
                                                to={`/classes/${cls.id}`}
                                                className="group flex items-center justify-between py-3 transition hover:bg-slate-50/80 -mx-2 px-2 rounded-xl"
                                            >
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-semibold text-slate-800 group-hover:text-sky-600">
                                                            {cls.name}
                                                        </p>
                                                        <StatusBadge value={cls.status} />
                                                    </div>
                                                    <p className="text-xs text-slate-400">
                                                        Khóa: {cls.courseTitle} • {cls.enrollmentCount} học viên
                                                    </p>
                                                </div>
                                                <ChevronRightIcon size={16} className="text-slate-400 group-hover:text-sky-600 transition" />
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </section>
                        </div>
                    </div>
                )
            )}
        </AppLayout>
    );
}
