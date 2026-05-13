import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
    connectionString:
        process.env.DATABASE_URL ??
        "postgresql://postgres:postgres@localhost:5432/luckydraw?schema=public",
});

const db = new PrismaClient({ adapter });

async function main() {
    const email = process.env.SEED_ADMIN_EMAIL ?? "admin@luckydraw.local";
    const username = process.env.SEED_ADMIN_USERNAME ?? "admin";
    const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin@1234";
    const name = process.env.SEED_ADMIN_NAME ?? "Administrator";

    const hashed = await bcrypt.hash(password, 12);

    const user = await db.user.upsert({
        where: { email },
        update: { username, name, password: hashed },
        create: { email, username, name, password: hashed, role: "ADMIN" },
    });

    await db.campaign.upsert({
        where: { slug: "year-end-lucky-draw-2026" },
        update: {
            title: "Year End Lucky Draw 2026",
            description: "แคมเปญสำหรับงานส่งท้ายปี",
            status: "ACTIVE",
        },
        create: {
            title: "Year End Lucky Draw 2026",
            slug: "year-end-lucky-draw-2026",
            description: "แคมเปญสำหรับงานส่งท้ายปี",
            status: "ACTIVE",
        },
    });

    await db.campaign.upsert({
        where: { slug: "new-year-warmup-draw" },
        update: {
            title: "New Year Warmup Draw",
            description: "เตรียมแคมเปญสำหรับเปิดปีใหม่",
            status: "DRAFT",
        },
        create: {
            title: "New Year Warmup Draw",
            slug: "new-year-warmup-draw",
            description: "เตรียมแคมเปญสำหรับเปิดปีใหม่",
            status: "DRAFT",
        },
    });

    console.log(`Admin user ready: ${user.email}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => db.$disconnect());
