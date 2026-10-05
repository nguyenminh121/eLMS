# AGENTS.md — BasicLMS

Context for AI coding agents working in this repository. Read this before changing code.
Human-facing docs: `README.md` (whole system) and `ViewApp/README.md` (frontend).

## 1. Project snapshot

BasicLMS is a Learning Management System built as a decoupled SPA + REST API:

| Layer    | Tech                                                                                   | Location              |
| -------- | -------------------------------------------------------------------------------------- | --------------------- |
| API      | ASP.NET Core (.NET SDK 10, `net10.0`), controllers-only REST, ASP.NET Identity + JWT    | repo root             |
| Data     | SQL Server 2022 (Docker), EF Core 10 code-first migrations                             | `Data/`, `Migrations/` |
| Frontend | React 19 + TypeScript 6 + Vite 8 + Tailwind CSS v4 + React Router 7 + Axios            | `ViewApp/`            |
| Tests    | xUnit + `WebApplicationFactory<Program>` + SQLite in-memory                            | `tests/BasicLMS.Tests/` |

Roles: `Admin`, `Lecturer`, `Student` (seeded on startup). Self-registration always yields `Student`.

Implemented today: register, login (JWT), current user (`/me`), role-aware dashboard welcome,
admin user list/search and admin password reset, plus the LMS catalog
(categories, courses, chapters, lessons, materials, classes, lecturer assign, enrollments).
**Not implemented yet:** lesson progress.
See section 7 when extending it.

UI copy is **Vietnamese**; code, identifiers, API messages and comments are **English**.

## 2. Repository map

```
BasicLMS.csproj / BasicLMS.slnx   API project + solution (API + tests)
Program.cs                        Composition root: Identity, JWT, CORS, Swagger, seeding, model-state error shape
Controllers/                      [ApiController] REST controllers (ControllerBase, no views)
Services/                         LMS business logic (ICategoryService, ICourseService, IClassService)
DTOs/<Feature>/<Feature>DTOs.cs   Request/response records, one file per feature
Data/ApplicationDbContext.cs      IdentityDbContext<ApplicationUser, IdentityRole<int>, int> + LMS DbSets
Data/IdentitySeeder.cs            Seeds roles + default admin at startup
Models/ApplicationUser.cs         IdentityUser<int> + FullName, DateOfBirth, AvatarUrl, IsActive, CreatedAt, UpdatedAt
Migrations/                       EF Core migrations (source of truth for the schema)
database/                         docker-compose for SQL Server + hand-written SQL scripts (see section 5)
tests/BasicLMS.Tests/             Integration tests, grouped by feature folder
ViewApp/                          React SPA (see ViewApp/README.md)
wwwroot/, Models/ErrorViewModel.cs  Leftovers from the MVC template; not used by the API
uploads/                            Local course files (gitignored; Storage:Root, default uploads/)
```

`BasicLMS.csproj` excludes `tests/**`, `ViewApp/**`, `database/**` from compilation — keep it that way.

## 3. Commands

Run from the repo root unless noted.

| Task                     | Command                                                                     |
| ------------------------ | --------------------------------------------------------------------------- |
| Start SQL Server         | `docker compose --env-file .env -f database/docker-compose.yml up -d`       |
| Run API (HTTP, dev)      | `dotnet run --launch-profile http` → http://localhost:5139, Swagger `/swagger` |
| Build API + tests        | `dotnet build BasicLMS.slnx`                                                |
| Run backend tests        | `dotnet test BasicLMS.slnx` (no SQL Server needed)                          |
| Add migration            | `dotnet ef migrations add <Name>`                                           |
| Apply migrations         | `dotnet ef database update --connection "<sa connection string>"`           |
| Frontend install / dev   | `cd ViewApp && npm install && npm run dev` → http://localhost:5173          |
| Frontend lint / build    | `cd ViewApp && npm run lint && npm run build`                               |

Definition of done for any change: `dotnet test BasicLMS.slnx` passes, and for frontend changes
`npm run lint` and `npm run build` pass in `ViewApp/`.

Agent sandbox notes:
- `dotnet build/test` needs MSBuild named pipes, which the sandbox blocks — run them with full permissions.
- `.cursorignore` contains `bin/`, which also matches `ViewApp/node_modules/*/bin/` (eslint, tsc).
  `npm run lint/build` therefore fails with `EPERM` inside the sandbox — run with full permissions.
- Never commit build output (`bin/`, `obj/`, `dist/`, `node_modules/`).

## 4. Backend conventions

**Controllers**
- `[ApiController]` + `ControllerBase`, explicit lowercase route: `[Route("api/<area>/<resource>")]`
  (e.g. `api/account`, `api/dashboard`, `api/admin/users`). Use kebab-case for multi-word segments
  (`reset-password`) and route constraints for ids (`{id:int}`).
- Put a `// VERB: /api/...` comment above each action, matching existing controllers.
- Authorization via attributes: `[Authorize]` for any signed-in user, `[Authorize(Roles = "Admin")]`
  for role gates. Role names are plain strings — keep them identical everywhere (see section 6).
