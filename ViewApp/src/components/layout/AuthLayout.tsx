import type { ReactNode } from "react";
import { BookOpenIcon, CheckCircleIcon, UsersIcon } from "../ui/icons";

interface Props {
    title: string;
    subtitle?: string;
    children: ReactNode;
    footer?: ReactNode;
}

export default function AuthLayout({ title, subtitle, children, footer }: Props) {
    return (
        <div className="flex min-h-svh items-center justify-center bg-slate-50/70 p-4 sm:p-6 lg:p-8">
            <div className="flex w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/50">
                {/* Brand Side Panel (hidden on small devices) */}
                <div className="relative hidden w-5/12 flex-col justify-between bg-gradient-to-br from-indigo-700 via-indigo-600 to-sky-700 p-8 text-white md:flex">
                    {/* Background Ambient Glow */}
                    <div className="absolute -left-12 -top-12 size-48 rounded-full bg-indigo-500/30 blur-2xl" />
                    <div className="absolute -bottom-12 -right-12 size-48 rounded-full bg-sky-500/30 blur-2xl" />

                    {/* Logo & Headline */}
                    <div className="relative z-10 space-y-4">
                        <div className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-3.5 py-2 backdrop-blur-md ring-1 ring-white/20">
                            <img
                                src="/BasicLMS.png"
                                alt="BasicLMS"
                                className="size-7 rounded-lg object-cover"
                            />
                            <span className="font-bold tracking-tight text-white text-sm">
                                BasicLMS
                            </span>
                        </div>
                        <h2 className="text-2xl font-extrabold tracking-tight text-white leading-snug">
                            Nền tảng quản lý đào tạo & học tập trực tuyến
                        </h2>
                        <p className="text-xs text-indigo-100/90 leading-relaxed">
                            Cung cấp môi trường học tập tương tác, quản lý tiến độ bài học, phân công giảng viên và lớp học chuyên nghiệp.
                        </p>
                    </div>

                    {/* Features list */}
                    <div className="relative z-10 space-y-3.5 py-6">
                        <div className="flex items-center gap-3 text-xs text-indigo-50">
                            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/15 text-indigo-200">
                                <BookOpenIcon size={14} />
                            </div>
                            <span>Giáo trình học phân tầng theo chương & bài học</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-indigo-50">
                            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/15 text-indigo-200">
                                <UsersIcon size={14} />
                            </div>
                            <span>Phân quyền linh hoạt Quản trị, Giảng viên & Học viên</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-indigo-50">
                            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/15 text-indigo-200">
                                <CheckCircleIcon size={14} />
                            </div>
                            <span>Hỗ trợ đa phương tiện video, file đính kèm & link học liệu</span>
                        </div>
                    </div>

                    {/* System footer note */}
                    <div className="relative z-10 border-t border-white/10 pt-4 text-[11px] text-indigo-200/80">
                        Hệ thống bảo mật tiêu chuẩn JWT & ASP.NET Core
                    </div>
                </div>

                {/* Form Side */}
                <div className="flex w-full flex-col justify-center p-6 sm:p-10 md:w-7/12">
                    <div className="mx-auto w-full max-w-md">
                        {/* Mobile Brand */}
                        <div className="mb-6 flex items-center gap-2 md:hidden">
                            <img
                                src="/BasicLMS.png"
                                alt="BasicLMS"
                                className="size-8 rounded-xl object-cover shadow-md shadow-indigo-200"
                            />
                            <span className="text-lg font-bold text-slate-900">BasicLMS</span>
                        </div>

                        <div className="mb-6">
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                                {title}
                            </h1>
                            {subtitle && (
                                <p className="mt-1.5 text-sm text-slate-500 leading-normal">
                                    {subtitle}
                                </p>
                            )}
                        </div>

                        <div>{children}</div>

                        {footer && (
                            <div className="mt-6 border-t border-slate-100 pt-4 text-center text-sm text-slate-500">
                                {footer}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
