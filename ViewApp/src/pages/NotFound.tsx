import { Link } from "react-router-dom";
import { AcademicCapIcon, HomeIcon } from "../components/ui/icons";

export default function NotFound() {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center bg-slate-50/70 p-4 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-inner">
                <AcademicCapIcon size={36} />
            </div>

            <p className="mt-6 text-7xl font-extrabold tracking-tight text-indigo-600">
                404
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Không tìm thấy trang yêu cầu
            </h1>

            <p className="mt-2 max-w-sm text-sm text-slate-500 leading-relaxed">
                Đường dẫn bạn truy cập không tồn tại hoặc đã được chuyển sang địa chỉ mới. Vui lòng quay lại bảng điều khiển chính.
            </p>

            <div className="mt-6">
                <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-500"
                >
                    <HomeIcon size={18} />
                    <span>Về bảng làm việc</span>
                </Link>
            </div>
        </div>
    );
}
