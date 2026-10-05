# BasicLMS — ViewApp (Frontend)

Single Page Application của BasicLMS, viết bằng **React 19 + TypeScript + Vite + Tailwind CSS v4**.
ViewApp giao tiếp với REST API ASP.NET Core qua `/api` và xác thực bằng JWT.

> Tổng quan hệ thống, cài đặt database và backend: [`../README.md`](../README.md).

## Công nghệ

| Thư viện                  | Phiên bản | Vai trò                                       |
| ------------------------- | --------- | --------------------------------------------- |
| React / React DOM         | 19        | UI                                            |
| TypeScript                | 6         | Kiểm tra kiểu (`tsc -b` trong bước build)     |
| Vite                      | 8         | Dev server, HMR, bundler, proxy `/api`        |
| Tailwind CSS              | 4         | Styling qua plugin `@tailwindcss/vite`        |
| React Router DOM          | 7         | Routing phía client                           |
| Axios                     | 1         | HTTP client, interceptor gắn JWT              |
| ESLint + typescript-eslint | 10 / 8   | Lint (react-hooks, react-refresh)             |

## Bắt đầu

Yêu cầu Node.js `^20.19.0` hoặc `>=22.12.0`. API cần chạy ở `http://localhost:5139`
(`dotnet run --launch-profile http` ở thư mục gốc).

```bash
npm install
npm run dev       # http://localhost:5173
```

| Script            | Mô tả                                              |
| ----------------- | -------------------------------------------------- |
| `npm run dev`     | Dev server có HMR tại cổng `5173`                  |
| `npm run build`   | Type-check (`tsc -b`) rồi build production vào `dist/` |
| `npm run preview` | Xem thử bản build                                  |
| `npm run lint`    | Chạy ESLint toàn bộ project                        |

Trước khi gửi thay đổi, đảm bảo `npm run lint` và `npm run build` đều chạy thành công.

Đăng nhập thử bằng tài khoản Admin được seed sẵn: `admin@basiclms.local` / `Admin@123456`.

## Cấu trúc thư mục

```
src/
├── api/
│   ├── axios.ts              # Axios instance dùng chung (baseURL /api, interceptor JWT, xử lý 401)
│   ├── auth.ts               # Kiểu dữ liệu + hàm gọi API: account, dashboard, admin users
│   ├── lms.ts                # Category, course, class, enroll
│   └── errors.ts             # Chuyển lỗi API thành thông báo tiếng Việt
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx     # Header + nav cho trang đã đăng nhập
│   │   └── AuthLayout.tsx    # Khung cho trang đăng nhập/đăng ký
│   ├── ui/                   # Primitive dùng lại: Button, TextField, Alert, Spinner
│   ├── GuestRoute.tsx        # Chỉ cho khách (chưa đăng nhập)
│   ├── ProtectedRoute.tsx    # Yêu cầu đăng nhập, tùy chọn kiểm tra vai trò
│   ├── PasswordChecklist.tsx # Hiển thị các tiêu chí mật khẩu
│   ├── ResetPasswordDialog.tsx
│   ├── CourseCurriculum.tsx  # Chương, bài học, upload học liệu
│   ├── LessonMedia.tsx       # Phát video bài học (kể cả file đã tải)
│   └── RoleBadge.tsx         # Nhãn vai trò (Quản trị viên / Giảng viên / Học viên)
├── contexts/
│   ├── auth-context.ts       # AuthContext + kiểu User, AuthContextType
│   └── AuthContext.tsx       # AuthProvider: token, user, login, logout, hasRole
├── hooks/useAuth.ts          # Hook truy cập AuthContext
├── pages/                    # Auth, Dashboard, AdminUsers, Categories, Courses, Classes, NotFound
├── utils/password.ts         # Luật mật khẩu + trình tạo mật khẩu ngẫu nhiên
├── App.tsx                   # Khai báo routes
├── main.tsx                  # Entry: BrowserRouter > AuthProvider > App
└── index.css                 # Import Tailwind, @theme, style nền
```

## Routes

| Path           | Trang        | Bảo vệ                         |
| -------------- | ------------ | ------------------------------ |
| `/`            | —            | Chuyển hướng tới `/dashboard`  |
| `/login`       | `Login`      | `GuestRoute`                   |
| `/register`    | `Register`   | `GuestRoute`                   |
| `/dashboard`     | `Dashboard`    | `ProtectedRoute`               |
| `/courses`       | `Courses`      | `ProtectedRoute`               |
| `/courses/:id`   | `CourseDetail` | `ProtectedRoute`               |
| `/classes`       | `Classes`      | `ProtectedRoute`               |
| `/classes/:id`   | `ClassDetail`  | `ProtectedRoute`               |
| `/categories`    | `Categories`   | `ProtectedRoute roles={["Admin"]}` |
| `/admin/users`   | `AdminUsers`   | `ProtectedRoute roles={["Admin"]}` |
| `*`              | `NotFound`     | —                              |

- `ProtectedRoute`: chưa đăng nhập → `/login` (lưu `state.from` để quay lại sau khi đăng nhập);
  sai vai trò → `/dashboard`.
- `GuestRoute`: đã đăng nhập → quay về `state.from` hoặc `/dashboard`.
- Cả hai hiển thị `FullPageSpinner` trong lúc khôi phục phiên.

Guard phía client chỉ phục vụ trải nghiệm người dùng; quyền thực sự do API kiểm tra.

