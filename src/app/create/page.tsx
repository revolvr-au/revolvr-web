"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export default function CreatePage() {
  const router = useRouter();
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [caption, setCaption] = React.useState("");
  const [isPosting, setIsPosting] = React.useState(false);

  React.useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const canPost = !!file && !isPosting;

  async function handlePost() {
    if (!file) return;

    setIsPosting(true);
    try {
      // v1 stub: wire this to /api/posts when ready.
      await new Promise((r) => setTimeout(r, 300));
      router.push("/public-feed");
    } finally {
      setIsPosting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-screen-sm p-4">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-white/80 hover:text-white"
        >
          ← Back
        </button>

        <h1 className="text-lg font-semibold">Create</h1>

        <button
          type="button"
          onClick={() => router.push("/public-feed")}
          className="text-white/80 hover:text-white"
        >
          Cancel
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <label className="block text-sm font-medium text-white/80">
          Upload video or image
        </label>

        <input
          className="mt-2 w-full text-sm text-white/80 file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-white hover:file:bg-white/15"
          type="file"
          accept="video/*,image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        {previewUrl && (
          <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-black/20">
            {file?.type.startsWith("video/") ? (
              <video
                src={previewUrl}
                controls
                className="h-[360px] w-full object-contain"
              />
            ) : (
              <img
                src={previewUrl}
                alt="Preview"
                className="h-[360px] w-full object-contain"
              />
            )}
          </div>
        )}

        <div className="mt-4">
          <label className="block text-sm font-medium text-white/80">
            Caption
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Say something..."
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/20"
            rows={3}
          />
        </div>

        <button
          type="button"
          disabled={!canPost}
          onClick={handlePost}
          className={[
            "mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold",
            canPost
              ? "bg-[#ff0055] text-white hover:opacity-95"
              : "bg-white/10 text-white/40",
          ].join(" ")}
        >
          {isPosting ? "Posting..." : "Post"}
        </button>

        <p className="mt-3 text-xs text-white/50">
          v1: this page is live. Next step is wiring upload storage + /api/posts.
        </p>
      </div>
    </main>
  );
}
