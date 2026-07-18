"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { removeEventImageAction, uploadEventImageAction } from "@/features/admin/lib/actions";
import type { EventImage } from "@/lib/api/types";
import { toAssetUrl } from "@/lib/public-env";

export default function ImageManager({ eventId, images }: { eventId: string; images: EventImage[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPoster, setIsPoster] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    setError(null);
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Choose an image file first.");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);
    formData.append("isPoster", isPoster ? "true" : "false");

    setSubmitting(true);
    const result = await uploadEventImageAction(eventId, formData);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsPoster(false);
    router.refresh();
  };

  const handleRemove = async (imageId: string) => {
    await removeEventImageAction(eventId, imageId);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {images.map((image) => (
          <div key={image.id} className="border-2 border-ink bg-white p-3">
            <div className="relative aspect-square overflow-hidden bg-black">
              <Image src={toAssetUrl(image.imageUrl)} alt="" fill sizes="300px" className="object-cover" />
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase">{image.isPoster ? "Poster" : "Gallery"}</span>
              <button type="button" onClick={() => void handleRemove(image.id)} className="text-xs font-black uppercase text-red-600 hover:underline">
                Remove
              </button>
            </div>
          </div>
        ))}
        {images.length === 0 && <p className="text-sm text-black/50 sm:col-span-2 md:col-span-3">No images yet.</p>}
      </div>

      <div className="border-2 border-ink bg-white p-5 sm:p-7">
        <span className="tag">Upload image</span>
        <div className="mt-5 space-y-4">
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="text-field h-auto py-3" />
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={isPoster} onChange={(e) => setIsPoster(e.target.checked)} className="border-black text-black focus:ring-lime" />
            Set as poster (must be exactly 1080×1080 or 1080×1920 — Instagram feed/story size)
          </label>
        </div>
        {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
        <button type="button" onClick={() => void handleUpload()} disabled={submitting} className="button button-dark mt-5 disabled:opacity-50">
          {submitting ? "Uploading…" : "Upload"}
        </button>
      </div>
    </div>
  );
}
