import axios from "axios";

interface ApiErrorItem {
    code?: string;
    description?: string;
}

interface ApiErrorBody {
    message?: string;
    errors?: ApiErrorItem[];
}

const MESSAGE_TRANSLATIONS: Record<string, string> = {
    "Invalid email or password": "Email hoặc mật khẩu không đúng.",
    "Email is already registered": "Email này đã được đăng ký.",
    "A valid email is required": "Vui lòng nhập email hợp lệ.",
    "Full name is required": "Vui lòng nhập họ tên.",
    "Password is required": "Vui lòng nhập mật khẩu.",
    "Password must be at least 6 characters long": "Mật khẩu phải có ít nhất 6 ký tự.",
    "New password is required": "Vui lòng nhập mật khẩu mới.",
    "User not found": "Không tìm thấy người dùng.",
    "Category name is required": "Vui lòng nhập tên danh mục.",
    "Category name already exists": "Tên danh mục đã tồn tại.",
    "Category not found": "Không tìm thấy danh mục.",
    "Category is in use by one or more courses": "Danh mục đang được khóa học sử dụng.",
    "Course not found": "Không tìm thấy khóa học.",
    "Course title is required": "Vui lòng nhập tên khóa học.",
    "Course category is required": "Vui lòng chọn danh mục cho khóa học.",
    "Invalid course level": "Trình độ khóa học không hợp lệ.",
    "Invalid course status": "Trạng thái khóa học không hợp lệ.",
    "You cannot create courses": "Bạn không thể tạo khóa học.",
    "Only an admin can create courses": "Chỉ quản trị viên được tạo khóa học.",
    "You cannot update this course": "Bạn không thể sửa khóa học này.",
    "You cannot delete this course": "Bạn không thể xóa khóa học này.",
    "You cannot manage this course": "Bạn không thể quản lý khóa học này.",
    "Course has classes and cannot be deleted": "Không thể xóa khóa học đã có lớp.",
    "Chapter title is required": "Vui lòng nhập tên chương.",
    "Chapter not found": "Không tìm thấy chương.",
    "Lesson title is required": "Vui lòng nhập tên bài học.",
    "Lesson not found": "Không tìm thấy bài học.",
    "Duration cannot be negative": "Thời lượng không được âm.",
    "Material title is required": "Vui lòng nhập tên tài liệu.",
    "Material url is required": "Vui lòng nhập đường dẫn tài liệu.",
    "Invalid material type": "Loại tài liệu không hợp lệ.",
    "Material not found": "Không tìm thấy tài liệu.",
    "A file is required": "Vui lòng chọn tệp để tải lên.",
    "File is too large": "Tệp vượt quá 25MB.",
    "File type is not allowed": "Định dạng tệp không được hỗ trợ.",
    "Uploaded file not found": "Không tìm thấy tệp đã tải lên.",
    "Lesson video must be mp4, webm or mov": "Video bài học phải là mp4, webm hoặc mov.",
    "Lesson does not belong to this course": "Bài học không thuộc khóa học này.",
    "Only an admin can assign course lecturers": "Chỉ quản trị viên được phân công giảng viên khóa học.",
    "Only an admin can unassign course lecturers": "Chỉ quản trị viên được gỡ phân công giảng viên khóa học.",
    "Lecturer is already assigned to this course": "Giảng viên đã được phân công khóa học này.",
    "Course lecturer assignment not found": "Chưa phân công giảng viên cho khóa học.",
    "Lecturer not found": "Không tìm thấy giảng viên.",
    "User is not a lecturer": "Người dùng này không phải giảng viên.",
    "Class not found": "Không tìm thấy lớp học.",
    "Class name is required": "Vui lòng nhập tên lớp.",
    "Invalid class status": "Trạng thái lớp không hợp lệ.",
    "Capacity must be greater than zero": "Sĩ số phải lớn hơn 0.",
    "End date cannot be before start date": "Ngày kết thúc không được trước ngày bắt đầu.",
    "You cannot create a class for this course": "Bạn không thể tạo lớp cho khóa học này.",
    "You cannot update this class": "Bạn không thể sửa lớp này.",
    "You cannot delete this class": "Bạn không thể xóa lớp này.",
    "Cannot move a class to another course": "Không thể chuyển lớp sang khóa học khác.",
    "Only an admin can assign class lecturers": "Chỉ quản trị viên được phân công giảng viên lớp.",
    "Only an admin can unassign class lecturers": "Chỉ quản trị viên được gỡ phân công giảng viên lớp.",
    "Lecturer is already assigned to this class": "Giảng viên đã được phân công lớp này.",
    "Class lecturer assignment not found": "Chưa phân công giảng viên cho lớp.",
    "Class is not open for enrollment": "Lớp chưa mở ghi danh.",
    "Student is already enrolled": "Học viên đã ghi danh lớp này.",
    "Class is full": "Lớp đã đủ sĩ số.",
    "Student not found": "Không tìm thấy học viên.",
    "User is not a student": "Người dùng này không phải học viên.",
    "Student id is required": "Vui lòng chọn học viên.",
    "You can only enroll yourself": "Bạn chỉ có thể tự ghi danh.",
    "You cannot enroll students in this class": "Bạn không thể ghi danh học viên vào lớp này.",
    "You cannot enroll students": "Bạn không thể ghi danh học viên.",
    "Enrollment not found": "Không tìm thấy ghi danh.",
    "You cannot cancel this enrollment": "Bạn không thể hủy ghi danh này.",
};

const CODE_TRANSLATIONS: Record<string, string> = {
    PasswordTooShort: "Mật khẩu phải có ít nhất 6 ký tự.",
    PasswordRequiresUpper: "Mật khẩu phải có ít nhất 1 chữ hoa (A-Z).",
    PasswordRequiresLower: "Mật khẩu phải có ít nhất 1 chữ thường (a-z).",
    PasswordRequiresDigit: "Mật khẩu phải có ít nhất 1 chữ số (0-9).",
    PasswordRequiresNonAlphanumeric: "Mật khẩu phải có ít nhất 1 ký tự đặc biệt.",
    DuplicateEmail: "Email này đã được đăng ký.",
    DuplicateUserName: "Email này đã được đăng ký.",
    InvalidEmail: "Email không hợp lệ.",
};

const translate = (item: ApiErrorItem) =>
    (item.code && CODE_TRANSLATIONS[item.code]) ||
    (item.description && MESSAGE_TRANSLATIONS[item.description]) ||
    item.description ||
    "";

/** Turns an axios error from the API into user-facing messages (Vietnamese when known). */
export function getApiErrorMessages(error: unknown, fallback: string): string[] {
    if (!axios.isAxiosError<ApiErrorBody>(error)) {
        return [fallback];
    }

    if (!error.response) {
        return ["Không thể kết nối tới máy chủ. Vui lòng thử lại sau."];
    }

    const { status, data } = error.response;

    if (Array.isArray(data?.errors) && data.errors.length > 0) {
        const messages = data.errors.map(translate).filter(Boolean);
        if (messages.length > 0) {
            return [...new Set(messages)];
        }
    }

    if (data?.message) {
        return [MESSAGE_TRANSLATIONS[data.message] ?? data.message];
    }

    if (status === 403) {
        return ["Bạn không có quyền thực hiện thao tác này."];
    }

    if (status >= 500) {
        return ["Máy chủ gặp sự cố. Vui lòng thử lại sau."];
    }

    return [fallback];
}
