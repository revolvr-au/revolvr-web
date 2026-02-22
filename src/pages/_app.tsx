// src/pages/_app.tsx
import type { AppProps } from "next/app";
import "@/app/globals.css"; // or wherever your global styles live

import "@livekit/components-styles";           // LiveKit’s default styles
import "@/styles/livekit-overrides.css";       // your overrides


export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
    </>
  );
}
