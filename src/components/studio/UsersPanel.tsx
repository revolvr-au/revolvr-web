"use client";

import { useEffect, useState } from "react";

type User = {
  id: string;
  email?: string;
  handle?: string;
  created_at: string;
};

export default function UsersPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/studio/users")
      .then((res) => res.json())
      .then((data) => {
        setUsers(data.users || []);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="text-sm text-white/60">Loading users...</div>;
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-white">
      <div className="mb-3 text-sm text-white/60">Users</div>

      <div className="max-h-[400px] space-y-3 overflow-y-auto">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between border-b border-white/10 pb-2 text-sm text-white"
          >
            <div>
              <div className="font-medium">{user.email || user.handle || "User"}</div>
              <div className="text-xs text-white/40">
                {new Date(user.created_at).toLocaleDateString()}
              </div>
            </div>

            <button className="text-xs text-white/50 hover:text-white">
              View
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
