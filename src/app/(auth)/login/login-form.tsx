"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { loginSchema, type LoginInput } from "@/lib/validations";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/campaigns";
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginInput) => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Username หรือรหัสผ่านไม่ถูกต้อง");
        return;
      }

      router.replace(callbackUrl);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-4">
      <div className="rounded-2xl p-8" style={{ background: "rgba(22, 32, 56, 0.85)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="mb-7">
          <p className="text-xs font-semibold tracking-[0.25em] text-slate-400 uppercase mb-2">TCCT EVENT</p>
          <h1 className="text-3xl font-bold text-white mb-1">Lucky Draw Access</h1>
          <p className="text-sm text-slate-400">Sign in to access the lucky draw system</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300" htmlFor="email">Username</label>
            <input
              id="email"
              type="text"
              placeholder="admin"
              autoComplete="username"
              className="w-full rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-cyan-400/60 transition-all"
              style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255,255,255,0.1)" }}
              {...register("email")}
            />
            {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-cyan-400/60 transition-all"
              style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255,255,255,0.1)" }}
              {...register("password")}
            />
            {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
          </div>

          {error && <p className="text-xs text-red-400 text-center">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg py-3 text-sm font-bold text-slate-900 transition-opacity disabled:opacity-60 mt-2"
            style={{ background: "linear-gradient(135deg, #22d3ee, #06b6d4)" }}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
