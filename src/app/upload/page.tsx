"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const handleUpload = async () => {
    if (!file) return alert("Select a file");

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;

      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("posts")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data } = supabase.storage
        .from("posts")
        .getPublicUrl(fileName);

      const publicUrl = data.publicUrl;

      // 3. Create post in DB
      const { error: insertError } = await supabase
        .from("posts")
        .insert([
          {
            media_url: publicUrl,
            user_email: "test@revolvr.net", // replace later with auth
          },
        ]);

      if (insertError) throw insertError;

      // 4. Redirect to feed
      router.push("/public-feed");
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="text-white p-10">
      <h1 className="mb-4 text-xl">Upload</h1>

      <input
        type="file"
        accept="image/*,video/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <button
        onClick={handleUpload}
        disabled={uploading}
        className="block mt-4 bg-white text-black px-4 py-2 rounded"
      >
        {uploading ? "Uploading..." : "Upload"}
      </button>
    </div>
  );
}