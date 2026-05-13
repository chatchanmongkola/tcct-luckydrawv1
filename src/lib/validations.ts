import { z } from "zod";

export const loginSchema = z.object({
    email: z.string().min(1, "กรุณากรอก Username"),
    password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

export type LoginInput = z.infer<typeof loginSchema>;
