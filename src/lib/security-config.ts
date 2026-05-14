import "server-only";

export const securityConfig = {
    deleteEventPassword:
        process.env.DELETE_EVENT_PASSWORD ?? "change-me-delete",
    clearAllDataPassword:
        process.env.CLEAR_ALL_DATA_PASSWORD ?? "change-me-clear-all",
} as const;