- Current user id: `User.FindFirstValue(ClaimTypes.NameIdentifier)`; reload the user via
  `UserManager` and reject `!user.IsActive` where it matters.
- Controllers currently talk to `UserManager<ApplicationUser>` / `ApplicationDbContext` directly.
  When a feature grows real business logic (courses, enrollments…), introduce `Services/` with an
  interface + implementation registered in `Program.cs`, and keep controllers thin.
- Read-only queries: `AsNoTracking()`, project to DTOs in the query, cap result sizes (see
  `AdminUsersController.MaxResults`).

**DTOs**
- C# positional `record`s in `DTOs/<Feature>/<Feature>DTOs.cs`, namespace `BasicLMS.DTOs.<Feature>`.
- JSON is camelCase (ASP.NET default). Never return EF entities or `ApplicationUser` directly.

**Response contract** (the frontend and tests depend on it)
- Success: DTO body, or `{ "message": "..." }` for command-style endpoints.
- Error: `{ "message": "<English sentence>", "errors"?: [{ "code": "...", "description": "..." }] }`.
  Identity failures map `IdentityError.Code/Description` into `errors`. Model-binding failures use
  the same shape via `InvalidModelStateResponseFactory` in `Program.cs`.
- Status codes: 400 validation, 401 unauthenticated / bad credentials, 403 wrong role,
  404 not found, 409 conflict (e.g. duplicate email), 500 only for unexpected server failures.
- Keep API messages in English; the frontend translates them (`ViewApp/src/api/errors.ts`).
  When you add a new message or Identity error code, add its Vietnamese translation there.

**Data & time**
- Timestamps are UTC (`DateTime.UtcNow`). Set `CreatedAt`/`UpdatedAt` on create and `UpdatedAt` on update.
- Primary keys are `int` (Identity is configured with `int` keys).

**Auth/JWT**
- HS256, `Jwt:Key` must be ≥ 32 bytes (startup throws otherwise). Claims: NameIdentifier, Email,
  Name, Role(s). `Jwt:ExpireMinutes` default 60, `ClockSkew = Zero`, no refresh tokens.
- Login rejects inactive users with the same 401 as bad credentials (no account enumeration).

## 5. Database

- **EF Core migrations are the source of truth.** Current schema = ASP.NET Identity tables
  (`AspNetUsers`, `AspNetRoles`, `AspNetUserRoles`, …) from `Migrations/*_InitialIdentity`.
- `Program.cs` does **not** call `Database.Migrate()`. Apply migrations manually.
- The app connects as `lms_app`, which only has `db_datareader` + `db_datawriter`
  (created by `BasicLMS.sql` when `AppPassword` is passed). Migrations need DDL rights,
  so pass an `sa` (or `db_owner`) connection string via `dotnet ef database update --connection "..."`.
- `database/BasicLMS.sql` is the **single** schema script: drop/recreate `BasicLMS`,
  Identity + LMS tables, both `__EFMigrationsHistory` rows
  (`InitialIdentity`, `LmsDomain`). Optional `-v AppPassword=...` creates `lms_app`.
  After a new EF migration, rewrite this file so other machines can drop the DB and rerun it.
- Tests use SQLite in-memory with `EnsureCreated()`; avoid SQL Server-only features in the model
  (or guard them) so the test schema can still be created.

## 6. Cross-cutting invariants (keep in sync)

| Concern            | Places that must agree                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Password policy    | `Program.cs` (`options.Password.*`) ↔ `ViewApp/src/utils/password.ts` (`PASSWORD_RULES`) ↔ `CODE_TRANSLATIONS` in `ViewApp/src/api/errors.ts` |
| Role names         | `Data/IdentitySeeder.cs`, `[Authorize(Roles=...)]`, `DashboardController.BuildMessage`, `ViewApp/src/App.tsx` (`ProtectedRoute roles`), `AppLayout` nav, `RoleBadge` |
| DTO shapes         | `DTOs/**` ↔ TypeScript interfaces in `ViewApp/src/api/*.ts` ↔ test records in `tests/.../Infrastructure/TestHelpers.cs` |
| API error messages | Controller `message` strings ↔ `MESSAGE_TRANSLATIONS` in `ViewApp/src/api/errors.ts`                                     |
| Ports / origins    | API `5139` (`Properties/launchSettings.json`) ↔ Vite proxy target (`ViewApp/vite.config.ts`); SPA `5173` ↔ CORS policy `Frontend` in `Program.cs` |
| JWT settings       | `appsettings*.json` `Jwt:*` ↔ `CustomWebApplicationFactory` constants                                                   |
| Seeded admin       | `IdentitySeeder` (`admin@basiclms.local` / `Admin@123456`) ↔ `CustomWebApplicationFactory.AdminEmail/AdminPassword`     |

## 7. Building LMS domain features (target architecture)

When implementing courses/lessons/enrollments/progress:
1. Model entities in `Models/` with `int` keys; reference users through `ApplicationUser`
   (`AspNetUsers.Id`), not a custom `Users` table. Lecturer/Student relations are users in a role.
