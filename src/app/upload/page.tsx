"use client";

import { useRef } from "react";
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

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];

    if (!file) {
      alert("Select a file");
      return;
    }

    try {
      const [selectedFilter, setSelectedFilter] = useState("none");
      const [previewUrl, setPreviewUrl] = useState<string | null>(null);
      const fileRef = useRef<HTMLInputElement>(null);
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
      const file = fileRef.current?.files?.[0];
      if (!file) {
      alert("Select a file");
      return;
      }
      const json = await res.json();

      if (!res.ok) throw new Error(json.error);

      alert("Uploaded!");

    } catch (err) {
      console.error(err);
      alert("Upload failed");
    }
  }
function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  setPreviewUrl(url);
}
  return (
    <div className="p-6">
      <h1 className="text-white text-xl mb-4">Upload</h1>

      <input ref={fileRef} type="file" />
      {previewUrl && (
  <div className="w-full h-[70vh] relative">
    <img
      src={previewUrl}
      className="w-full h-full object-cover"
      style={{ filter: selectedFilter }}
      alt=""
    />
  </div>
)}
{previewUrl && (
  <div className="flex gap-2 overflow-x-auto px-3 py-2 bg-black/60">
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
body: JSON.stringify({
  userEmail: "test@revolvr.net",
  media: [{ url: publicUrl }],
  filter: selectedFilter,
})
      <button
        onClick={handleUpload}
        className="mt-4 bg-white text-black px-4 py-2 rounded"
      >
        Upload
      </button>
    </div>
  );
}