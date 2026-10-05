import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { createClass, listClasses, listCourses } from "../api/lms";
import type { ClassListItem, CourseListItem } from "../api/lms";
import { getApiErrorMessages } from "../api/errors";
import { useAuth } from "../hooks/useAuth";
import AppLayout from "../components/layout/AppLayout";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import TextField from "../components/ui/TextField";
import { Spinner } from "../components/ui/Spinner";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/ui/Modal";
import EmptyState from "../components/ui/EmptyState";
import {
    AcademicCapIcon,
    ChevronRightIcon,
    PlusIcon,
    UsersIcon,
} from "../components/ui/icons";

export default function Classes() {
    const { hasRole, user } = useAuth();
    const canCreate = hasRole("Admin") || hasRole("Lecturer");
    const isAdmin = hasRole("Admin");
    const [searchParams] = useSearchParams();
    const presetCourse = searchParams.get("courseId") ?? "";

    const [items, setItems] = useState<ClassListItem[]>([]);
    const [courses, setCourses] = useState<CourseListItem[]>([]);
    const [courseId, setCourseId] = useState(presetCourse);
    const [status, setStatus] = useState("");
    const [query, setQuery] = useState({ courseId: presetCourse, status: "" });
    const [errors, setErrors] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal state for create class
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [name, setName] = useState("");
    const [newCourseId, setNewCourseId] = useState(presetCourse);
    const [capacity, setCapacity] = useState("");
    const [saving, setSaving] = useState(false);

    const creatableCourses = isAdmin
        ? courses
        : courses.filter((c) => user && c.lecturers.some((l) => l.id === user.id));

    useEffect(() => {
        listCourses()
            .then(({ data }) => setCourses(data))
            .catch(() => undefined);
    }, []);

    useEffect(() => {
        let cancelled = false;
        listClasses({
            courseId: query.courseId ? Number(query.courseId) : undefined,
            status: query.status || undefined,
        })
            .then(({ data }) => {
                if (cancelled) return;
                setItems(data);
                setErrors([]);
            })
            .catch((error) => {
                if (!cancelled) setErrors(getApiErrorMessages(error, "Không tải được lớp học."));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [query]);

    const handleFilter = (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setQuery({ courseId, status });
    };

    const handleResetFilter = () => {
        setCourseId("");
        setStatus("");
        setLoading(true);
        setQuery({ courseId: "", status: "" });
    };

    const handleCreate = async (asDraft: boolean) => {
        if (!newCourseId || !name.trim()) return;
        setSaving(true);
        setErrors([]);
        try {
            await createClass({
                courseId: Number(newCourseId),
                name: name.trim(),
                capacity: capacity ? Number(capacity) : null,
                status: asDraft ? "Draft" : "Open",
            });
            setName("");
            setCapacity("");
            setIsCreateOpen(false);
            setLoading(true);
            setQuery({ ...query });
        } catch (error) {
            setErrors(getApiErrorMessages(error, "Không tạo được lớp."));
        } finally {
            setSaving(false);
        }
    };

    return (
        <AppLayout>
            <div className="space-y-6">
                {/* Page Header */}
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                            Lớp học
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Các đợt mở lớp học theo khóa: quản lý phân công giảng viên, danh sách học viên và sĩ số.
                        </p>
                    </div>

                    {canCreate && (
                        <Button
                            onClick={() => {
                                setNewCourseId(courseId || (creatableCourses[0]?.id ? String(creatableCourses[0].id) : ""));
                                setIsCreateOpen(true);
                            }}
                            className="shadow-md shadow-indigo-200"
                        >
                            <PlusIcon size={18} />
                            <span>Mở lớp học mới</span>
                        </Button>
                    )}
                </div>

                <Alert messages={errors} />

                {/* Filter Toolbar */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                    <form onSubmit={handleFilter} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <select
                            value={courseId}
                            onChange={(e) => setCourseId(e.target.value)}
                            className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-500"
                        >
                            <option value="">Tất cả khóa học</option>
                            {courses.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.title}
                                </option>
                            ))}
                        </select>

                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-500"
                        >
                            <option value="">Tất cả trạng thái</option>
                            <option value="Open">Đang mở (Open)</option>
                            <option value="Draft">Bản nháp (Draft)</option>
                            <option value="Closed">Đã đóng (Closed)</option>
                            <option value="Archived">Lưu trữ (Archived)</option>
                        </select>

                        <div className="flex gap-2">
                            <Button type="submit" loading={loading}>
                                Lọc danh sách
                            </Button>
                            {(courseId || status) && (
                                <Button variant="ghost" onClick={handleResetFilter}>
                                    Xóa lọc
                                </Button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Class Cards Grid */}
                {loading && items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-indigo-600">
                        <Spinner className="size-8" />
                        <p className="mt-3 text-xs text-slate-400">Đang tải danh sách lớp học...</p>
                    </div>
                ) : items.length === 0 ? (
                    <EmptyState
                        icon={<AcademicCapIcon size={28} />}
                        title="Không có lớp học nào"
                        description="Chưa có lớp học nào phù hợp với bộ lọc hiện tại. Hãy chọn khóa học khác hoặc mở lớp học mới."
                        action={
                            canCreate ? (
                                <Button onClick={() => setIsCreateOpen(true)}>
                                    <PlusIcon size={16} />
                                    <span>Mở lớp học ngay</span>
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {items.map((cls) => {
                            const percent = cls.capacity
                                ? Math.min(100, Math.round((cls.enrollmentCount / cls.capacity) * 100))
                                : null;

                            return (
                                <Link
                                    key={cls.id}
                                    to={`/classes/${cls.id}`}
                                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-50/50"
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="inline-flex whitespace-nowrap rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 truncate max-w-[200px]">
                                                {cls.courseTitle}
                                            </span>
                                            <StatusBadge value={cls.status} />
                                        </div>

                                        <h2 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition line-clamp-2">
                                            {cls.name}
                                        </h2>

                                        {/* Assigned Lecturers */}
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap">
                                            <UsersIcon size={14} className="text-slate-400 shrink-0" />
                                            <span className="truncate">
                                                {cls.lecturers.length === 0
                                                    ? "Chưa có giảng viên"
                                                    : cls.lecturers.map((l) => l.fullName).join(", ")}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Capacity Progress Bar */}
                                    <div className="mt-5 pt-4 border-t border-slate-100 space-y-1.5">
                                        <div className="flex items-center justify-between text-xs text-slate-500 whitespace-nowrap">
                                            <span>Sĩ số học viên:</span>
                                            <span className="font-semibold text-slate-800">
                                                {cls.enrollmentCount}
                                                {cls.capacity ? ` / ${cls.capacity}` : " (không giới hạn)"}
                                            </span>
                                        </div>

                                        {percent !== null && (
                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                                <div
                                                    className={`h-full rounded-full transition-all ${
                                                        percent >= 100
                                                            ? "bg-red-500"
                                                            : percent >= 80
                                                            ? "bg-amber-500"
                                                            : "bg-indigo-600"
                                                    }`}
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                        )}

                                        <div className="pt-2 flex justify-end">
                                            <span className="text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition inline-flex items-center gap-0.5">
                                                Vào lớp học
                                                <ChevronRightIcon size={14} />
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create Class Modal */}
            <Modal
                isOpen={isCreateOpen}
                onClose={() => !saving && setIsCreateOpen(false)}
                title="Mở lớp học mới"
                description="Tạo một lớp học thuộc khóa đào tạo để phân công và ghi danh."
            >
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        void handleCreate(false);
                    }}
                    className="space-y-4"
                >
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Khóa học áp dụng
                        </label>
                        <select
                            value={newCourseId}
                            onChange={(e) => setNewCourseId(e.target.value)}
                            required
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-500"
                            disabled={saving}
                        >
                            <option value="">-- Chọn khóa học --</option>
                            {creatableCourses.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    <TextField
                        label="Tên lớp học"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ví dụ: K01 - Tối 2-4-6, Lớp Sáng Thứ 7"
                        required
                        disabled={saving}
                    />

                    <TextField
                        label="Giới hạn sĩ số (tùy chọn)"
                        type="number"
                        min={1}
                        value={capacity}
                        onChange={(e) => setCapacity(e.target.value)}
                        placeholder="Để trống nếu không giới hạn số lượng học viên"
                        disabled={saving}
                    />

                    <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsCreateOpen(false)}
                            disabled={saving}
                        >
                            Hủy
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => void handleCreate(true)}
                            loading={saving}
                        >
                            Lưu nháp
                        </Button>
                        <Button type="submit" loading={saving}>
                            Mở lớp học
                        </Button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}
