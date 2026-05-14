import { z } from "zod";

export const loginSchema = z.object({
    email: z.string().min(1, "Please enter username."),
    password: z.string().min(1, "Please enter password."),
});

export const participantImportSchema = z.object({
    employee_id: z.string().min(1, "Please enter employee_id."),
    name: z.string().min(1, "Please enter participant name."),
    mobile: z.string().min(8, "Please enter a valid mobile number."),
});

export const prizeTierSchema = z.object({
    tierName: z.string().min(1, "Please enter tier name."),
    description: z.string().optional().nullable(),
    quantity: z.number().int().min(1, "Prize quantity must be greater than 0."),
    sortOrder: z.number().int().min(1),
});

export const createCampaignSchema = z.object({
    title: z.string().min(1, "Please enter event name."),
    description: z.string().optional().nullable(),
    bannerUrl: z.string().optional().nullable(),
    startsAt: z.string().optional().nullable(),
    endsAt: z.string().optional().nullable(),
    participants: z.array(participantImportSchema).default([]),
    prizeTiers: z.array(prizeTierSchema).max(5, "You can add up to 5 tiers."),
});

export const updateCampaignSchema = z.object({
    title: z.string().min(1, "Please enter event name."),
    description: z.string().optional().nullable(),
    bannerUrl: z.string().optional().nullable(),
    startsAt: z.string().optional().nullable(),
    endsAt: z.string().optional().nullable(),
});

export const drawRequestSchema = z.object({
    prizeTierId: z.string().uuid("Invalid prizeTierId."),
});

const passwordPolicy = z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/[a-z]/, "Password must contain lowercase letters.")
    .regex(/[A-Z]/, "Password must contain uppercase letters.")
    .regex(/[0-9]/, "Password must contain numbers.")
    .regex(/[^A-Za-z0-9]/, "Password must contain symbols.");

const roleSchema = z.enum(["STAFF", "ADMIN"]);

export const createUserSchema = z.object({
    username: z
        .string()
        .trim()
        .min(3, "Username must be at least 3 characters.")
        .max(50, "Username must be no longer than 50 characters."),
    password: passwordPolicy,
    role: roleSchema.default("STAFF"),
    expiresAt: z.string().datetime().nullable().optional(),
});

export const updateUserSchema = z.object({
    username: z
        .string()
        .trim()
        .min(3, "Username must be at least 3 characters.")
        .max(50, "Username must be no longer than 50 characters.")
        .optional(),
    password: passwordPolicy.optional(),
    role: roleSchema.optional(),
    expiresAt: z.string().datetime().nullable().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ParticipantImportInput = z.infer<typeof participantImportSchema>;
export type PrizeTierInput = z.infer<typeof prizeTierSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type DrawRequestInput = z.infer<typeof drawRequestSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
