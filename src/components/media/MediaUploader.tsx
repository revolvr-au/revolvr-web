"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

type MediaItem = {
  type: "image" | "video";
  url: string;
  posterUrl?: string;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function MediaUploader({
  onUploaded,
  maxFiles = 10,
}: {
  onUploaded: (media: MediaItem[]) => void;
  maxFiles?: number;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (fileList: FileList | null) => {
    setError(null);
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList).slice(0, maxFiles);

    // Basic validation (tweak caps as needed)
    for (const f of files) {
      const isOk = f.type.startsWith("image/") || f.type.startsWith("video/");
      if (!isOk) return setError("Only images and videos are allowed.");
    }

    setUploading(true);

    try {
      const uploaded: MediaItem[] = [];

      for (const file of files) {
        const ext = file.name.split(".").pop() || "bin";
        const path = `posts/${crypto.randomUUID()}.${ext}`;

        // Upload to Supabase Storage bucket "media"
        const { error: upErr } = await supabase.storage
          .from("media")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          });

        if (upErr) throw upErr;

        const { data } = supabase.storage.from("media").getPublicUrl(path);

        uploaded.push({
          type: file.type.startsWith("video/") ? "video" : "image",
          url: data.publicUrl,
        });
      }

      onUploaded(uploaded);
    } catch (e: any) {
      setError(e?.message ?? "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <input
        type="file"
        multiple
        accept="image/*,video/*"
        disabled={uploading}
        onChange={(e) => handleFiles(e.target.files)}
      />

      {uploading && <div className="text-sm text-white/60">Uploading…</div>}
      {error && <div className="text-sm text-red-400">{error}</div>}
    </div>
  );
}
