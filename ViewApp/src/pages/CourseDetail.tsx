import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    assignCourseLecturer,
    deleteCourse,
    getCourse,
    listCategories,
    lookupUsers,
    unassignCourseLecturer,
    updateCourse,
    updateCourseStatus,
} from "../api/lms";
import CourseCurriculum from "../components/CourseCurriculum";
import type { Category, CourseDetail as CourseDetailType, UserSummary } from "../api/lms";
import { getApiErrorMessages } from "../api/errors";
import { useAuth } from "../hooks/useAuth";
import AppLayout from "../components/layout/AppLayout";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import TextField from "../components/ui/TextField";
import { Spinner } from "../components/ui/Spinner";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/ui/Modal";
import {
    AcademicCapIcon,
    BookOpenIcon,
    ChevronRightIcon,
    EditIcon,
    PlusIcon,
    TrashIcon,
    UsersIcon,
} from "../components/ui/icons";

export default function CourseDetail() {
    const { id } = useParams();
    const courseId = Number(id);
    const navigate = useNavigate();
    const { hasRole, user } = useAuth();

    const [course, setCourse] = useState<CourseDetailType | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [lecturers, setLecturers] = useState<UserSummary[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [reloadKey, setReloadKey] = useState(0);

    const [activeTab, setActiveTab] = useState<"curriculum" | "lecturers">("curriculum");

    // Modal state for editing course
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [level, setLevel] = useState("Beginner");
    const [categoryId, setCategoryId] = useState("");
    const [saving, setSaving] = useState(false);

    // Modal state for assigning lecturer & delete
    const [assignId, setAssignId] = useState("");
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const canManage =
        hasRole("Admin") ||
        (!!course && !!user && course.lecturers.some((l) => l.id === user.id));

    useEffect(() => {
        let cancelled = false;
        if (!Number.isFinite(courseId)) return;
        getCourse(courseId)
            .then(({ data }) => {
                if (cancelled) return;
                setCourse(data);
                setTitle(data.title);
                setDescription(data.description ?? "");
                setLevel(data.level);
                setCategoryId(data.categoryId ? String(data.categoryId) : "");
                setErrors([]);
            })
            .catch((error) => {
                if (!cancelled) setErrors(getApiErrorMessages(error, "Không tải được khóa học."));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [courseId, reloadKey]);

    useEffect(() => {
        listCategories()
            .then(({ data }) => setCategories(data))
            .catch(() => undefined);
        if (hasRole("Admin")) {
            lookupUsers({ role: "Lecturer" })
                .then(({ data }) => setLecturers(data))
                .catch(() => undefined);
        }
    }, [hasRole]);

    const reload = () => {
        setLoading(true);
        setReloadKey((k) => k + 1);
    };

    const handleSaveCourse = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateCourse(courseId, {
                title: title.trim(),
                description: description.trim() || undefined,
                level,
                categoryId: Number(categoryId),
            });
            setIsEditModalOpen(false);
            reload();
        } catch (error) {
            setErrors(getApiErrorMessages(error, "Không lưu được khóa học."));
        } finally {
            setSaving(false);
        }
    };

    const run = async (action: () => Promise<unknown>, fallback: string) => {
        try {
            await action();
            reload();
        } catch (error) {
            setErrors(getApiErrorMessages(error, fallback));
        }
    };

    if (!Number.isFinite(courseId)) {
        return (
            <AppLayout>
                <Alert messages={["Khóa học không hợp lệ."]} />
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="space-y-6">
                {/* Breadcrumbs */}
                <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 whitespace-nowrap overflow-x-auto py-1">
                    <Link to="/courses" className="hover:text-indigo-600 transition shrink-0">
                        Khóa học
                    </Link>
                    <ChevronRightIcon size={12} className="text-slate-400 shrink-0" />
                    <span className="text-slate-800 truncate max-w-md">
                        {course?.title || "Chi tiết khóa học"}
                    </span>
                </nav>

                <Alert messages={errors} />

                {loading && !course ? (
                    <div className="flex flex-col items-center justify-center py-20 text-indigo-600">
                        <Spinner className="size-8" />
                        <p className="mt-3 text-xs text-slate-400">Đang tải thông tin khóa học...</p>
                    </div>
                ) : !course ? (
                    <p className="text-sm text-slate-500">Không tìm thấy khóa học.</p>
                ) : (
                    <>
                        {/* Course Header Banner */}
                        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
                            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
                                <div className="space-y-3 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="whitespace-nowrap rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                                            {course.categoryName || "Chưa phân loại"}
                                        </span>
                                        <StatusBadge value={course.level} />
                                        <StatusBadge value={course.status} />
                                    </div>

                                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl leading-snug">
                                        {course.title}
                                    </h1>

                                    {course.description && (
                                        <p className="max-w-3xl text-sm text-slate-600 leading-relaxed">
                                            {course.description}
                                        </p>
                                    )}

                                    {/* Lecturer Pills */}
                                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-500">
                                        <span className="font-semibold text-slate-700 whitespace-nowrap">
                                            Giảng viên:
                                        </span>
                                        {course.lecturers.length === 0 ? (
                                            <span className="italic text-slate-400 whitespace-nowrap">
                                                Chưa chỉ định giảng viên
                                            </span>
                                        ) : (
                                            course.lecturers.map((lec) => (
                                                <span
                                                    key={lec.id}
                                                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-800"
                                                >
                                                    <span className="size-1.5 rounded-full bg-indigo-500" />
                                                    {lec.fullName}
                                                </span>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Header Actions */}
                                <div className="flex flex-wrap items-center gap-2 self-start shrink-0">
                                    <Link
                                        to={`/classes?courseId=${course.id}`}
                                        className="h-9 inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
                                    >
                                        <AcademicCapIcon size={16} />
                                        <span>Xem các lớp của khóa</span>
                                    </Link>

                                    {canManage && (
                                        <Button
                                            variant="secondary"
                                            size="md"
                                            onClick={() => setIsEditModalOpen(true)}
                                        >
                                            <EditIcon size={15} />
                                            <span>Chỉnh sửa thông tin</span>
                                        </Button>
                                    )}

                                    {canManage && (
                                        <>
                                            {course.status !== "Published" && (
                                                <Button
                                                    variant="secondary"
                                                    size="md"
                                                    onClick={() => void run(() => updateCourseStatus(course.id, "Published"), "Không xuất bản được.")}
                                                >
                                                    Xuất bản
                                                </Button>
                                            )}
                                            {course.status === "Published" && (
                                                <Button
                                                    variant="secondary"
                                                    size="md"
                                                    onClick={() => void run(() => updateCourseStatus(course.id, "Archived"), "Không lưu trữ được.")}
                                                >
                                                    Lưu trữ
                                                </Button>
                                            )}
                                            {course.status === "Archived" && (
                                                <Button
                                                    variant="secondary"
                                                    size="md"
                                                    onClick={() => void run(() => updateCourseStatus(course.id, "Draft"), "Không chuyển nháp được.")}
                                                >
                                                    Chuyển về Nháp
                                                </Button>
                                            )}
                                        </>
                                    )}

                                    {hasRole("Admin") && (
                                        <Button
                                            variant="danger"
                                            size="icon"
                                            onClick={() => setIsDeleteModalOpen(true)}
                                            title="Xóa khóa học"
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
                                    onClick={() => setActiveTab("curriculum")}
                                    className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${
                                        activeTab === "curriculum"
                                            ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
                                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                    }`}
                                >
                                    <BookOpenIcon size={18} />
                                    <span>Chương trình & Bài giảng</span>
                                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700">
                                        {course.chapters.length}
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
                                    <UsersIcon size={18} />
                                    <span>Giảng viên</span>
                                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700">
                                        {course.lecturers.length}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Tab 1: Curriculum */}
                        {activeTab === "curriculum" && (
                            <CourseCurriculum course={course} canManage={canManage} run={run} />
                        )}

                        {/* Tab 2: Lecturers */}
                        {activeTab === "lecturers" && (
                            <div className="space-y-6">
                                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900">
                                            Danh sách giảng viên phụ trách
                                        </h2>
                                        <p className="text-xs text-slate-500">
                                            Giảng viên được phân công có quyền biên soạn giáo trình và bài giảng cho khóa này.
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

                                {course.lecturers.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                                        Chưa có giảng viên nào được phân công quản lý khóa học này.
                                    </div>
                                ) : (
                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        {course.lecturers.map((lec) => (
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
                                                        onClick={() => void run(() => unassignCourseLecturer(course.id, lec.id), "Không gỡ được giảng viên.")}
                                                        className="text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                                                    >
                                                        Gỡ
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modal: Edit Course Information */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => !saving && setIsEditModalOpen(false)}
                title="Chỉnh sửa thông tin khóa học"
                description="Cập nhật tiêu đề, mô tả, trình độ và danh mục đào tạo của khóa học."
            >
                <form onSubmit={handleSaveCourse} className="space-y-4">
                    <TextField
                        label="Tên khóa học"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Tên khóa học..."
                        required
                        disabled={saving}
                        autoFocus
                    />

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Mô tả chi tiết
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Mô tả mục tiêu, đối tượng, kết quả đạt được..."
                            className="min-h-28 w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            disabled={saving}
                        />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                Trình độ
                            </label>
                            <select
                                value={level}
                                onChange={(e) => setLevel(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-500"
                                disabled={saving}
                            >
                                <option value="Beginner">Cơ bản (Beginner)</option>
                                <option value="Intermediate">Trung cấp (Intermediate)</option>
                                <option value="Advanced">Nâng cao (Advanced)</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                Danh mục
                            </label>
                            <select
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-500"
                                disabled={saving}
                                required
                            >
                                <option value="">Chọn danh mục</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsEditModalOpen(false)}
                            disabled={saving}
                        >
                            Hủy
                        </Button>
                        <Button type="submit" loading={saving}>
                            Lưu thông tin
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modal: Assign Lecturer */}
            <Modal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                title="Phân công giảng viên"
                description="Chọn giảng viên chịu trách nhiệm biên soạn và giảng dạy khóa học."
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
                                .filter((l) => !course?.lecturers.some((assigned) => assigned.id === l.id))
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
                                    await assignCourseLecturer(courseId, Number(assignId));
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
                title="Xác nhận xóa khóa học"
                description="Hành động này sẽ xóa toàn bộ chương học, bài học và tài liệu liên quan."
                maxWidth="md"
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                        Bạn có chắc chắn muốn xóa vĩnh viễn khóa học{" "}
                        <strong className="text-slate-900">"{course?.title}"</strong> không?
                    </p>
                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                        <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
                            Hủy
                        </Button>
                        <Button
                            variant="danger"
                            onClick={() => {
                                void run(async () => {
                                    await deleteCourse(courseId);
                                    navigate("/courses");
                                }, "Không xóa được khóa học.");
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
