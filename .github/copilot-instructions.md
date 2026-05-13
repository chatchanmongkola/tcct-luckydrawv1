# Copilot Instructions — Lucky Draw Management

## Project Overview

ระบบจัดการ Lucky Draw สำหรับองค์กร/อีเวนต์
ผู้ใช้สามารถสร้างแคมเปญ, จัดการผู้เข้าร่วม, สุ่มรางวัล, และดูผลลัพธ์แบบ Real-time

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes (REST)
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth.js v5 (Credentials + Google OAuth)
- **Storage:** Vercel Blob (รูปภาพรางวัล/banner)
- **Realtime:** Server-Sent Events (SSE) สำหรับแสดงผลสุ่ม
- **Version Control:** GitHub
- **Deploy (Demo):** Vercel
- **Deploy (Prod):** Linux Server + Node.js + PM2 + Nginx + SSL

## Folder Structure

```
src/
├── app/
│   ├── (auth)/           # Login, Register pages
│   ├── (dashboard)/      # Admin dashboard
│   │   ├── campaigns/    # จัดการแคมเปญ
│   │   ├── participants/ # จัดการผู้เข้าร่วม
│   │   └── prizes/       # จัดการรางวัล
│   ├── draw/[id]/        # หน้าสุ่มรางวัล (public display)
│   └── api/              # API Routes
├── components/
│   ├── ui/               # shadcn/ui base components
│   ├── draw/             # Draw animation components
│   └── dashboard/        # Dashboard-specific components
├── lib/
│   ├── db.ts             # Prisma client singleton
│   ├── auth.ts           # NextAuth config
│   └── utils.ts          # Utility functions
├── services/
│   ├── campaign.service.ts
│   ├── participant.service.ts
│   └── draw.service.ts   # Core draw logic
└── types/
    └── index.ts          # Global TypeScript types
```

## Code Conventions

- **ภาษา:** TypeScript เสมอ, ห้ามใช้ `any`
- **Component:** Functional components + React Hooks เท่านั้น
- **Async:** ใช้ `async/await` ไม่ใช้ `.then()`
- **Error Handling:** ทุก async function ต้องมี `try/catch`
- **Validation:** ใช้ Zod ทุก API route
- **Naming:**
    - Component → `PascalCase`
    - Function/variable → `camelCase`
    - Folder/file → `kebab-case`
    - DB table → `snake_case`
    - Constant → `UPPER_SNAKE_CASE`
- **Comment:** เขียนเป็นภาษาไทยได้
- **Import order:** React → Next → Third-party → Local (แยก blank line)

## API Conventions

- Base URL: `/api/v1`
- Format: JSON
- Auth: NextAuth Session (cookie-based)
- Error response: `{ success: false, error: string, code: string }`
- Success response: `{ success: true, data: T }`

## Database Rules

- ทุก table มี `created_at`, `updated_at`, `is_deleted` (soft delete)
- ใช้ UUID เป็น Primary Key ทุก table
- ใช้ Prisma transactions เมื่อมี write หลาย table

## Environment

- `.env.local` สำหรับ local dev
- `.env.production` สำหรับ production (Linux server)
- ห้าม hardcode secrets ทุกกรณี

## Related Docs

- PRD: `docs/PRD.md`
- Architecture: `docs/ARCHITECTURE.md`
- Tasks: `docs/TASKS.md`
- Changelog: `docs/CHANGELOG.md`
