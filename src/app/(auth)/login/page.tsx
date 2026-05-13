import { Suspense } from "react";
import LoginForm from "./login-form";

export default function LoginPage() {
    return (
        <div
            className="min-h-screen flex items-center justify-center bg-[#0d1526]"
            style={{
                background:
                    "radial-gradient(ellipse at 30% 40%, #1a2f5e 0%, #0a1020 60%)",
            }}
        >
            <Suspense>
                <LoginForm />
            </Suspense>
        </div>
    );
}