## Xác thực

1. `login()` trong `AuthProvider` gọi `POST /api/account/login`, lưu token vào `localStorage["token"]`
   và set `user` từ response.
2. Khi tải lại trang, nếu có token, `AuthProvider` gọi `GET /api/account/me` để khôi phục `user`
   (`loading = true` trong lúc chờ). Lỗi → xóa token.
3. Interceptor request gắn `Authorization: Bearer <token>`.
4. Interceptor response: gặp `401` (trừ request login) → xóa token và phát event `auth:unauthorized`;
   `AuthProvider` lắng nghe event này và reset state, các route guard tự chuyển về `/login`.
5. `logout()` xóa token và điều hướng tới `/login`.

Dùng trong component:

```tsx
const { user, isAuthenticated, loading, login, logout, hasRole } = useAuth();

if (hasRole("Admin", "Lecturer")) {
    // ...
}
```

## Gọi API và xử lý lỗi

- Luôn dùng instance `api` trong `src/api/axios.ts`, đường dẫn tương đối (`/account/login`), không hard-code host.
  Ở môi trường dev, Vite proxy chuyển `/api/*` tới `http://localhost:5139` (`vite.config.ts`).
- Mỗi nhóm API có interface TypeScript khớp với DTO bên backend (camelCase). Khi backend đổi DTO, cập nhật interface tương ứng.
- Lỗi từ API có dạng `{ message, errors?: [{ code, description }] }`. Dùng helper:

```tsx
try {
    await adminResetPassword(user.id, newPassword);
} catch (error) {
    setErrors(getApiErrorMessages(error, "Đặt lại mật khẩu thất bại."));
}

// ...
<Alert messages={errors} />
```

`getApiErrorMessages` ưu tiên dịch theo `errors[].code` (`CODE_TRANSLATIONS`), sau đó theo `message`
(`MESSAGE_TRANSLATIONS`), và có thông báo mặc định cho lỗi mạng, `403`, `5xx`.
Khi backend thêm thông báo hoặc mã lỗi mới, thêm bản dịch vào `src/api/errors.ts`.

- Fetch dữ liệu trong `useEffect` dùng cờ `cancelled` để bỏ qua response cũ (xem `pages/AdminUsers.tsx`).

## Giao diện

- Tailwind CSS v4, cấu hình CSS-first: **không có** `tailwind.config.js`; token theme (font Inter) khai báo trong `@theme` ở `src/index.css`.
- Bảng màu: `indigo` (chính), `slate` (trung tính), `red` (nguy hiểm/lỗi), `emerald` (thành công), `amber`/`sky`/`rose` cho nhãn vai trò.
- Ưu tiên dùng lại component trong `components/ui/`:
  - `Button` — `variant`: `primary | secondary | ghost | danger`, prop `loading` hiển thị spinner và disable nút.
  - `TextField` — có `label`, `error`, nút Hiện/Ẩn cho `type="password"`, gắn `aria-invalid`/`aria-describedby`.
  - `Alert` — `variant`: `error | success | info`, nhận `messages: string[]` hoặc `children`.
  - `Spinner`, `FullPageSpinner`.
- Trang đã đăng nhập bọc trong `AppLayout`; trang đăng nhập/đăng ký dùng `AuthLayout`.
- Toàn bộ nội dung hiển thị cho người dùng viết bằng **tiếng Việt**.

## Quy ước code

- Component: PascalCase, mỗi file một component, `export default`. Hook/util: camelCase.
- 4 space, nháy kép, có dấu chấm phẩy (trong `src/`).
- `verbatimModuleSyntax` đang bật → import kiểu bằng `import type { ... }`.
- `noUnusedLocals` / `noUnusedParameters` đang bật → không để biến/tham số thừa.
- File chứa component chỉ export component (yêu cầu của `eslint-plugin-react-refresh`); context, hằng số, kiểu
  để ở file riêng (ví dụ `auth-context.ts` tách khỏi `AuthContext.tsx`).
- Luật mật khẩu trong `src/utils/password.ts` phải khớp `IdentityOptions.Password` trong `Program.cs`.

## Thêm một trang mới

1. Khai báo interface + hàm gọi API trong `src/api/` (file theo feature, ví dụ `courses.ts`).
2. Tạo trang trong `src/pages/`, bọc bằng `AppLayout`, hiển thị lỗi bằng `getApiErrorMessages` + `Alert`.
3. Thêm route trong `src/App.tsx`, bọc `ProtectedRoute` (kèm `roles` nếu cần).
4. Thêm link điều hướng trong `components/layout/AppLayout.tsx` (ẩn theo `hasRole` nếu cần).
5. Bổ sung bản dịch lỗi mới vào `src/api/errors.ts`.
6. Chạy `npm run lint` và `npm run build`.

## Build và triển khai

`npm run build` tạo bundle tĩnh trong `dist/`. Trên server Linux, image `web` (`deploy/web.Dockerfile`) làm việc này và Nginx của image proxy `/api/` tới API. Xem [`../README.md`](../README.md).

Khi tự triển khai:

- Phục vụ `dist/` bằng web server (Nginx, CDN, …) và cấu hình fallback mọi route về `index.html` (SPA routing).
- Reverse proxy `/api` tới API, hoặc cho phép origin của frontend trong CORS policy `Frontend` (`Program.cs`).
  `baseURL` hiện cố định là `/api`, nên cách reverse proxy là đơn giản nhất.
