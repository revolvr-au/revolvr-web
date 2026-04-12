"use client";

import { useEffect, useState, useRef } from "react";
import { Heart } from "lucide-react";
import { createSupabaseBrowserClient } from "@/supabase-browser";
import RightRail from "@/components/RightRail";
import { useRouter } from "next/navigation";
import CommentsList from "../../components/CommentsList";
import { Send } from "lucide-react";

export default function PublicFeedClient() {
  const [posts, setPosts] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const router = useRouter();
  const [showComments, setShowComments] = useState(false);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [replyTo, setReplyTo] = useState<{
  id: string;
  userEmail: string;
} | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const listRef = useRef(null);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [sheetHeight, setSheetHeight] = useState(62);
  const [rewardMap, setRewardMap] = useState<Record<string, number>>({});
  const [followMap, setFollowMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  const sendComment = async () => {
  if (!commentText.trim() || !userEmail || !activePostId) return;

  const payload = {
    postId: activePostId,
    userEmail: userEmail,
    body: commentText,
    parentId: replyTo?.id ?? null,
  };

  const res = await fetch("/api/comments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    setCommentText("");
    setReplyTo(null);
    setRefreshKey((prev) => prev + 1);
  } else {
    console.error("Comment failed", await res.text());
  }
};

useEffect(() => {
  document.body.style.overflow = showComments ? "hidden" : "";

  return () => {
    document.body.style.overflow = "";
  };
}, [showComments]);

useEffect(() => {
  if (listRef.current) {
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }
}, [refreshKey, showComments]);
  useEffect(() => {
  fetch("/api/public-feed")
    .then((res) => res.json())
    .then((data) => {
      if (Array.isArray(data.posts)) {
        setPosts(data.posts);
      }
    })
    .catch((err) => console.error(err));
}, []);

  const activePost = posts[activeIndex];

  const toggleLike = () => {
    if (!activePost) return;
    const key = String(activePost.id ?? activeIndex);
    setLikedMap((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };
 const openComments = (postId: string) => {
  setActivePostId(postId);
  setShowComments(true);
};
const closeComments = () => {
  setShowComments(false);
  setActivePostId(null);
};
const handleShare = async (postId: string) => {
  const post = posts.find(p => p.id === postId);
  if (!post) return;

  const shareUrl = `${window.location.origin}/post/${postId}`;

  try {
    if (navigator.share) {
      await navigator.share({
        title: "Revolvr",
        text: post.caption || "Check this out",
        url: shareUrl,
      });
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert("Link copied");
    }
  } catch (err) {
    console.error("Share failed", err);
  }
};
const handleReward = (postId: string) => {
  console.log("REWARD CLICKED", postId);
  setRewardMap(prev => ({
    ...prev,
    [postId]: (prev[postId] || 0) + 1,
  }));
};
const handleCreate = () => {
  router.push("/create");
};
const handleHome = () => {
  setActiveIndex(0);
};
const handleLive = () => {
  router.push("/live");
};
const handleFollow = async (targetHandle: string, currentlyFollowing: boolean) => {
  if (!userEmail) return;

  await fetch("/api/follow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      viewerEmail: userEmail,
      targetHandle,
      action: currentlyFollowing ? "unfollow" : "follow",
    }),
  });
};

  return (
    <div
  style={{
    position: "relative",
    height: "100dvh",
    width: "100%",
    margin: "0 auto",
    overflow: "hidden"
  }}
>
{showComments && (
  <div
    onTouchStart={(e) => {
      setIsDragging(true);
      setStartY(e.touches[0].clientY);
    }}
    onTouchMove={(e) => {
  if (!isDragging) return;

  const currentY = e.touches[0].clientY;
  const delta = currentY - startY;

  // dragging DOWN
  if (delta > 0) {
    setDragY(delta);
  }

  // dragging UP (expand)
  if (delta < 0) {
    const newHeight = Math.min(90, 62 + Math.abs(delta / 5));
    setSheetHeight(newHeight);
  }
}}
    onTouchEnd={() => {
  setIsDragging(false);

  // swipe down to close
  if (dragY > 140) {
    closeComments();
    setDragY(0);
    return;
  }

  // snap logic
  if (sheetHeight > 75) {
    setSheetHeight(90); // expand
  } else {
    setSheetHeight(62); // collapse
  }

  setDragY(0);
}}
    style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,

      maxWidth: 420,
      margin: "0 auto",

      height: `${sheetHeight}dvh`,
      maxHeight: `${sheetHeight}dvh`,

      background: "#111213",
      boxShadow: "0 -6px 24px rgba(0,0,0,0.5)",
      zIndex: 200,

      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,

      display: "flex",
      flexDirection: "column",
      overflow: "hidden",

      color: "white",

      transition: isDragging ? "none" : "all 0.25s ease",
      transform: `translateY(${dragY}px)`,
      }}
      >
    {/* HEADER */}
    <div
      style={{
        flexShrink: 0,
        textAlign: "center",
        padding: "12px 16px 8px",
        fontSize: 16,
        fontWeight: 600,
        letterSpacing: "0.02em",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          width: 40,
          height: 4,
          background: "rgba(255,255,255,0.2)",
          borderRadius: 999,
          margin: "6px auto 8px",
        }}
      />
      Comments
    </div>

    {/* LIST */}
    <div
      ref={listRef}
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "6px 10px",
      }}
    >
      <CommentsList
        postId={activePostId}
        refreshKey={refreshKey}
        setReplyTo={setReplyTo}
        replyTo={replyTo}
      />
    </div>

    {/* INPUT */}
    <div
      style={{
        flexShrink: 0,
        padding: "8px 12px",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 4px)",
        background: "#0f0f10",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        transform: "translateY(-3px)",
      }}
    >
      {replyTo && (
        <div
          style={{
            fontSize: 11,
            opacity: 0.5,
            marginBottom: 5,
            paddingLeft: 4,
          }}
        >
          Replying to @{replyTo.userEmail}
          <span
            onClick={() => setReplyTo(null)}
            style={{ marginLeft: 8, cursor: "pointer", opacity: 0.7 }}
          >
            ✕
          </span>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendComment()}
          placeholder={
            replyTo
              ? `Reply to @${replyTo.userEmail}...`
              : "Add a comment..."
          }
          style={{
            flex: 1,
            height: 36,
            padding: "0 14px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.08)",
            fontSize: 16,
            background: "rgba(255,255,255,0.06)",
            color: "white",
            outline: "none",
          }}
        />
        <Send
          size={20}
          onClick={sendComment}
          style={{ cursor: "pointer", opacity: 0.85, flexShrink: 0 }}
        />
      </div>
    </div>
  </div>
)}
        <div
  onScroll={(e) => {
  const scrollTop = e.currentTarget.scrollTop;
  const index = Math.round(scrollTop / window.innerHeight);
  setActiveIndex(index);
}}
  style={{
    height: "100dvh",
    overflowY: showComments ? "hidden" : "auto",
    scrollSnapType: "y mandatory",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
  }}
  className="no-scrollbar"
   >
      
      
        {posts.map((post, i) => {
  console.log("POST DATA:", post);

  return (
    <Post
  key={post.id || i}
  post={post}
  liked={!!likedMap[String(post.id ?? i)]}
  onDoubleTapLike={() => {
    const key = String(post.id ?? i);
    setLikedMap((prev) => ({ ...prev, [key]: true }));
  }}
  onOpenComments={openComments}
  onShare={handleShare}
  onReward={handleReward}
  onCreate={handleCreate}
  onHome={handleHome}
  onLive={handleLive}
  showComments={showComments}
  rewardCount={rewardMap[post.id] || 0}
  isFollowing={!!followMap[post.handle]}
  onFollowToggle={() => {
    const current = !!followMap[post.handle];
    setFollowMap(prev => ({
      ...prev,
      [post.handle]: !current,
    }));
    handleFollow(post.handle, current);
  }}
/>
  );
})}
      </div>
    </div>
  );
}
function Post({
  post,
  liked,
  onDoubleTapLike,
  onOpenComments,
  onShare,
  onReward,
  onCreate,
  onHome,
  onLive,
  showComments,
  rewardCount,
  isFollowing,
  onFollowToggle,
}: {
  post: any;
  liked: boolean;
  onDoubleTapLike: () => void;
  onOpenComments: (postId: string) => void;
  onShare: (postId: string) => void;
  onReward: (postId: string) => void;
  onCreate: () => void;
  onHome: () => void;
  onLive: () => void;
  showComments: boolean;
  rewardCount: number;
  isFollowing: boolean;
  onFollowToggle: () => void;
}) {
  const [showBurst, setShowBurst] = useState(false);
  const [lastTap, setLastTap] = useState(0);

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      onDoubleTapLike();
      setShowBurst(true);
      setTimeout(() => setShowBurst(false), 600);
    }
    setLastTap(now);
  };

  return (
    <div
      style={{
        height: "100dvh",
        width: "100%",
        maxWidth: 420,
        margin: "0 auto",
        position: "relative",
        overflow: "hidden",
        scrollSnapAlign: "start",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      {post.imageUrl && (
        <img
          src={post.imageUrl}
          onClick={handleTap}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 0,
            cursor: "pointer",
          }}
        />
      )}

      {showComments && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 1,
            pointerEvents: "none",
          }}
        />
      )}

      {showBurst && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 20,
            pointerEvents: "none",
          }}
        >
          <Heart size={90} fill="white" stroke="none" />
        </div>
      )}

      <RightRail
  liked={liked}
  onLike={onDoubleTapLike}
  onComment={() => onOpenComments(post.id)}
  onShare={() => onShare(post.id)}
  onReward={() => onReward(post.id)}
  onCreate={() => onCreate()}
  onHome={() => onHome()}
  rewardCount={rewardCount}
  avatarUrl={post.avatarUrl}
  username={post.handle ? `@${post.handle}` : undefined}
  isFollowing={isFollowing}
  onFollowToggle={onFollowToggle}
  onAvatarTap={() => {
    if (post.handle) router.push(`/u/${post.handle}`);
  }}
/>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: 20,
          background: showComments
            ? "transparent"
            : "linear-gradient(transparent, rgba(0,0,0,0.6))",
        }}
      >
        <div
          style={{
            fontSize: 16,
            opacity: 0.75,
            fontWeight: 500,
          }}
        >
          {post.handle ? `@${post.handle}` : "user"}
        </div>

        {post.caption && (
          <div style={{ marginTop: 6 }}>
            {post.caption}
          </div>
        )}
      </div>
    </div>
  );
}