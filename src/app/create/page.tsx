"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

export default function CreatePage() {
  const router = useRouter();

  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [caption, setCaption] = React.useState("");
  const [isPosting, setIsPosting] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

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

  function guessMediaType(f: File) {
    return f.type.startsWith("video/") ? "video" : "image";
  }

  async function handlePost() {
    if (!file) return;

    setIsPosting(true);
    setErr(null);

    try {
      // 1) Require auth email (post ownership)
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;

      const userEmail = String(authData.user?.email ?? "").trim().toLowerCase();
      if (!userEmail) {
        setErr("Please sign in before posting.");
        return;
      }

      const mediaType = guessMediaType(file);

      // 2) Upload to Supabase Storage (bucket: "posts")
      const ext = file.name.split(".").pop() || (mediaType === "video" ? "mp4" : "jpg");
      const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "") || (mediaType === "video" ? "mp4" : "jpg");
      const filePath = `${userEmail}/${Date.now()}-${Math.random().toString(16).slice(2)}.${safeExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("posts")
        .upload(filePath, file, {
          upsert: false,
          contentType: file.type || undefined,
        });

      if (uploadError || !uploadData) {
        console.error("[create] upload error", uploadError);
        setErr("Upload failed. Check the posts bucket is public + allows uploads.");
        return;
      }

      const { data: publicData } = supabase.storage.from("posts").getPublicUrl(uploadData.path);
      const publicUrl = publicData?.publicUrl;

      if (!publicUrl) {
        setErr("Upload succeeded but public URL could not be created.");
        return;
      }

      // 3) Create post in DB via API (Prisma)
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail,
          caption,
          imageUrl: publicUrl,
          mediaType,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        console.error("[create] /api/posts failed", res.status, json);
        setErr(`Post failed (${res.status}).`);
        return;
      }

      // 4) Go to feed
      router.push("/public-feed");
    } catch (e: any) {
      console.error("[create] unhandled error", e);
      setErr(e?.message ?? "Something went wrong posting.");
    } finally {
      setIsPosting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-screen-sm p-4">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={() => router.back()} className="text-white/80 hover:text-white">
          ← Back
        </button>

        <h1 className="text-lg font-semibold">Create</h1>

        <button type="button" onClick={() => router.push("/public-feed")} className="text-white/80 hover:text-white">
          Cancel
        </button>
      </div>

      {err ? (
        <div className="mb-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {err}
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <label className="block text-sm font-medium text-white/80">Upload video or image</label>

        <input
          className="mt-2 w-full text-sm text-white/80 file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-white hover:file:bg-white/15"
          type="file"
          accept="video/*,image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        {previewUrl ? (
          <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-black/20">
            {file?.type.startsWith("video/") ? (
              <video src={previewUrl} controls playsInline className="h-[360px] w-full object-contain" />
            ) : (
              <img src={previewUrl} alt="Preview" className="h-[360px] w-full object-contain" />
            )}
          </div>
        ) : null}

        <div className="mt-4">
          <label className="block text-sm font-medium text-white/80">Caption</label>
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
            canPost ? "bg-[#ff0055] text-white hover:opacity-95" : "bg-white/10 text-white/40",
          ].join(" ")}
        >
          {isPosting ? "Posting..." : "Post"}
        </button>

        <p className="mt-3 text-xs text-white/50">Posts should appear on /public-feed once the DB insert succeeds.</p>
      </div>
    </main>
  );
}
