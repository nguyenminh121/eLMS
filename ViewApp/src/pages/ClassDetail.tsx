import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    assignClassLecturer,
    deleteClass,
    enrollInClass,
    getClass,
    lookupUsers,
    unassignClassLecturer,
    unenroll,
    updateClass,
} from "../api/lms";
import type { ClassDetail as ClassDetailType, UserSummary } from "../api/lms";
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
    BookOpenIcon,
    CheckCircleIcon,
    ChevronRightIcon,
    EditIcon,
    PlusIcon,
    TrashIcon,
    UsersIcon,
} from "../components/ui/icons";

export default function ClassDetail() {
    const { id } = useParams();
    const classId = Number(id);
    const navigate = useNavigate();
    const { hasRole, user } = useAuth();

    const [cls, setCls] = useState<ClassDetailType | null>(null);
    const [lecturers, setLecturers] = useState<UserSummary[]>([]);
    const [students, setStudents] = useState<UserSummary[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [reloadKey, setReloadKey] = useState(0);
    const [saving, setSaving] = useState(false);

    const [activeTab, setActiveTab] = useState<"students" | "lecturers">("students");

    // Edit modal form state
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [name, setName] = useState("");
    const [status, setStatus] = useState("Draft");
    const [capacity, setCapacity] = useState("");

    // Modal states
    const [assignId, setAssignId] = useState("");
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [studentId, setStudentId] = useState("");
    const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const canManage = hasRole("Admin") || !!cls?.canManage;
    const myEnrollment = cls?.enrollments.find((e) => e.studentId === user?.id);

    useEffect(() => {
        let cancelled = false;
        if (!Number.isFinite(classId)) return;
        getClass(classId)
            .then(({ data }) => {
                if (cancelled) return;
                setCls(data);
                setName(data.name);
                setStatus(data.status);
                setCapacity(data.capacity ? String(data.capacity) : "");
                setErrors([]);
            })
            .catch((error) => {
                if (!cancelled) setErrors(getApiErrorMessages(error, "Không tải được lớp."));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [classId, reloadKey]);

    useEffect(() => {
        if (hasRole("Admin")) {
            lookupUsers({ role: "Lecturer" })
                .then(({ data }) => setLecturers(data))
                .catch(() => undefined);
        }
        if (hasRole("Admin") || hasRole("Lecturer")) {
            lookupUsers({ role: "Student" })
                .then(({ data }) => setStudents(data))
                .catch(() => undefined);
        }
    }, [hasRole]);

    const reload = () => {
        setLoading(true);
        setReloadKey((k) => k + 1);
    };

    const run = async (action: () => Promise<unknown>, fallback: string) => {
        try {
            await action();
            reload();
        } catch (error) {
            setErrors(getApiErrorMessages(error, fallback));
        }
    };

    const handleSaveClass = async (e: FormEvent) => {
        e.preventDefault();
        if (!cls) return;
        setSaving(true);
        try {
            await updateClass(cls.id, {
                courseId: cls.courseId,
                name: name.trim(),
                status,
                capacity: capacity ? Number(capacity) : null,
            });
            setIsEditModalOpen(false);
            reload();
        } catch (error) {
            setErrors(getApiErrorMessages(error, "Không lưu được thông tin lớp."));
        } finally {
            setSaving(false);
        }
    };

    if (!Number.isFinite(classId)) {
        return (
            <AppLayout>
                <Alert messages={["Lớp học không hợp lệ."]} />
            </AppLayout>
        );
    }

    const capacityPercent = cls?.capacity
        ? Math.min(100, Math.round((cls.enrollments.length / cls.capacity) * 100))
        : null;

    return (
        <AppLayout>
            <div className="space-y-6">
                {/* Breadcrumb Navigation */}
                <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 whitespace-nowrap overflow-x-auto py-1">
                    <Link to="/classes" className="hover:text-indigo-600 transition shrink-0">
                        Lớp học
                    </Link>
                    <ChevronRightIcon size={12} className="text-slate-400 shrink-0" />
                    <span className="text-slate-800 truncate max-w-md">
                        {cls?.name || "Chi tiết lớp học"}
                    </span>
                </nav>

                <Alert messages={errors} />

                {loading && !cls ? (
                    <div className="flex flex-col items-center justify-center py-20 text-indigo-600">
                        <Spinner className="size-8" />
                        <p className="mt-3 text-xs text-slate-400">Đang tải thông tin lớp học...</p>
                    </div>
                ) : !cls ? (
                    <p className="text-sm text-slate-500">Không tìm thấy thông tin lớp học.</p>
                ) : (
                    <>
                        {/* Header Banner */}
                        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
                            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
                                <div className="space-y-3 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Link
                                            to={`/courses/${cls.courseId}`}
                                            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                                        >
                                            <BookOpenIcon size={14} />
                                            <span>Khóa: {cls.courseTitle}</span>
                                        </Link>
                                        <StatusBadge value={cls.status} />
                                    </div>

                                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl leading-snug">
                                        {cls.name}
                                    </h1>

                                    {/* Capacity Progress Bar */}
                                    <div className="max-w-md space-y-1.5 pt-1">
                                        <div className="flex items-center justify-between text-xs text-slate-600">
                                            <span className="whitespace-nowrap">Sĩ số học viên:</span>
                                            <span className="font-bold text-slate-900 whitespace-nowrap">
                                                {cls.enrollments.length}
                                                {cls.capacity ? ` / ${cls.capacity} học viên` : " (không giới hạn)"}
                                            </span>
                                        </div>

                                        {capacityPercent !== null && (
                                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                                <div
                                                    className={`h-full rounded-full transition-all ${
                                                        capacityPercent >= 100
                                                            ? "bg-red-500"
                                                            : capacityPercent >= 80
                                                            ? "bg-amber-500"
                                                            : "bg-indigo-600"
                                                    }`}
                                                    style={{ width: `${capacityPercent}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right Side Actions */}
                                <div className="flex flex-wrap items-center gap-2 self-start shrink-0">
                                    {hasRole("Student") && !canManage && cls.status === "Open" && !myEnrollment && (
                                        <Button
                                            onClick={() => void run(() => enrollInClass(cls.id), "Không ghi danh được.")}
                                            className="shadow-md shadow-indigo-200"
                                            size="md"
                                        >
                                            <CheckCircleIcon size={16} />
                                            <span>Ghi danh lớp này ngay</span>
                                        </Button>
                                    )}

                                    {myEnrollment && (
                                        <div className="flex items-center gap-2">
                                            <span className="h-9 inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                                <CheckCircleIcon size={16} />
                                                <span>Bạn đã ghi danh lớp này</span>
                                            </span>
                                            <Button
                                                variant="secondary"
                                                size="md"
                                                onClick={() => void run(() => unenroll(myEnrollment.id), "Không hủy ghi danh được.")}
                                            >
                                                Hủy ghi danh
                                            </Button>
                                        </div>
                                    )}

                                    {canManage && (
                                        <Button
                                            variant="secondary"
                                            size="md"
                                            onClick={() => setIsEditModalOpen(true)}
                                        >
                                            <EditIcon size={15} />
                                            <span>Chỉnh sửa thông tin lớp</span>
                                        </Button>
                                    )}

                                    {hasRole("Admin") && (
                                        <Button
                                            variant="danger"
                                            size="icon"
                                            onClick={() => setIsDeleteModalOpen(true)}
                                            title="Xóa lớp học"
                                        >
                                            <TrashIcon size={16} />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Tabs Navigation */}
                            <div className="mt-8 flex gap-2 border-t border-slate-100 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("students")}
                                    className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${
                                        activeTab === "students"
                                            ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
                                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                    }`}
                                >
                                    <UsersIcon size={18} />
                                    <span>Danh sách học viên</span>
                                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700">
                                        {cls.enrollments.length}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setActiveTab("lecturers")}
                                    className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${
                                        activeTab === "lecturers"
                                            ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
                                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                    }`}
                                >
                                    <AcademicCapIcon size={18} />
                                    <span>Giảng viên lớp</span>
                                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700">
                                        {cls.lecturers.length}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Tab 1: Students */}
                        {activeTab === "students" && (
                            <section className="space-y-4">
                                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900">
                                            Học viên trong lớp ({cls.enrollments.length})
                                        </h2>
                                        <p className="text-xs text-slate-500">
                                            Danh sách học viên đã ghi danh vào đợt học này.
                                        </p>
                                    </div>

                                    {canManage && (
                                        <Button
                                            onClick={() => setIsEnrollModalOpen(true)}
                                            className="shadow-sm"
                                        >
                                            <PlusIcon size={16} />
                                            <span>Ghi danh học viên</span>
                                        </Button>
                                    )}
                                </div>

                                {cls.enrollments.length === 0 ? (
                                    <EmptyState
                                        icon={<UsersIcon size={28} />}
                                        title="Chưa có học viên"
                                        description="Lớp học hiện chưa có học viên ghi danh (hoặc nếu là học viên, bạn chỉ xem được ghi danh của chính mình)."
                                    />
                                ) : (
                                    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-slate-200 text-sm">
                                                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                                                    <tr>
                                                        <th className="px-5 py-3.5">Học viên</th>
                                                        <th className="px-5 py-3.5">Email</th>
                                                        <th className="px-5 py-3.5">Trạng thái</th>
                                                        <th className="px-5 py-3.5">Ngày ghi danh</th>
                                                        {canManage && (
                                                            <th className="px-5 py-3.5 text-right">Thao tác</th>
                                                        )}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 bg-white">
                                                    {cls.enrollments.map((e) => (
                                                        <tr key={e.id} className="hover:bg-slate-50/80 transition">
                                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-50 font-bold text-xs text-indigo-700 shrink-0">
                                                                        {e.studentName.slice(0, 2).toUpperCase()}
                                                                    </div>
                                                                    <span className="font-semibold text-slate-900">
                                                                        {e.studentName}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                                                                {e.studentEmail}
                                                            </td>
                                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                                <StatusBadge value={e.status} />
                                                            </td>
                                                            <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                                                                {new Date(e.enrolledAt).toLocaleDateString("vi-VN")}
                                                            </td>
                                                            {canManage && (
                                                                <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                                                    <Button
                                                                        variant="ghost"
                                                                        onClick={() => {
                                                                            if (window.confirm(`Hủy ghi danh học viên ${e.studentName}?`)) {
                                                                                void run(() => unenroll(e.id), "Không hủy được ghi danh.");
                                                                            }
                                                                        }}
                                                                        className="text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                                                                    >
                                                                        Hủy ghi danh
                                                                    </Button>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </section>
                        )}

                        {/* Tab 2: Lecturers */}
                        {activeTab === "lecturers" && (
                            <section className="space-y-4">
                                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900">
                                            Giảng viên phụ trách lớp ({cls.lecturers.length})
                                        </h2>
                                        <p className="text-xs text-slate-500">
                                            Giảng viên chịu trách nhiệm đứng lớp và quản lý học viên lớp này.
                                        </p>
                                    </div>

                                    {hasRole("Admin") && (
                                        <Button
                                            onClick={() => setIsAssignModalOpen(true)}
                                            className="shadow-sm"
                                        >
                                            <PlusIcon size={16} />
                                            <span>Phân công giảng viên</span>
                                        </Button>
                                    )}
                                </div>

                                {cls.lecturers.length === 0 ? (
                                    <EmptyState
                                        icon={<AcademicCapIcon size={28} />}
                                        title="Chưa có giảng viên phụ trách"
                                        description="Lớp học này hiện chưa được chỉ định giảng viên đứng lớp."
                                    />
                                ) : (
                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        {cls.lecturers.map((lec) => (
                                            <div
                                                key={lec.id}
                                                className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 font-bold text-sm text-amber-700 shrink-0">
                                                        {lec.fullName.slice(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <p className="font-semibold text-sm text-slate-900 leading-tight truncate">
                                                            {lec.fullName}
                                                        </p>
                                                        <p className="text-xs text-slate-500 truncate">{lec.email}</p>
                                                    </div>
                                                </div>

                                                {hasRole("Admin") && (
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => void run(() => unassignClassLecturer(cls.id, lec.id), "Không gỡ được giảng viên.")}
                                                        className="text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                                                    >
                                                        Gỡ
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        )}
                    </>
                )}
            </div>

            {/* Modal: Edit Class Information */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => !saving && setIsEditModalOpen(false)}
                title="Chỉnh sửa thông tin lớp học"
                description="Cập nhật tên lớp, trạng thái mở ghi danh và giới hạn sĩ số."
            >
                <form onSubmit={handleSaveClass} className="space-y-4">
                    <TextField
                        label="Tên lớp học"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        disabled={saving}
                        autoFocus
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                Trạng thái lớp
                            </label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-500"
                                disabled={saving}
                            >
                                <option value="Draft">Bản nháp (Draft)</option>
                                <option value="Open">Đang mở (Open - cho phép ghi danh)</option>
                                <option value="Closed">Đã đóng (Closed)</option>
                                <option value="Archived">Lưu trữ (Archived)</option>
                            </select>
                        </div>

                        <TextField
                            label="Sĩ số tối đa"
                            type="number"
                            min={1}
                            value={capacity}
                            onChange={(e) => setCapacity(e.target.value)}
                            placeholder="Không giới hạn nếu trống"
                            disabled={saving}
                        />
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsEditModalOpen(false)}
                            disabled={saving}
                        >
                            Hủy
                        </Button>
                        <Button type="submit" loading={saving}>
                            Lưu thông tin lớp
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modal: Enroll Student */}
            <Modal
                isOpen={isEnrollModalOpen}
                onClose={() => setIsEnrollModalOpen(false)}
                title="Ghi danh học viên vào lớp"
                description="Chọn học viên từ hệ thống để thêm vào danh sách lớp."
            >
                <div className="space-y-4">
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Chọn học viên
                        </label>
                        <select
                            value={studentId}
                            onChange={(e) => setStudentId(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-500"
                        >
                            <option value="">-- Chọn học viên từ danh sách --</option>
                            {students
                                .filter((s) => !cls?.enrollments.some((e) => e.studentId === s.id))
                                .map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.fullName} ({s.email})
                                    </option>
                                ))}
                        </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                        <Button variant="secondary" onClick={() => setIsEnrollModalOpen(false)}>
                            Hủy
                        </Button>
                        <Button
                            disabled={!studentId}
                            onClick={() => {
                                void run(async () => {
                                    await enrollInClass(classId, Number(studentId));
                                    setIsEnrollModalOpen(false);
                                    setStudentId("");
                                }, "Không ghi danh được học viên.");
                            }}
                        >
                            Xác nhận ghi danh
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Modal: Assign Lecturer */}
            <Modal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                title="Phân công giảng viên lớp"
                description="Chỉ định giảng viên chịu trách nhiệm giảng dạy lớp học này."
            >
                <div className="space-y-4">
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Chọn giảng viên
                        </label>
                        <select
                            value={assignId}
                            onChange={(e) => setAssignId(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-500"
                        >
                            <option value="">-- Chọn giảng viên từ danh sách --</option>
                            {lecturers
                                .filter((l) => !cls?.lecturers.some((assigned) => assigned.id === l.id))
                                .map((l) => (
                                    <option key={l.id} value={l.id}>
                                        {l.fullName} ({l.email})
                                    </option>
                                ))}
                        </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                        <Button variant="secondary" onClick={() => setIsAssignModalOpen(false)}>
                            Hủy
                        </Button>
                        <Button
                            disabled={!assignId}
                            onClick={() => {
                                void run(async () => {
                                    await assignClassLecturer(classId, Number(assignId));
                                    setIsAssignModalOpen(false);
                                    setAssignId("");
                                }, "Không phân công được giảng viên.");
                            }}
                        >
                            Xác nhận phân công
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Modal: Delete Confirmation */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Xác nhận xóa lớp học"
                description="Hành động này sẽ xóa toàn bộ danh sách ghi danh của học viên trong lớp."
                maxWidth="md"
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                        Bạn có chắc chắn muốn xóa vĩnh viễn lớp học{" "}
                        <strong className="text-slate-900">"{cls?.name}"</strong> không?
                    </p>
                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                        <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
                            Hủy
                        </Button>
                        <Button
                            variant="danger"
                            onClick={() => {
                                void run(async () => {
                                    await deleteClass(classId);
                                    navigate("/classes");
                                }, "Không xóa được lớp học.");
                            }}
                        >
                            Xác nhận xóa
                        </Button>
                    </div>
                </div>
            </Modal>
        </AppLayout>
    );
}
