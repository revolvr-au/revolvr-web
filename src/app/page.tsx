// src/app/live/page.tsx
import { redirect } from "next/navigation";

export default function LiveIndexPage() {
  redirect("/public-feed"); // or redirect("/go-live") once restored
}