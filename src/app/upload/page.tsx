"use client";

import { useRef } from "react";
import { supabase } from "@/lib/supabase";

export default function UploadPage() {
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];

    if (!file) {
      alert("Select a file");
      return;
    }

    try {
      const filePath = `${Date.now()}-${file.name}`;

      // 1. Upload to Supabase
      const { data, error } = await supabase.storage
        .from("posts")
        .upload(filePath, file);

      if (error) throw error;

      // 2. Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("posts")
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      // 3. Save post in DB
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userEmail: "test@revolvr.net",
          media: [{ url: publicUrl }],
        }),
      });

      const json = await res.json();

      if (!res.ok) throw new Error(json.error);

      alert("Uploaded!");

    } catch (err) {
      console.error(err);
      alert("Upload failed");
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-white text-xl mb-4">Upload</h1>

      <input ref={fileRef} type="file" />

      <button
        onClick={handleUpload}
        className="mt-4 bg-white text-black px-4 py-2 rounded"
      >
        Upload
      </button>
    </div>
  );
}