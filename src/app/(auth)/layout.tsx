import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "เข้าสู่ระบบ | TCCT Lucky Draw",
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
