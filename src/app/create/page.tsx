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
  const [error, setError] = React.useState<string | null>(null);

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

  function cleanEmail(v: string | null | undefined) {
    const e = (v ?? "").trim();
    if (!e) return null;
    if (e.toLowerCase() === "undefined") return null;
    return e.toLowerCase();
  }

  async function handlePost() {
    if (!file) return;

    setIsPosting(true);
    setError(null);

    try {
      // 1) Must be authed
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;

      const userEmail = cleanEmail(authData.user?.email ?? null);
      if (!userEmail) {
        setError("You must be signed in to post.");
        return;
      }

      // 2) Upload to Supabase Storage bucket: posts
      const ext = file.name.split(".").pop() || (file.type.startsWith("video/") ? "mp4" : "jpg");
      const filePath = `${userEmail}/${Date.now()}.${ext}`;

      const { data: storageData, error: storageErr } = await supabase.storage
        .from("posts")
        .upload(filePath, file, { upsert: true });

      if (storageErr || !storageData) {
        console.error("[create] storage upload failed", storageErr);
        setError("Upload failed. Check Supabase Storage bucket 'posts' + RLS/policies.");
        return;
      }

      const { data: publicData } = supabase.storage.from("posts").getPublicUrl(storageData.path);
      const imageUrl = publicData?.publicUrl ?? null;

      if (!imageUrl) {
        setError("Upload succeeded but could not resolve public URL.");
        return;
      }

      // 3) Create DB post via Next API route
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          userEmail,
          imageUrl,
          caption: caption.trim(),
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("[create] POST /api/posts failed", res.status, text);
        setError(`Posting failed (${res.status}). Check server logs.`);
        return;
      }

      // 4) Success -> go to feed
      router.push("/public-feed");
      router.refresh();
    } catch (e: any) {
      console.error("[create] unhandled post error", e?.message ?? e);
      setError("Posting failed. Check console/network.");
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

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <label className="block text-sm font-medium text-white/80">Upload video or image</label>

        <input
          className="mt-2 w-full text-sm text-white/80 file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-white hover:file:bg-white/15"
          type="file"
          accept="video/*,image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        {previewUrl && (
          <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-black/20">
            {file?.type.startsWith("video/") ? (
              <video src={previewUrl} controls className="h-[360px] w-full object-contain" />
            ) : (
              <img src={previewUrl} alt="Preview" className="h-[360px] w-full object-contain" />
            )}
          </div>
        )}

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

        <p className="mt-3 text-xs text-white/50">
          Posts should appear on /public-feed once the DB insert succeeds.
        </p>
      </div>
    </main>
  );
}
