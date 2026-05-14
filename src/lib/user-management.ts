import { randomInt } from "node:crypto";

import { db } from "@/lib/db";

let usersTableEnsured = false;

export async function ensureUserManagementColumns() {
    if (usersTableEnsured) return;

    await db.$executeRawUnsafe(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3) NULL
    `);

    usersTableEnsured = true;
}

export function generatePassword(length = 8): string {
    const lower = "abcdefghijklmnopqrstuvwxyz";
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const nums = "0123456789";
    const symbols = "!@#$%^&*()-_=+[]{};:,.?";
    const all = `${lower}${upper}${nums}${symbols}`;

    const pick = (pool: string) => pool[randomInt(0, pool.length)];

    const chars = [pick(lower), pick(upper), pick(nums), pick(symbols)];
    for (let i = chars.length; i < length; i += 1) {
        chars.push(pick(all));
    }

    for (let i = chars.length - 1; i > 0; i -= 1) {
        const j = randomInt(0, i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars.join("");
}
