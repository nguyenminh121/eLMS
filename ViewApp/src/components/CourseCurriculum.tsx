import { useState } from "react";
import type { FormEvent } from "react";
import {
    createChapter,
    createLesson,
    createMaterial,
    deleteChapter,
    deleteLesson,
    deleteMaterial,
    isStoredMedia,
    openStoredFile,
    updateChapter,
    updateLesson,
    uploadLessonVideo,
    uploadMaterial,
} from "../api/lms";
import type { Chapter, CourseDetail, Lesson, Material } from "../api/lms";
import Button from "./ui/Button";
import TextField from "./ui/TextField";
import LessonMedia from "./LessonMedia";
import Modal from "./ui/Modal";
import EmptyState from "./ui/EmptyState";
import {
    BookOpenIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    ClockIcon,
    DocumentIcon,
    DownloadIcon,
    EditIcon,
    FileIcon,
    LinkIcon,
    PlusIcon,
    TrashIcon,
    VideoIcon,
} from "./ui/icons";

interface Props {
    course: CourseDetail;
    canManage: boolean;
    run: (action: () => Promise<unknown>, fallback: string) => Promise<void>;
}

export default function CourseCurriculum({ course, canManage, run }: Props) {
    const [openLessonId, setOpenLessonId] = useState<number | null>(null);

    // Modal state for Add Chapter
    const [isAddChapterOpen, setIsAddChapterOpen] = useState(false);
    const [newChapterTitle, setNewChapterTitle] = useState("");
    const [addingChapter, setAddingChapter] = useState(false);

    // Modal state for Edit Chapter Title
    const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
    const [editChapterTitle, setEditChapterTitle] = useState("");
    const [savingChapter, setSavingChapter] = useState(false);

    // Modal state for Add Lesson
    const [isAddLessonOpen, setIsAddLessonOpen] = useState(false);
    const [lessonChapterId, setLessonChapterId] = useState("");
    const [lessonTitle, setLessonTitle] = useState("");
    const [lessonContent, setLessonContent] = useState("");
    const [lessonVideoUrl, setLessonVideoUrl] = useState("");
    const [lessonDuration, setLessonDuration] = useState("");
    const [addingLesson, setAddingLesson] = useState(false);

    // Modal state for Edit Lesson
    const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

    // Modal state for Add Material
    const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
    const [materialTitle, setMaterialTitle] = useState("");
    const [materialUrl, setMaterialUrl] = useState("");
    const [materialType, setMaterialType] = useState("Link");
    const [materialLessonId, setMaterialLessonId] = useState("");
    const [materialMode, setMaterialMode] = useState<"link" | "file">("file");
    const [materialFile, setMaterialFile] = useState<File | null>(null);
    const [addingMaterial, setAddingMaterial] = useState(false);

    const lessons = course.chapters.flatMap((c) => c.lessons);

    const materialsFor = (lessonId?: number) =>
        course.materials.filter((m) => (lessonId ? m.lessonId === lessonId : !m.lessonId));

    const openAddLessonForChapter = (chapterId: number) => {
        setLessonChapterId(String(chapterId));
        setIsAddLessonOpen(true);
    };

    const handleCreateChapter = async (e: FormEvent) => {
        e.preventDefault();
        if (!newChapterTitle.trim()) return;
        setAddingChapter(true);
        try {
            await run(async () => {
                await createChapter(course.id, { title: newChapterTitle.trim() });
                setNewChapterTitle("");
                setIsAddChapterOpen(false);
            }, "Không thêm được chương.");
        } finally {
            setAddingChapter(false);
        }
    };

    const handleUpdateChapter = async (e: FormEvent) => {
        e.preventDefault();
        if (!editingChapter || !editChapterTitle.trim()) return;
        setSavingChapter(true);
        try {
            await run(async () => {
                await updateChapter(editingChapter.id, { title: editChapterTitle.trim() });
                setEditingChapter(null);
            }, "Không đổi được tên chương.");
        } finally {
            setSavingChapter(false);
        }
    };

    const handleCreateLesson = async (e: FormEvent) => {
        e.preventDefault();
        setAddingLesson(true);
        try {
            await run(async () => {
                await createLesson(Number(lessonChapterId || course.chapters[0]?.id), {
                    title: lessonTitle.trim(),
                    content: lessonContent.trim() || undefined,
                    videoUrl: lessonVideoUrl.trim() || undefined,
                    durationSeconds: lessonDuration ? Number(lessonDuration) : undefined,
                });
                setLessonTitle("");
                setLessonContent("");
                setLessonVideoUrl("");
                setLessonDuration("");
                setIsAddLessonOpen(false);
            }, "Không thêm được bài học.");
        } finally {
            setAddingLesson(false);
        }
    };

    const handleCreateMaterial = async (e: FormEvent) => {
        e.preventDefault();
        setAddingMaterial(true);
        const lessonId = materialLessonId ? Number(materialLessonId) : undefined;
        try {
            if (materialMode === "file") {
                const fileToUpload = materialFile;
                if (!fileToUpload) return;
                await run(async () => {
                    await uploadMaterial(course.id, {
                        title: materialTitle.trim(),
                        file: fileToUpload,
                        lessonId,
                    });
                    setMaterialFile(null);
                    setMaterialTitle("");
                    setIsAddMaterialOpen(false);
                }, "Không thêm được học liệu.");
            } else {
                await run(async () => {
                    await createMaterial(course.id, {
                        title: materialTitle.trim(),
                        url: materialUrl.trim(),
                        type: materialType,
                        lessonId,
                    });
                    setMaterialUrl("");
                    setMaterialTitle("");
                    setIsAddMaterialOpen(false);
                }, "Không thêm được học liệu.");
            }
        } finally {
            setAddingMaterial(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Chapters and Lessons Section */}
            <section className="space-y-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">
                            Cấu trúc chương trình học
                        </h2>
                        <p className="text-xs text-slate-500 whitespace-nowrap">
                            {course.chapters.length} chương · {lessons.length} bài học
                        </p>
                    </div>

                    {canManage && (
                        <Button
                            onClick={() => setIsAddChapterOpen(true)}
                            className="shadow-sm"
                        >
                            <PlusIcon size={16} />
                            <span>Thêm chương</span>
                        </Button>
                    )}
                </div>

                {course.chapters.length === 0 ? (
                    <EmptyState
                        icon={<BookOpenIcon size={28} />}
                        title="Chưa có chương học nào"
                        description="Khóa học hiện chưa có nội dung giáo trình. Hãy thêm chương đầu tiên để bắt đầu xây dựng bài học."
                        action={
                            canManage ? (
                                <Button onClick={() => setIsAddChapterOpen(true)}>
                                    <PlusIcon size={16} />
                                    <span>Thêm chương học đầu tiên</span>
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <div className="space-y-4">
                        {course.chapters.map((chapter, chapterIndex) => {
                            const totalDuration = chapter.lessons.reduce(
                                (acc, l) => acc + (l.durationSeconds || 0),
                                0
                            );

                            return (
                                <div
                                    key={chapter.id}
                                    className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:border-slate-300"
                                >
                                    {/* Chapter Bar */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 p-4">
                                        <div className="flex flex-1 items-center gap-3">
                                            <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-600 font-bold text-xs text-white shrink-0">
                                                {chapterIndex + 1}
                                            </span>

                                            <div className="flex items-baseline gap-2">
                                                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                                                    {chapter.title}
                                                </h3>
                                                <span className="text-xs text-slate-400 whitespace-nowrap">
                                                    ({chapter.lessons.length} bài
                                                    {totalDuration > 0
                                                        ? ` · ${Math.round(totalDuration / 60)} phút`
                                                        : ""}
                                                    )
                                                </span>
                                            </div>
                                        </div>

                                        {canManage && (
                                            <div className="flex items-center gap-1 shrink-0">
                                                <Button
                                                    variant="secondary"
                                                    onClick={() => openAddLessonForChapter(chapter.id)}
                                                    className="py-1 px-2.5 text-xs"
                                                >
                                                    <PlusIcon size={14} />
                                                    <span>Thêm bài</span>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => {
                                                        setEditingChapter(chapter);
                                                        setEditChapterTitle(chapter.title);
                                                    }}
                                                    className="p-1.5 text-slate-500 hover:text-slate-800"
                                                    title="Đổi tên chương"
                                                >
                                                    <EditIcon size={16} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => {
                                                        if (window.confirm("Xóa chương này và tất cả bài học bên trong?")) {
                                                            void run(() => deleteChapter(chapter.id), "Không xóa được chương.");
                                                        }
                                                    }}
                                                    className="p-1.5 text-slate-500 hover:text-red-600"
                                                    title="Xóa chương"
                                                >
                                                    <TrashIcon size={16} />
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Lessons List in Chapter */}
                                    <div className="p-3 sm:p-4">
                                        {chapter.lessons.length === 0 ? (
                                            <div className="py-6 text-center text-xs text-slate-400">
                                                Chưa có bài học trong chương này.
                                                {canManage && (
                                                    <button
                                                        type="button"
                                                        onClick={() => openAddLessonForChapter(chapter.id)}
                                                        className="ml-1.5 font-semibold text-indigo-600 hover:underline whitespace-nowrap"
                                                    >
                                                        Thêm bài học ngay
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <ul className="space-y-2.5">
                                                {chapter.lessons.map((lesson, lessonIndex) => {
                                                    const open = openLessonId === lesson.id;
                                                    const attached = materialsFor(lesson.id);

                                                    return (
                                                        <li
                                                            key={lesson.id}
                                                            className={`overflow-hidden rounded-xl border transition ${
                                                                open
                                                                    ? "border-indigo-200 bg-indigo-50/20 shadow-sm"
                                                                    : "border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300"
                                                            }`}
                                                        >
                                                            {/* Lesson Header Row */}
                                                            <button
                                                                type="button"
                                                                className="flex w-full items-center justify-between p-3 text-left transition"
                                                                onClick={() => setOpenLessonId(open ? null : lesson.id)}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div
                                                                        className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                                                                            lesson.videoUrl
                                                                                ? "bg-sky-100 text-sky-700"
                                                                                : "bg-slate-200 text-slate-700"
                                                                        }`}
                                                                    >
                                                                        {lesson.videoUrl ? (
                                                                            <VideoIcon size={16} />
                                                                        ) : (
                                                                            <DocumentIcon size={16} />
                                                                        )}
                                                                    </div>

                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">
                                                                                Bài {chapterIndex + 1}.{lessonIndex + 1}
                                                                            </span>
                                                                            <p className="text-sm font-semibold text-slate-900">
                                                                                {lesson.title}
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 text-[11px] text-slate-500 whitespace-nowrap">
                                                                            {lesson.durationSeconds ? (
                                                                                <span className="flex items-center gap-1">
                                                                                    <ClockIcon size={12} />
                                                                                    {Math.round(lesson.durationSeconds / 60)} phút
                                                                                </span>
                                                                            ) : null}
                                                                            {attached.length > 0 && (
                                                                                <span>• {attached.length} tài liệu</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
                                                                    <span className="text-xs font-medium text-indigo-600">
                                                                        {open ? "Thu gọn" : "Chi tiết"}
                                                                    </span>
                                                                    {open ? (
                                                                        <ChevronDownIcon size={16} className="text-indigo-600" />
                                                                    ) : (
                                                                        <ChevronRightIcon size={16} className="text-slate-400" />
                                                                    )}
                                                                </div>
                                                            </button>

                                                            {/* Lesson Expanded Content */}
                                                            {open && (
                                                                <div className="border-t border-slate-200/80 bg-white p-4 space-y-4">
                                                                    {/* Video Content */}
                                                                    {lesson.videoUrl && (
                                                                        <div className="rounded-2xl overflow-hidden bg-slate-950 p-2">
                                                                            <LessonMedia
                                                                                lessonId={lesson.id}
                                                                                videoUrl={lesson.videoUrl}
                                                                            />
                                                                        </div>
                                                                    )}

                                                                    {/* Text / Body Content */}
                                                                    {lesson.content && (
                                                                        <div className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-700 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 border border-slate-200/60">
                                                                            {lesson.content}
                                                                        </div>
                                                                    )}

                                                                    {/* Attached Materials */}
                                                                    {attached.length > 0 && (
                                                                        <div className="space-y-2">
                                                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                                                                Tài liệu đính kèm bài học
                                                                            </h4>
                                                                            <MaterialList
                                                                                items={attached}
                                                                                canManage={canManage}
                                                                                run={run}
                                                                            />
                                                                        </div>
                                                                    )}

                                                                    {/* Lesson Management Buttons */}
                                                                    {canManage && (
                                                                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                                                                            <span className="text-xs text-slate-400">
                                                                                Quản lý bài học:
                                                                            </span>
                                                                            <div className="flex gap-2">
                                                                                <Button
                                                                                    variant="secondary"
                                                                                    onClick={() => setEditingLesson(lesson)}
                                                                                    className="py-1 px-3 text-xs"
                                                                                >
                                                                                    <EditIcon size={14} />
                                                                                    <span>Chỉnh sửa bài học</span>
                                                                                </Button>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    onClick={() => {
                                                                                        if (window.confirm("Xóa bài học này?")) {
                                                                                            void run(
                                                                                                () => deleteLesson(lesson.id),
                                                                                                "Không xóa được bài học."
                                                                                            );
                                                                                        }
                                                                                    }}
                                                                                    className="py-1 px-3 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                                                                                >
                                                                                    <TrashIcon size={14} />
                                                                                    <span>Xóa bài</span>
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Course-Wide Materials Section */}
            <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">
                            Kho học liệu & Tài liệu tham khảo
                        </h2>
                        <p className="text-xs text-slate-500">
                            Các file giáo trình, tài liệu tham khảo chung và liên kết mở rộng cho toàn khóa học.
                        </p>
                    </div>

                    {canManage && (
                        <Button
                            onClick={() => {
                                setMaterialLessonId("");
                                setIsAddMaterialOpen(true);
                            }}
                            className="shadow-sm"
                        >
                            <PlusIcon size={16} />
                            <span>Thêm học liệu</span>
                        </Button>
                    )}
                </div>

                <div className="mt-4">
                    <MaterialList items={materialsFor()} canManage={canManage} run={run} />
                </div>
            </section>

            {/* Modal: Add Chapter */}
            <Modal
                isOpen={isAddChapterOpen}
                onClose={() => !addingChapter && setIsAddChapterOpen(false)}
                title="Thêm chương học mới"
                description="Tạo một chương mục mới để nhóm các bài học trong khóa."
            >
                <form onSubmit={handleCreateChapter} className="space-y-4">
                    <TextField
                        label="Tên chương học"
                        value={newChapterTitle}
                        onChange={(e) => setNewChapterTitle(e.target.value)}
                        placeholder="Ví dụ: Chương 1: Kiến thức nền tảng"
                        required
                        disabled={addingChapter}
                        autoFocus
                    />

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsAddChapterOpen(false)}
                            disabled={addingChapter}
                        >
                            Hủy
                        </Button>
                        <Button type="submit" loading={addingChapter}>
                            Tạo chương học
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modal: Edit Chapter Title */}
            <Modal
                isOpen={!!editingChapter}
                onClose={() => !savingChapter && setEditingChapter(null)}
                title="Đổi tên chương học"
                description="Cập nhật tiêu đề hiển thị của chương mục."
            >
                <form onSubmit={handleUpdateChapter} className="space-y-4">
                    <TextField
                        label="Tiêu đề chương"
                        value={editChapterTitle}
                        onChange={(e) => setEditChapterTitle(e.target.value)}
                        required
                        disabled={savingChapter}
                        autoFocus
                    />

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setEditingChapter(null)}
                            disabled={savingChapter}
                        >
                            Hủy
                        </Button>
                        <Button type="submit" loading={savingChapter}>
                            Lưu thay đổi
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modal: Add Lesson */}
            <Modal
                isOpen={isAddLessonOpen}
                onClose={() => !addingLesson && setIsAddLessonOpen(false)}
                title="Thêm bài học mới"
                description="Tạo bài học mới và phân vào chương trong khóa."
            >
                <form onSubmit={handleCreateLesson} className="space-y-4">
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Thuộc chương học
                        </label>
                        <select
                            value={lessonChapterId || String(course.chapters[0]?.id || "")}
                            onChange={(e) => setLessonChapterId(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                            required
                        >
                            {course.chapters.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    <TextField
                        label="Tiêu đề bài học"
                        value={lessonTitle}
                        onChange={(e) => setLessonTitle(e.target.value)}
                        placeholder="Ví dụ: Giới thiệu cú pháp JSX và Component"
                        required
                        disabled={addingLesson}
                        autoFocus
                    />

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Nội dung chi tiết bài học
                        </label>
                        <textarea
                            value={lessonContent}
                            onChange={(e) => setLessonContent(e.target.value)}
                            placeholder="Nội dung lý thuyết, hướng dẫn thực hành..."
                            className="min-h-24 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            disabled={addingLesson}
                        />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <TextField
                            label="Đường dẫn Video bài giảng"
                            value={lessonVideoUrl}
                            onChange={(e) => setLessonVideoUrl(e.target.value)}
                            placeholder="Link YouTube, Vimeo, MP4..."
                            disabled={addingLesson}
                        />

                        <TextField
                            label="Thời lượng (giây)"
                            type="number"
                            min={0}
                            value={lessonDuration}
                            onChange={(e) => setLessonDuration(e.target.value)}
                            placeholder="Ví dụ: 600 (tương đương 10 phút)"
                            disabled={addingLesson}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsAddLessonOpen(false)}
                            disabled={addingLesson}
                        >
                            Hủy
                        </Button>
                        <Button type="submit" loading={addingLesson}>
                            Tạo bài học
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Modal: Edit Lesson */}
            {editingLesson && (
                <EditLessonModal
                    lesson={editingLesson}
                    onClose={() => setEditingLesson(null)}
                    run={run}
                />
            )}

            {/* Modal: Add Material */}
            <Modal
                isOpen={isAddMaterialOpen}
                onClose={() => !addingMaterial && setIsAddMaterialOpen(false)}
                title="Thêm tài liệu / học liệu"
                description="Tải lên tệp đính kèm hoặc bổ sung liên kết tài nguyên học tập."
            >
                <form onSubmit={handleCreateMaterial} className="space-y-4">
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant={materialMode === "file" ? "primary" : "secondary"}
                            onClick={() => setMaterialMode("file")}
                            className="flex-1"
                        >
                            <FileIcon size={16} />
                            <span>Tải tệp từ máy</span>
                        </Button>
                        <Button
                            type="button"
                            variant={materialMode === "link" ? "primary" : "secondary"}
                            onClick={() => setMaterialMode("link")}
                            className="flex-1"
                        >
                            <LinkIcon size={16} />
                            <span>Dán liên kết web</span>
                        </Button>
                    </div>

                    <TextField
                        label="Tên tài liệu / học liệu"
                        value={materialTitle}
                        onChange={(e) => setMaterialTitle(e.target.value)}
                        placeholder="Ví dụ: Slide bài giảng Chương 1, Tài liệu PDF..."
                        required
                        disabled={addingMaterial}
                    />

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Gán vào bài học (tùy chọn)
                        </label>
                        <select
                            value={materialLessonId}
                            onChange={(e) => setMaterialLessonId(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                        >
                            <option value="">Toàn khóa học (Học liệu chung)</option>
                            {lessons.map((l) => (
                                <option key={l.id} value={l.id}>
                                    Bài: {l.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    {materialMode === "file" ? (
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                Chọn file đính kèm
                            </label>
                            <input
                                type="file"
                                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
                                onChange={(e) => setMaterialFile(e.target.files?.[0] ?? null)}
                                required
                            />
                        </div>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="sm:col-span-2">
                                <TextField
                                    label="Đường dẫn liên kết (URL)"
                                    value={materialUrl}
                                    onChange={(e) => setMaterialUrl(e.target.value)}
                                    placeholder="https://example.com/tai-lieu"
                                    required
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Loại
                                </label>
                                <select
                                    value={materialType}
                                    onChange={(e) => setMaterialType(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                                >
                                    <option value="Link">Liên kết (Link)</option>
                                    <option value="File">Tệp tin (File)</option>
                                    <option value="Video">Video tham khảo</option>
                                </select>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsAddMaterialOpen(false)}
                            disabled={addingMaterial}
                        >
                            Hủy
                        </Button>
                        <Button type="submit" loading={addingMaterial}>
                            Xác nhận lưu
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

function MaterialList({
    items,
    canManage,
    run,
}: {
    items: Material[];
    canManage: boolean;
    run: (action: () => Promise<unknown>, fallback: string) => Promise<void>;
}) {
    if (items.length === 0) {
        return <p className="text-xs text-slate-400 py-2">Chưa có học liệu đính kèm.</p>;
    }

    return (
        <ul className="grid gap-2 sm:grid-cols-2">
            {items.map((m) => {
                const isLocal = m.isFile || isStoredMedia(m.url);

                return (
                    <li
                        key={m.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 transition hover:bg-slate-50 hover:border-slate-300"
                    >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                {isLocal ? <FileIcon size={16} /> : <LinkIcon size={16} />}
                            </div>
                            <div className="overflow-hidden">
                                {isLocal ? (
                                    <button
                                        type="button"
                                        className="text-left font-semibold text-xs text-slate-900 hover:text-indigo-600 hover:underline truncate block max-w-xs"
                                        onClick={() => void openStoredFile(`/materials/${m.id}/file`, m.title)}
                                    >
                                        {m.title}
                                    </button>
                                ) : (
                                    <a
                                        href={m.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-left font-semibold text-xs text-indigo-600 hover:underline truncate block max-w-xs"
                                    >
                                        {m.title}
                                    </a>
                                )}
                                <span className="text-[10px] text-slate-400 uppercase font-medium">
                                    {m.type}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                            {isLocal && (
                                <button
                                    type="button"
                                    onClick={() => void openStoredFile(`/materials/${m.id}/file`, m.title)}
                                    className="p-1 text-slate-500 hover:text-indigo-600"
                                    title="Tải về"
                                >
                                    <DownloadIcon size={16} />
                                </button>
                            )}
                            {canManage && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (window.confirm("Xóa tài liệu này?")) {
                                            void run(() => deleteMaterial(m.id), "Không xóa được tài liệu.");
                                        }
                                    }}
                                    className="p-1 text-slate-400 hover:text-red-600 transition"
                                    title="Xóa tài liệu"
                                >
                                    <TrashIcon size={16} />
                                </button>
                            )}
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}

function EditLessonModal({
    lesson,
    onClose,
    run,
}: {
    lesson: Lesson;
    onClose: () => void;
    run: (action: () => Promise<unknown>, fallback: string) => Promise<void>;
}) {
    const [editTitle, setEditTitle] = useState(lesson.title);
    const [editContent, setEditContent] = useState(lesson.content ?? "");
    const [editVideoUrl, setEditVideoUrl] = useState(
        isStoredMedia(lesson.videoUrl) ? "" : lesson.videoUrl ?? ""
    );
    const [editDuration, setEditDuration] = useState(
        lesson.durationSeconds ? String(lesson.durationSeconds) : ""
    );
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);

    const handleSave = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await run(async () => {
                await updateLesson(lesson.id, {
                    title: editTitle.trim(),
                    content: editContent.trim() || undefined,
                    videoUrl: editVideoUrl.trim() || undefined,
                    durationSeconds: editDuration ? Number(editDuration) : undefined,
                });
                if (videoFile) {
                    await uploadLessonVideo(
                        lesson.id,
                        videoFile,
                        editDuration ? Number(editDuration) : undefined
                    );
                    setVideoFile(null);
                }
                onClose();
            }, "Không lưu được bài học.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            isOpen={true}
            onClose={() => !saving && onClose()}
            title="Chỉnh sửa bài học"
            description={`Cập nhật nội dung, liên kết video hoặc tải tệp video cho bài học #${lesson.id}`}
        >
            <form onSubmit={handleSave} className="space-y-4">
                <TextField
                    label="Tiêu đề bài học"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                    disabled={saving}
                    autoFocus
                />

                <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Nội dung bài học
                    </label>
                    <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        placeholder="Nội dung bài giảng..."
                        className="min-h-28 w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        disabled={saving}
                    />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <TextField
                        label="Đường dẫn Video bài giảng"
                        value={editVideoUrl}
                        onChange={(e) => setEditVideoUrl(e.target.value)}
                        placeholder="Link YouTube, Vimeo, MP4..."
                        disabled={saving}
                    />

                    <TextField
                        label="Thời lượng (giây)"
                        type="number"
                        min={0}
                        value={editDuration}
                        onChange={(e) => setEditDuration(e.target.value)}
                        placeholder="Ví dụ: 600"
                        disabled={saving}
                    />
                </div>

                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3.5 text-xs text-slate-600">
                    <p className="font-semibold text-slate-800 mb-1">
                        Hoặc tải file video trực tiếp lên hệ thống (mp4, webm, mov, tối đa 25MB):
                    </p>
                    <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime"
                        className="mt-1 block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
                        onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
                        disabled={saving}
                    />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        disabled={saving}
                    >
                        Hủy
                    </Button>
                    <Button type="submit" loading={saving}>
                        Lưu bài học
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