2. Add `DbSet<>`s to `ApplicationDbContext`, configure constraints/indexes in `OnModelCreating`
   (check constraints guarded with `Database.IsSqlServer()`), call `base.OnModelCreating`.
3. `dotnet ef migrations add <Feature>`; review the generated migration before applying.
   Rewrite `database/BasicLMS.sql` so it still matches the full current schema.
4. DTOs in `DTOs/<Feature>/`, controller at `api/<resource>` (plural nouns, RESTful verbs:
   `GET` list/detail, `POST` create, `PUT`/`PATCH` update, `DELETE` remove), service in `Services/`.
5. Authorization rules: Admin manages everything; Lecturer manages only courses they are assigned to;
   Student reads published courses, enrolls, and updates only their own progress. Enforce ownership
   in the service layer, not only with role attributes.
6. Integration tests for each endpoint covering 401 / 403 / 400 / 404 / happy path.
7. Frontend: API module in `ViewApp/src/api/`, page in `ViewApp/src/pages/`, route in `App.tsx`,
   nav link in `AppLayout`, translations in `errors.ts`.

## 8. Frontend conventions (summary — details in `ViewApp/README.md`)

- All HTTP goes through the shared Axios instance `ViewApp/src/api/axios.ts` (`baseURL: "/api"`,
  proxied by Vite to the API). It attaches `Authorization: Bearer <token>` from `localStorage["token"]`
  and on any 401 (except login) clears the token and dispatches `auth:unauthorized`.
- Auth state: `AuthProvider` (`contexts/AuthContext.tsx`) + `useAuth()` hook. The context object and
  types live in `contexts/auth-context.ts` so the provider file only exports a component
  (required by `eslint-plugin-react-refresh`).
- Routing guards: `ProtectedRoute` (optionally `roles={[...]}`) and `GuestRoute`. Frontend guards are
  UX only — the API is the real authority.
- Data fetching inside `useEffect` uses a `cancelled` flag to ignore stale responses (see `AdminUsers.tsx`).
- Show API errors with `getApiErrorMessages(error, fallback)` + `<Alert messages={...} />`.
- Reuse UI primitives in `components/ui/` (`Button`, `TextField`, `Alert`, `Spinner`); authenticated
  pages wrap content in `components/layout/AppLayout`, guest pages in `AuthLayout`.
- Tailwind v4: no `tailwind.config.js`; theme tokens live in `@theme` in `src/index.css`.
  Palette: indigo primary, slate neutrals, red danger, emerald success.
- TypeScript uses `verbatimModuleSyntax` → import types with `import type { ... }`.
  `noUnusedLocals`/`noUnusedParameters` are on.
- Code style in `src/`: 4-space indent, double quotes, semicolons, default-exported components
  (one per file; `ui/Spinner.tsx` is the exception with named `Spinner`/`FullPageSpinner`),
  PascalCase component files, camelCase utilities. (Root config files keep the Vite
  template style: 2 spaces, single quotes.)

## 9. Testing conventions

- One test class per endpoint group, in a feature folder (`Account/`, `Admin/`, `Dashboard/`),
  using `IClassFixture<CustomWebApplicationFactory>`.
- The fixture shares one SQLite in-memory DB per class → create data with unique emails
  (`TestHelpers.UniqueEmail(prefix)`) and never assume an empty user table.
- Helpers: `factory.CreateUserAsync(...)`, `client.LoginAsync(...)`, `factory.CreateClientAsAsync(email, pwd)`,
  `factory.CreateAuthorizedClient(token)`. Deserialize responses into records declared in `TestHelpers.cs`.
- Test names: `Method_Condition_ExpectedResult` (e.g. `ResetPassword_AsStudent_Returns403`).
- Assert both status code and the observable side effect (e.g. old password rejected after reset).

## 10. Security & configuration notes

- Secrets live in the gitignored repo-root `.env` (template: `.env.example`). `Program.cs` loads that
  file for local runs and does not override variables already set. `appsettings.json` keeps empty
  connection string, JWT key, and seed password. Production (`deploy/docker-compose.yml`) injects the
  same variables and requires `Seed__AdminPassword`. The dev fallback `Admin@123456` is only used
  when that variable is empty and the environment is not Production.
- Never log tokens or passwords; never return password hashes or security stamps in DTOs.
- JWT is stored in `localStorage` (XSS-sensitive): do not render untrusted HTML
  (`dangerouslySetInnerHTML`) anywhere in the SPA.
- CORS only allows `http://localhost:5173`; update the `Frontend` policy when adding environments.

## 11. Agent workflow rules

- Make minimal, focused changes that follow the patterns above; do not reformat unrelated code.
- Do not create git commits, push, or run destructive SQL unless the user asks.
- Do not add new packages without a clear need; prefer what is already in `BasicLMS.csproj` / `package.json`.
- When adding/changing an endpoint, update in the same change: DTOs, controller, tests,
  `ViewApp/src/api/*` types, `errors.ts` translations, and the API table in `README.md`.
