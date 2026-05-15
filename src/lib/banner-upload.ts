type BannerUploadSuccess = {
    success: true;
    data: {
        url: string;
        pathname: string;
    };
};

type BannerUploadError = {
    success: false;
    error: string;
    code: string;
};

export async function uploadCampaignBanner(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/v1/uploads/banner", {
        method: "POST",
        body: formData,
    });

    const payload = (await response.json().catch(() => null)) as
        | BannerUploadSuccess
        | BannerUploadError
        | null;

    if (!response.ok || !payload) {
        throw new Error("Unable to upload banner.");
    }

    if (!payload.success) {
        throw new Error(payload.error);
    }

    return payload.data.url;
}
