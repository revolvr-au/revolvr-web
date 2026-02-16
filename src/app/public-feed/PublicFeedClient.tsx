"use client";

import PublicFeedDock from "@/components/feed/PublicFeedDock";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import FeedLayout from "@/components/FeedLayout";
import PeopleRail, { type PersonRailItem } from "@/components/PeopleRail";
import PostActionModal from "@/components/PostActionModal";
import { createCheckout, type CheckoutMode } from "@/lib/actionsClient";
import { MediaCarousel } from "@/components/media/MediaCarousel";
import { isValidImageUrl, displayNameFromEmail, isValidEmail } from "@/utils/imageUtils";


// Define the PublicFeedClient component
export function PublicFeedClient() { 
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [commentsOpenFor, setCommentsOpenFor] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [returnBanner, setReturnBanner] = useState<null | { type: "success" | "cancel"; mode: string; targetId?: string }>(null);

  // Temporary until auth wiring
  const viewerEmail = "test@revolvr.net";
  const viewer = viewerEmail.trim().toLowerCase();

  // Declare state variables inside the component
  const [likedMap, setLikedMap] = useState<{ [key: string]: boolean }>({});
  const [likeCounts, setLikeCounts] = useState<{ [key: string]: number }>({});
  const [followMap, setFollowMap] = useState<{ [key: string]: boolean }>({});
  const [followBusy, setFollowBusy] = useState<{ [key: string]: boolean }>({});
  const [brokenPostImages, setBrokenPostImages] = useState<{ [key: string]: boolean }>({});  // Optional: Track which posts have broken images

  // Mock data for users
  const mockPeople: PersonRailItem[] = [
    { email: "singaporeair@revolvr.net", tick: "gold", isLive: true },
    { email: "mangusta@yachts.com", tick: "blue", isLive: false },
    { email: "feadship@revolvr.net", tick: null, isLive: true },
  ];

  const railItems = useMemo(() => {
    if (posts.length === 0) {
      return mockPeople; // Return mock data if no posts are available
    }

    const seen = new Set<string>();
    const out: PersonRailItem[] = [];

    for (const p of posts) {
      const email = String(p.userEmail || "").trim().toLowerCase();
      if (!email || seen.has(email)) continue;
      seen.add(email);

      out.push({
        email,
        imageUrl: isValidImageUrl(p.imageUrl) ? p.imageUrl : null, // Validate image URL
        displayName: displayNameFromEmail(email),
        tick: p.verificationTier ?? null,
      });

      if (out.length >= 20) break;
    }

    return out;
  }, [posts]);

  // useEffect for loading posts
  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch("/api/posts", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as unknown;

        if (!res.ok) {
          const msg = `Failed to load posts (${res.status})`;
          if (!cancelled) {
            setErr(msg);
            setPosts([]);
          }
          return;
        }

        const rows = Array.isArray(json) ? json : json?.posts || [];
        if (!cancelled) setPosts(rows);
      } catch (e: unknown) {
        console.error("[public-feed] load posts error", e);
        if (!cancelled) {
          setErr("Failed to load public feed.");
          setPosts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleLike(postId: string) {
    setLikedMap((prev) => {
      const newMap = { ...prev };
      newMap[postId] = !newMap[postId];
      setLikeCounts((counts) => ({
        ...counts,
        [postId]: (counts[postId] || 0) + (newMap[postId] ? 1 : -1),
      }));
      return newMap;
    });
  }

  function onToggleFollow(email: string) {
    setFollowMap((prev) => {
      const newMap = { ...prev };
      newMap[email] = !newMap[email];
      return newMap;
    });
  }

  return (
    <FeedLayout title="Revolvr" subtitle="Public feed">
      {/* The JSX markup and rendering of posts */}
    </FeedLayout>
  );
}
