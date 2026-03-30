"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

const FILTERS = [
  { name: "Normal", value: "none" },
  { name: "Bright", value: "brightness(1.2) contrast(1.1)" },
  { name: "Dark", value: "brightness(0.8)" },
  { name: "Warm", value: "sepia(0.3) saturate(1.2)" },
  { name: "Cool", value: "hue-rotate(180deg) saturate(1.1)" },
  { name: "Contrast", value: "contrast(1.4)" },
  { name: "Vintage", value: "sepia(0.6) contrast(1.1) brightness(0.9)" },
  { name: "Pop", value: "saturate(1.5) contrast(1.2)" },
];

export default function UploadPage() {
  const fileRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState("none");
  const [loading, setLoading] = useState(false);

  // Handle file selection
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
  alert("Only images allowed");
  return;
}
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }

  // Handle upload
  async function handleUpload() {
    const file = fileRef.current?.files?.[0];

    if (!file) {
      alert("Select a file");
      return;
    }

    try {
      setLoading(true);

      const filePath = `${Date.now()}-${file.name}`;

      // 1. Upload to Supabase
      const { error } = await supabase.storage
        .from("posts")
        .upload(filePath, file);

      if (error) throw error;

      // 2. Get public URL
      const { data } = supabase.storage
        .from("posts")
        .getPublicUrl(filePath);

      const publicUrl = data.publicUrl;

      // 3. Save to DB
      const res = await fetch("/api/posts", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    userEmail: "test@revolvr.net", // replace later with auth
    media: [{ url: publicUrl }],
    filter: selectedFilter,
  }),
});

      const json = await res.json();

      if (!res.ok) throw new Error(json.error);

      alert("Uploaded!");

      // Reset state
      setPreviewUrl(null);
      setSelectedFilter("none");
      if (fileRef.current) fileRef.current.value = "";

    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
  <div className="p-6 text-white">
    <h1 className="text-xl mb-4">Upload</h1>

    {/* HIDDEN INPUT */}
    <input
      hidden
      ref={fileRef}
      type="file"
      accept="image/*"
      onChange={handleFileChange}
    />

    {/* CHOOSE IMAGE BUTTON */}
    <button
      onClick={() => fileRef.current?.click()}
      className="bg-white text-black px-4 py-2 rounded"
    >
      Choose Image
    </button>

    {/* PREVIEW */}
    {previewUrl && (
      <div className="w-full h-[70vh] mt-4">
        <img
          src={previewUrl}
          className="w-full h-full object-cover rounded-xl"
          style={{ filter: selectedFilter }}
          alt=""
        />
      </div>
    )}

    {/* FILTER BAR */}
    {previewUrl && (
      <div className="flex gap-2 overflow-x-auto mt-3 py-2">
        {FILTERS.map((f) => (
          <button
            key={f.name}
            onClick={() => setSelectedFilter(f.value)}
            className={`text-xs px-3 py-1 rounded-full whitespace-nowrap ${
              selectedFilter === f.value
                ? "bg-white text-black"
                : "bg-white/10 text-white"
            }`}
          >
            {f.name}
          </button>
        ))}
      </div>
    )}

    {/* UPLOAD BUTTON */}
    {previewUrl && (
      <button
        onClick={handleUpload}
        disabled={loading}
        className="mt-6 bg-white text-black px-4 py-2 rounded"
      >
        {loading ? "Uploading..." : "Upload"}
      </button>
    )}
  </div>
);