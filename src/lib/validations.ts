import { z } from "zod";

export const loginSchema = z.object({
    email: z.string().min(1, "กรุณากรอก Username"),
    password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

export const participantImportSchema = z.object({
    employee_id: z.string().min(1, "กรุณากรอก employee_id"),
    name: z.string().min(1, "กรุณากรอกชื่อผู้เข้าร่วม"),
    mobile: z.string().min(8, "กรุณากรอกเบอร์โทรให้ถูกต้อง"),
});

export const prizeTierSchema = z.object({
    tierName: z.string().min(1, "กรุณากรอกชื่อ tier"),
    description: z.string().optional().nullable(),
    quantity: z.number().int().min(1, "จำนวนรางวัลต้องมากกว่า 0"),
    sortOrder: z.number().int().min(1),
});

export const createCampaignSchema = z.object({
    title: z.string().min(1, "กรุณากรอกชื่ออีเวนต์"),
    description: z.string().optional().nullable(),
    bannerUrl: z.string().optional().nullable(),
    startsAt: z.string().optional().nullable(),
    endsAt: z.string().optional().nullable(),
    participants: z.array(participantImportSchema).default([]),
    prizeTiers: z
        .array(prizeTierSchema)
        .max(5, "เพิ่ม tier ได้สูงสุด 5 รายการ"),
});

export const updateCampaignSchema = z.object({
    title: z.string().min(1, "กรุณากรอกชื่ออีเวนต์"),
    description: z.string().optional().nullable(),
    bannerUrl: z.string().optional().nullable(),
    startsAt: z.string().optional().nullable(),
    endsAt: z.string().optional().nullable(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ParticipantImportInput = z.infer<typeof participantImportSchema>;
export type PrizeTierInput = z.infer<typeof prizeTierSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
