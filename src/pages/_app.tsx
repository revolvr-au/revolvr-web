// src/pages/_app.tsx
import type { AppProps } from "next/app";
import "@/app/globals.css"; // or wherever your global styles live
import { FloatingLiveButton } from "@/components/FloatingLiveButton";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <FloatingLiveButton />
    </>
  );
}
