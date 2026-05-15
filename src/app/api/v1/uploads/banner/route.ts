import { put } from "@vercel/blob";

import { fail, ok } from "@/lib/api-response";

const MAX_BANNER_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
]);

function getFileExtension(file: File): string {
    const nameMatch = /\.[a-z0-9]+$/i.exec(file.name);
    if (nameMatch) {
        return nameMatch[0].toLowerCase();
    }

    switch (file.type) {
        case "image/png":
            return ".png";
        case "image/webp":
            return ".webp";
        case "image/gif":
            return ".gif";
        case "image/jpeg":
        default:
            return ".jpg";
    }
}

export async function POST(request: Request) {
    try {
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
            return fail(
                "Banner upload requires BLOB_READ_WRITE_TOKEN. Add it to .env.local for localhost, or run the app on Vercel with Blob storage configured.",
                "BLOB_TOKEN_MISSING",
                { status: 500 },
            );
        }

        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            return fail("Banner file is required.", "BANNER_FILE_REQUIRED", {
                status: 400,
            });
        }

        if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
            return fail(
                "Only JPG, PNG, WEBP, and GIF banner images are supported.",
                "BANNER_FILE_TYPE_INVALID",
                { status: 400 },
            );
        }

        if (file.size > MAX_BANNER_SIZE) {
            return fail(
                "Banner image must be 5 MB or smaller.",
                "BANNER_FILE_TOO_LARGE",
                { status: 400 },
            );
        }

        const timestamp = new Date().toISOString().replace(/[.:]/g, "-");
        const pathname = `campaign-banners/${timestamp}-${crypto.randomUUID()}${getFileExtension(file)}`;

        const blob = await put(pathname, file, {
            access: "public",
            contentType: file.type,
        });

        return ok({
            url: blob.url,
            pathname: blob.pathname,
        });
    } catch (error) {
        console.error("Failed to upload banner", error);
        return fail("Failed to upload banner.", "BANNER_UPLOAD_FAILED", {
            status: 500,
        });
    }
}
