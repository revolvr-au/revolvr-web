// src/app/u/[...email]/page.tsx
import FeedLayout from "@/components/FeedLayout";

export default async function ProfilePage({ params }: { params: any }) {
  const p = await params;

  return (
    <FeedLayout title="DEBUG ROUTE HIT ✅" subtitle="src/app/u/[...email]/page.tsx">
      <div className="px-4 py-10">
        <div className="text-xl font-semibold text-white">YOU ARE HITTING [...email] ✅</div>
        <pre className="mt-4 text-xs text-white/70 whitespace-pre-wrap">
          {JSON.stringify({ params: p }, null, 2)}
        </pre>
      </div>
    </FeedLayout>
  );
}
