export const ROLE_ADMIN = "ADMIN";
export const ROLE_STAFF = "STAFF";

export function normalizeRole(role: string | null | undefined): string {
    return (role ?? "").trim().toUpperCase();
}

export function isStaffRole(role: string | null | undefined): boolean {
    const normalized = normalizeRole(role);
    return normalized === ROLE_STAFF || normalized === "USER";
}

export function isAdminRole(role: string | null | undefined): boolean {
    return normalizeRole(role) === ROLE_ADMIN;
}
