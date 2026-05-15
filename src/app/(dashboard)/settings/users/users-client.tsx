"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type UserRow = {
    id: string;
    username: string;
    role: string;
    expiresAt: string | null;
    createdAt: string;
    updatedAt: string;
};

type ApiError = { success: false; error: string; code: string };

type UserRole = "STAFF" | "ADMIN";

function generateClientPassword(length = 8) {
    const lower = "abcdefghijklmnopqrstuvwxyz";
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const nums = "0123456789";
    const symbols = "!@#$%^&*()-_=+[]{};:,.?";
    const all = `${lower}${upper}${nums}${symbols}`;

    const pick = (pool: string) =>
        pool[Math.floor(Math.random() * pool.length)];

    const chars = [pick(lower), pick(upper), pick(nums), pick(symbols)];
    for (let i = chars.length; i < length; i += 1) {
        chars.push(pick(all));
    }

    for (let i = chars.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars.join("");
}

function toDateInputValue(iso: string | null) {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
}

export function UsersClient() {
    const [users, setUsers] = useState<UserRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<UserRole>("STAFF");
    const [expiresAt, setExpiresAt] = useState("");

    const editingUser = useMemo(
        () => users.find((user) => user.id === editingUserId) ?? null,
        [editingUserId, users],
    );

    const loadUsers = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/v1/settings/users", {
                cache: "no-store",
            });
            const payload = (await response.json()) as
                | { success: true; data: UserRow[] }
                | ApiError;

            if (!response.ok || !payload.success) {
                throw new Error(
                    payload.success ? "Failed to load users." : payload.error,
                );
            }

            setUsers(payload.data);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to load users.",
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadUsers();
    }, [loadUsers]);

    const resetForm = () => {
        setEditingUserId(null);
        setUsername("");
        setPassword("");
        setRole("STAFF");
        setExpiresAt("");
    };

    const submit = async () => {
        setIsSubmitting(true);
        setError(null);

        try {
            const payload: {
                username?: string;
                password?: string;
                role?: "STAFF" | "ADMIN";
                expiresAt?: string | null;
            } = {
                username,
                role,
                expiresAt: expiresAt
                    ? new Date(`${expiresAt}T23:59:59.000Z`).toISOString()
                    : null,
            };

            if (password.trim()) {
                payload.password = password;
            }

            const isEdit = Boolean(editingUserId);
            const response = await fetch(
                isEdit
                    ? `/api/v1/settings/users/${editingUserId}`
                    : "/api/v1/settings/users",
                {
                    method: isEdit ? "PATCH" : "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                },
            );

            const json = (await response.json()) as
                | { success: true; data: UserRow }
                | ApiError;

            if (!response.ok || !json.success) {
                throw new Error(
                    json.success ? "Failed to save user." : json.error,
                );
            }

            await loadUsers();
            resetForm();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to save user.",
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const startEdit = (user: UserRow) => {
        setEditingUserId(user.id);
        setUsername(user.username);
        setPassword("");
        setRole(user.role === "ADMIN" ? "ADMIN" : "STAFF");
        setExpiresAt(toDateInputValue(user.expiresAt));
    };

    const removeUser = async (id: string) => {
        const confirmed = window.confirm("Delete this user?");
        if (!confirmed) return;

        setIsDeletingId(id);
        setError(null);

        try {
            const response = await fetch(`/api/v1/settings/users/${id}`, {
                method: "DELETE",
            });
            const json = (await response.json()) as
                | { success: true; data: unknown }
                | ApiError;

            if (!response.ok || !json.success) {
                throw new Error(
                    json.success ? "Failed to delete user." : json.error,
                );
            }

            await loadUsers();
            if (editingUserId === id) {
                resetForm();
            }
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to delete user.",
            );
        } finally {
            setIsDeletingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-black text-slate-950">
                    User Management
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    ADMIN only: create, edit, delete users and manage account
                    expiry.
                </p>
            </div>

            {error ? (
                <div className="rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                </div>
            ) : null}

            <section className="space-y-4 rounded-[16px] border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">
                    {editingUser
                        ? `Edit User: ${editingUser.username}`
                        : "Create User"}
                </h2>

                <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1.5 text-sm text-slate-700">
                        <span className="font-medium">Username</span>
                        <input
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full rounded-[6px] border border-slate-300 px-3 py-2 text-sm"
                            placeholder="username"
                        />
                    </label>

                    <label className="space-y-1.5 text-sm text-slate-700">
                        <span className="font-medium">
                            Password {editingUser ? "(optional)" : ""}
                        </span>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-[6px] border border-slate-300 px-3 py-2 text-sm"
                                placeholder="Auto gen or enter manually"
                            />
                            <button
                                type="button"
                                onClick={() =>
                                    setPassword(generateClientPassword(8))
                                }
                                className="flex-shrink-0 whitespace-nowrap rounded-[6px] border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Auto gen 8
                            </button>
                        </div>
                    </label>

                    <label className="space-y-1.5 text-sm text-slate-700">
                        <span className="font-medium">Role</span>
                        <select
                            value={role}
                            onChange={(e) =>
                                setRole(e.target.value as UserRole)
                            }
                            className="w-full rounded-[6px] border border-slate-300 px-3 py-2 text-sm"
                        >
                            <option value="STAFF">STAFF</option>
                            <option value="ADMIN">ADMIN</option>
                        </select>
                    </label>

                    <label className="space-y-1.5 text-sm text-slate-700">
                        <span className="font-medium">
                            Expire Date (optional)
                        </span>
                        <input
                            type="date"
                            value={expiresAt}
                            onChange={(e) => setExpiresAt(e.target.value)}
                            className="w-full rounded-[6px] border border-slate-300 px-3 py-2 text-sm"
                        />
                    </label>
                </div>

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => void submit()}
                        disabled={isSubmitting}
                        className="rounded-[6px] border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                        {isSubmitting
                            ? "Saving..."
                            : editingUser
                              ? "Update User"
                              : "Create User"}
                    </button>

                    {editingUser ? (
                        <button
                            type="button"
                            onClick={resetForm}
                            className="rounded-[6px] border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Cancel Edit
                        </button>
                    ) : null}
                </div>
            </section>

            <section className="space-y-3 rounded-[16px] border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">Users</h2>

                <div className="overflow-x-auto rounded-[10px] border border-slate-200">
                    <table className="min-w-full border-collapse text-left text-sm">
                        <thead className="bg-slate-50 text-slate-700">
                            <tr>
                                <th className="px-3 py-2 font-semibold">
                                    Username
                                </th>
                                <th className="px-3 py-2 font-semibold">
                                    Role
                                </th>
                                <th className="px-3 py-2 font-semibold">
                                    Expire Date
                                </th>
                                <th className="px-3 py-2 font-semibold">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="px-3 py-8 text-center text-slate-500"
                                    >
                                        Loading users...
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="px-3 py-8 text-center text-slate-500"
                                    >
                                        No users found.
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr
                                        key={user.id}
                                        className="border-t border-slate-100"
                                    >
                                        <td className="px-3 py-2">
                                            {user.username}
                                        </td>
                                        <td className="px-3 py-2">
                                            {user.role}
                                        </td>
                                        <td className="px-3 py-2">
                                            {user.expiresAt
                                                ? new Date(
                                                      user.expiresAt,
                                                  ).toLocaleDateString("en-GB")
                                                : "No expiry"}
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        startEdit(user)
                                                    }
                                                    className="rounded-[6px] border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        void removeUser(user.id)
                                                    }
                                                    disabled={
                                                        isDeletingId === user.id
                                                    }
                                                    className="rounded-[6px] border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                                                >
                                                    {isDeletingId === user.id
                                                        ? "Deleting..."
                                                        : "Delete"}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
