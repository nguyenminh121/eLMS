import api from "./axios";

export interface UserSummary {
    id: number;
    fullName: string;
    email: string;
}

export interface Category {
    id: number;
    name: string;
    description: string | null;
    createdAt: string;
    courseCount: number;
}

export interface CourseListItem {
    id: number;
    title: string;
    description: string | null;
    thumbnailUrl: string | null;
    level: string;
    status: string;
    categoryId: number | null;
    categoryName: string | null;
    chapterCount: number;
    classCount: number;
    lecturers: UserSummary[];
    updatedAt: string;
}

export interface Lesson {
    id: number;
    chapterId: number;
    title: string;
    content: string | null;
    videoUrl: string | null;
    durationSeconds: number | null;
    sortOrder: number;
}

export interface Chapter {
    id: number;
    courseId: number;
    title: string;
    sortOrder: number;
    lessons: Lesson[];
}

export interface Material {
    id: number;
    courseId: number;
    lessonId: number | null;
    title: string;
    url: string;
    type: string;
    sortOrder: number;
    isFile: boolean;
}

export interface CourseDetail {
    id: number;
    title: string;
    description: string | null;
    thumbnailUrl: string | null;
    level: string;
    status: string;
    categoryId: number | null;
    categoryName: string | null;
    lecturers: UserSummary[];
    chapters: Chapter[];
    materials: Material[];
    createdAt: string;
    updatedAt: string;
}

export interface CoursePayload {
    title: string;
    description?: string;
    thumbnailUrl?: string;
    level?: string;
    categoryId?: number | null;
    status?: string;
}

export interface ClassListItem {
    id: number;
    courseId: number;
    courseTitle: string;
    name: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    capacity: number | null;
    enrollmentCount: number;
    lecturers: UserSummary[];
}

export interface Enrollment {
    id: number;
    classId: number;
    studentId: number;
    studentName: string;
    studentEmail: string;
    status: string;
    enrolledAt: string;
    completedAt: string | null;
}

export interface ClassDetail {
    id: number;
    courseId: number;
    courseTitle: string;
    name: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    capacity: number | null;
    lecturers: UserSummary[];
    enrollments: Enrollment[];
    createdAt: string;
    updatedAt: string;
    canManage: boolean;
}

export interface ClassPayload {
    courseId: number;
    name: string;
    startDate?: string | null;
    endDate?: string | null;
    status?: string;
    capacity?: number | null;
}

export const listCategories = () => api.get<Category[]>("/categories");
export const createCategory = (data: { name: string; description?: string }) =>
    api.post<Category>("/categories", data);
export const updateCategory = (id: number, data: { name: string; description?: string }) =>
    api.put<Category>(`/categories/${id}`, data);
export const deleteCategory = (id: number) => api.delete(`/categories/${id}`);

export const listCourses = (params?: { search?: string; status?: string; categoryId?: number }) =>
    api.get<CourseListItem[]>("/courses", { params });
export const getCourse = (id: number) => api.get<CourseDetail>(`/courses/${id}`);
export const createCourse = (data: CoursePayload) => api.post<CourseDetail>("/courses", data);
export const updateCourse = (id: number, data: CoursePayload) => api.put<CourseDetail>(`/courses/${id}`, data);
export const updateCourseStatus = (id: number, status: string) =>
    api.patch<CourseDetail>(`/courses/${id}/status`, { status });
export const deleteCourse = (id: number) => api.delete(`/courses/${id}`);

export const createChapter = (courseId: number, data: { title: string; sortOrder?: number }) =>
    api.post<Chapter>(`/courses/${courseId}/chapters`, data);
export const updateChapter = (id: number, data: { title: string; sortOrder?: number }) =>
    api.put<Chapter>(`/chapters/${id}`, data);
export const deleteChapter = (id: number) => api.delete(`/chapters/${id}`);

export const createLesson = (
    chapterId: number,
    data: { title: string; content?: string; videoUrl?: string; durationSeconds?: number; sortOrder?: number }
) => api.post<Lesson>(`/chapters/${chapterId}/lessons`, data);
export const updateLesson = (
    id: number,
    data: { title: string; content?: string; videoUrl?: string; durationSeconds?: number; sortOrder?: number }
) => api.put<Lesson>(`/lessons/${id}`, data);
export const deleteLesson = (id: number) => api.delete(`/lessons/${id}`);

export const createMaterial = (
    courseId: number,
    data: { title: string; url: string; type?: string; lessonId?: number; sortOrder?: number }
) => api.post<Material>(`/courses/${courseId}/materials`, data);
export const uploadMaterial = (
    courseId: number,
    data: { title: string; file: File; type?: string; lessonId?: number }
) => {
    const form = new FormData();
    form.append("title", data.title);
    form.append("file", data.file);
    if (data.type) form.append("type", data.type);
    if (data.lessonId) form.append("lessonId", String(data.lessonId));
    return api.post<Material>(`/courses/${courseId}/materials/upload`, form);
};
export const updateMaterial = (
    id: number,
    data: { title: string; url: string; type?: string; lessonId?: number; sortOrder?: number }
) => api.put<Material>(`/materials/${id}`, data);
export const deleteMaterial = (id: number) => api.delete(`/materials/${id}`);

export const uploadLessonVideo = (lessonId: number, file: File, durationSeconds?: number) => {
    const form = new FormData();
    form.append("file", file);
    if (durationSeconds != null) form.append("durationSeconds", String(durationSeconds));
    return api.post<Lesson>(`/lessons/${lessonId}/video`, form);
};

export async function openStoredFile(path: string, fileName: string) {
    const { data } = await api.get<Blob>(path, { responseType: "blob" });
    const url = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
}

export function isStoredMedia(url?: string | null) {
    return !!url && url.startsWith("local:");
}

export const assignCourseLecturer = (courseId: number, userId: number) =>
    api.post(`/courses/${courseId}/lecturers/${userId}`);
export const unassignCourseLecturer = (courseId: number, userId: number) =>
    api.delete(`/courses/${courseId}/lecturers/${userId}`);

export const listClasses = (params?: { courseId?: number; status?: string }) =>
    api.get<ClassListItem[]>("/classes", { params });
export const getClass = (id: number) => api.get<ClassDetail>(`/classes/${id}`);
export const createClass = (data: ClassPayload) => api.post<ClassDetail>("/classes", data);
export const updateClass = (id: number, data: ClassPayload) => api.put<ClassDetail>(`/classes/${id}`, data);
export const deleteClass = (id: number) => api.delete(`/classes/${id}`);

export const assignClassLecturer = (classId: number, userId: number) =>
    api.post(`/classes/${classId}/lecturers/${userId}`);
export const unassignClassLecturer = (classId: number, userId: number) =>
    api.delete(`/classes/${classId}/lecturers/${userId}`);

export const enrollInClass = (classId: number, studentId?: number) =>
    api.post<Enrollment>(`/classes/${classId}/enrollments`, { studentId });
export const unenroll = (enrollmentId: number) => api.delete(`/enrollments/${enrollmentId}`);

export const lookupUsers = (params?: { role?: string; search?: string }) =>
    api.get<UserSummary[]>("/users", { params });
