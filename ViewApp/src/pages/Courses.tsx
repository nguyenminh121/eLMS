import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import {
    createCategory,
    createCourse,
    deleteCategory,
    listCategories,
    listCourses,
    updateCategory,
} from "../api/lms";
import type { Category, CourseListItem } from "../api/lms";
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
    ChevronRightIcon,
    EditIcon,
    FolderIcon,
    PlusIcon,
    SearchIcon,
    TrashIcon,
} from "../components/ui/icons";

// ---------------------------------------------------------------------------
// Category Management Modal (inline, Admin-only)
// ---------------------------------------------------------------------------
interface CategoryManagerProps {
    isOpen: boolean;
    onClose: () => void;
    onCategoriesChanged: (updated: Category[]) => void;
}

function CategoryManager({ isOpen, onClose, onCategoriesChanged }: CategoryManagerProps) {
    const [items, setItems] = useState<Category[]>([]);
    const [search, setSearch] = useState("");
    const [errors, setErrors] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [reloadKey, setReloadKey] = useState(0);

    // Form state
    const [formOpen, setFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [name, setName] = useState("");
    const [desc, setDesc] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        listCategories()
            .then(({ data }) => {
                if (cancelled) return;
                setItems(data);
                setErrors([]);
                onCategoriesChanged(data);
            })
            .catch((err) => {
                if (!cancelled) setErrors(getApiErrorMessages(err, "Không tải được danh mục."));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, reloadKey]);

    const reload = () => {
        setLoading(true);
        setReloadKey((k) => k + 1);
    };

    const startCreate = () => {
        setEditingId(null);
        setName("");
        setDesc("");
        setFormOpen(true);
    };

    const startEdit = (item: Category) => {
        setEditingId(item.id);
        setName(item.name);
        setDesc(item.description ?? "");
        setFormOpen(true);
    };

    const resetForm = () => {
        setFormOpen(false);
        setEditingId(null);
        setName("");
        setDesc("");
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setErrors([]);
        try {
            if (editingId) {
                await updateCategory(editingId, { name: name.trim(), description: desc.trim() || undefined });
            } else {
                await createCategory({ name: name.trim(), description: desc.trim() || undefined });
            }
            resetForm();
            reload();
        } catch (err) {
            setErrors(getApiErrorMessages(err, "Không lưu được danh mục."));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Xóa danh mục này? Các khóa học thuộc danh mục này sẽ bị ảnh hưởng.")) return;
        try {
            await deleteCategory(id);
            reload();
        } catch (err) {
            setErrors(getApiErrorMessages(err, "Không xóa được danh mục."));
        }
    };

    const filtered = items.filter(
        (c) =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Quản lý danh mục"
            description="Phân loại khóa học theo lĩnh vực và chủ đề đào tạo."
            maxWidth="2xl"
        >
            <div className="space-y-4">
                <Alert messages={errors} />

                {/* Search + Add */}
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <SearchIcon
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Tìm kiếm danh mục..."
                            className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>
                    {!formOpen && (
                        <Button size="sm" onClick={startCreate}>
                            <PlusIcon size={15} />
                            <span className="whitespace-nowrap">Thêm danh mục</span>
                        </Button>
                    )}
                </div>

                {/* Inline create/edit form */}
                {formOpen && (
                    <form
                        onSubmit={(e) => void handleSubmit(e)}
                        className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-3"
                    >
                        <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                            {editingId ? "Chỉnh sửa danh mục" : "Danh mục mới"}
                        </p>
                        <TextField
                            label="Tên danh mục"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ví dụ: Công nghệ thông tin, Thiết kế đồ họa..."
                            required
                            disabled={saving}
                            autoFocus
                        />
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Mô tả (tùy chọn)
                            </label>
                            <textarea
                                value={desc}
                                onChange={(e) => setDesc(e.target.value)}
                                placeholder="Phạm vi hoặc chủ đề của danh mục..."
                                rows={2}
                                className="w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                disabled={saving}
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" size="sm" variant="secondary" onClick={resetForm} disabled={saving}>
                                Hủy
                            </Button>
                            <Button type="submit" size="sm" loading={saving}>
                                {editingId ? "Lưu thay đổi" : "Tạo danh mục"}
                            </Button>
                        </div>
                    </form>
                )}

                {/* List */}
                {loading ? (
                    <div className="flex justify-center py-10 text-indigo-600">
                        <Spinner className="size-6" />
                    </div>
                ) : filtered.length === 0 ? (
                    <EmptyState
                        icon={<FolderIcon size={24} />}
                        title="Không có danh mục nào"
                        description={
                            search
                                ? "Không tìm thấy danh mục phù hợp."
                                : "Chưa có danh mục nào. Hãy thêm danh mục đầu tiên."
                        }
                    />
                ) : (
                    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                        {filtered.map((item) => (
                            <div
                                key={item.id}
                                className="group flex items-center gap-3 bg-white px-4 py-3 hover:bg-slate-50 transition"
                            >
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                    <FolderIcon size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-900">
                                        {item.name}
                                    </p>
                                    {item.description && (
                                        <p className="truncate text-xs text-slate-500">
                                            {item.description}
                                        </p>
                                    )}
                                </div>
                                <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                    <button
                                        type="button"
                                        onClick={() => startEdit(item)}
                                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition"
                                        title="Chỉnh sửa"
                                    >
                                        <EditIcon size={15} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void handleDelete(item.id)}
                                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                                        title="Xóa danh mục"
                                    >
                                        <TrashIcon size={15} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex justify-end border-t border-slate-100 pt-3">
                    <Button size="sm" variant="secondary" onClick={onClose}>
                        Đóng
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// ---------------------------------------------------------------------------
// Main Courses Page
// ---------------------------------------------------------------------------
export default function Courses() {
    const { hasRole } = useAuth();
    const isAdmin = hasRole("Admin");

    const [courses, setCourses] = useState<CourseListItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [query, setQuery] = useState({ search: "", status: "", categoryId: "" });
    const [errors, setErrors] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    // Create Course Modal state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [level, setLevel] = useState("Beginner");
    const [categoryId, setCategoryId] = useState("");
    const [saving, setSaving] = useState(false);

    // Category Manager Modal state
    const [isCatManagerOpen, setIsCatManagerOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;
        listCategories()
            .then(({ data }) => {
                if (!cancelled) setCategories(data);
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        listCourses({
            search: query.search || undefined,
            status: query.status || undefined,
            categoryId: query.categoryId ? Number(query.categoryId) : undefined,
        })
            .then(({ data }) => {
                if (cancelled) return;
                setCourses(data);
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
    }, [query]);

    const handleSearch = (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setQuery({ search: search.trim(), status, categoryId: selectedCategory });
    };

    const handleResetFilter = () => {
        setSearch("");
        setStatus("");
        setSelectedCategory("");
        setLoading(true);
        setQuery({ search: "", status: "", categoryId: "" });
    };

    const handleCreate = async (asDraft: boolean) => {
        if (!title.trim() || !categoryId) return;
        setSaving(true);
        setErrors([]);
        try {
            await createCourse({
                title: title.trim(),
                description: description.trim() || undefined,
                level,
                categoryId: Number(categoryId),
                status: asDraft ? "Draft" : "Published",
            });
            setTitle("");
            setDescription("");
            setCategoryId("");
            setIsCreateOpen(false);
            setLoading(true);
            setQuery({ ...query });
        } catch (error) {
            setErrors(getApiErrorMessages(error, "Không tạo được khóa học."));
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
                            Khóa học
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Danh mục chương trình đào tạo, nội dung bài giảng và tài liệu học tập.
                        </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        {isAdmin && (
                            <Button
                                variant="secondary"
                                onClick={() => setIsCatManagerOpen(true)}
                            >
                                <FolderIcon size={16} />
                                <span className="whitespace-nowrap">Danh mục</span>
                            </Button>
                        )}
                        {isAdmin && (
                            <Button
                                onClick={() => setIsCreateOpen(true)}
                                className="shadow-md shadow-indigo-200"
                            >
                                <PlusIcon size={18} />
                                <span className="whitespace-nowrap">Tạo khóa học</span>
                            </Button>
                        )}
                    </div>
                </div>

                <Alert messages={errors} />

                {/* Filter and Search Bar */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                    <form onSubmit={handleSearch} className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <div className="relative flex-1">
                            <SearchIcon
                                size={18}
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Tìm theo tên khóa học hoặc nội dung..."
                                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-500"
                            >
                                <option value="">Tất cả danh mục</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-500"
                            >
                                <option value="">Tất cả trạng thái</option>
                                <option value="Draft">Bản nháp</option>
                                <option value="Published">Đã xuất bản</option>
                                <option value="Archived">Lưu trữ</option>
                            </select>

                            <Button type="submit" loading={loading}>
                                Lọc
                            </Button>

                            {(search || status || selectedCategory) && (
                                <Button variant="ghost" onClick={handleResetFilter}>
                                    Xóa lọc
                                </Button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Courses List Grid */}
                {loading && courses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-indigo-600">
                        <Spinner className="size-8" />
                        <p className="mt-3 text-xs text-slate-400">Đang tải danh sách khóa học...</p>
                    </div>
                ) : courses.length === 0 ? (
                    <EmptyState
                        icon={<BookOpenIcon size={28} />}
                        title="Không tìm thấy khóa học"
                        description="Chưa có khóa học nào khớp với điều kiện tìm kiếm của bạn. Hãy thử thay đổi bộ lọc hoặc thêm khóa học mới."
                        action={
                            isAdmin ? (
                                <Button onClick={() => setIsCreateOpen(true)}>
                                    <PlusIcon size={16} />
                                    <span>Tạo khóa học ngay</span>
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {courses.map((course) => (
                            <Link
                                key={course.id}
                                to={`/courses/${course.id}`}
                                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-50/50"
                            >
                                {/* Decorative Header Gradient */}
                                <div className="h-3 bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 opacity-90 transition group-hover:h-3.5" />

                                <div className="flex flex-1 flex-col justify-between p-5">
                                    <div className="space-y-3">
                                        {/* Status and Category Chips */}
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="inline-flex items-center whitespace-nowrap rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                                                {course.categoryName || "Chưa phân loại"}
                                            </span>
                                            <div className="flex shrink-0 items-center gap-1.5">
                                                <StatusBadge value={course.level} />
                                                <StatusBadge value={course.status} />
                                            </div>
                                        </div>

                                        {/* Title */}
                                        <h2 className="line-clamp-2 text-base font-bold leading-snug text-slate-900 transition group-hover:text-indigo-600">
                                            {course.title}
                                        </h2>

                                        {/* Description */}
                                        <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">
                                            {course.description || "Chưa có mô tả chi tiết cho khóa học này."}
                                        </p>
                                    </div>

                                    {/* Footer Meta */}
                                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
                                        <div className="flex items-center gap-3 whitespace-nowrap">
                                            <span className="flex items-center gap-1" title="Số chương học">
                                                <BookOpenIcon size={14} className="text-indigo-500" />
                                                <span>{course.chapterCount} chương</span>
                                            </span>
                                            <span className="flex items-center gap-1" title="Số lớp đang mở">
                                                <AcademicCapIcon size={14} className="text-sky-500" />
                                                <span>{course.classCount} lớp</span>
                                            </span>
                                        </div>

                                        <span className="inline-flex items-center gap-0.5 whitespace-nowrap font-semibold text-indigo-600 transition group-hover:translate-x-0.5">
                                            Chi tiết
                                            <ChevronRightIcon size={14} />
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Course Modal */}
            <Modal
                isOpen={isCreateOpen}
                onClose={() => !saving && setIsCreateOpen(false)}
                title="Tạo khóa học mới"
                description="Thiết lập thông tin cơ bản cho khóa học đào tạo mới."
            >
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        void handleCreate(false);
                    }}
                    className="space-y-4"
                >
                    <TextField
                        label="Tên khóa học"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ví dụ: Nhập môn Lập trình Web với React"
                        required
                        disabled={saving}
                        autoFocus
                    />

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Mô tả ngắn
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Tổng quan về nội dung, mục tiêu đào tạo của khóa..."
                            className="min-h-24 w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
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
                                <option value="">Chọn danh mục phù hợp</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
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
                            Xuất bản khóa học
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Category Manager Modal (Admin only) */}
            {isAdmin && (
                <CategoryManager
                    isOpen={isCatManagerOpen}
                    onClose={() => setIsCatManagerOpen(false)}
                    onCategoriesChanged={setCategories}
                />
            )}
        </AppLayout>
    );
}
