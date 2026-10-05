import { useEffect, useState } from "react";
import api from "../api/axios";
import { isStoredMedia } from "../api/lms";

export default function LessonMedia({ lessonId, videoUrl }: { lessonId: number; videoUrl: string }) {
    const stored = isStoredMedia(videoUrl);
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const src = stored ? blobUrl : videoUrl;

    useEffect(() => {
        if (!stored) return;

        let objectUrl: string | undefined;
        let cancelled = false;
        api.get<Blob>(`/lessons/${lessonId}/video`, { responseType: "blob" })
            .then(({ data }) => {
                if (cancelled) return;
                objectUrl = URL.createObjectURL(data);
                setBlobUrl(objectUrl);
            })
            .catch(() => {
                if (!cancelled) setBlobUrl(null);
            });

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [lessonId, stored, videoUrl]);

    if (!src) return null;

    return (
        <video controls className="mt-2 w-full max-w-xl rounded-lg bg-slate-900" src={src}>
            Trình duyệt không phát được video này.
        </video>
    );
}
