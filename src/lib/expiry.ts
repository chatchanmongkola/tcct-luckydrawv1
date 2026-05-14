/**
 * Lightweight expiry date checking utility
 * (no Node.js dependencies for client/middleware compatibility)
 */

export function isExpiredAt(
    expiresAt: string | Date | null | undefined,
): boolean {
    if (!expiresAt) return false;
    const date = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
    if (Number.isNaN(date.getTime())) return false;
    return date.getTime() <= Date.now();
}
