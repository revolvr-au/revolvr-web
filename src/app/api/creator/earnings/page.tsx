"use client";

import { useEffect, useState } from "react";

type EarningsResponse = {
  balances: {
    lifetimeEarned: number;
    pendingBalance: number;
    availableBalance: number;
  };
  recentPayments: {
    id: string;
    amountGross: number;
    amountCreator: number;
    currency: string;
    type: string;
    createdAt: string;
  }[];
};

export default function CreatorEarningsPage() {
  const [data, setData] = useState<EarningsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/creator/earnings", {
      headers: {
        // TEMP — replace with auth-derived creatorId
        "x-creator-id": "creator@example.com",
      },
    })
      .then((res) => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading earnings…</div>;
  if (!data) return <div>Failed to load earnings</div>;

  const { balances, recentPayments } = data;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Earnings</h1>

      {/* SUMMARY */}
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Lifetime Earned" value={balances.lifetimeEarned} />
        <Stat label="Available" value={balances.availableBalance} />
        <Stat label="Pending" value={balances.pendingBalance} />
      </div>

      {/* LEDGER */}
      <div>
        <h2 className="text-lg font-medium mb-3">Recent Activity</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b text-left">
              <th>Date</th>
              <th>Type</th>
              <th>Creator Earned</th>
            </tr>
          </thead>
          <tbody>
            {recentPayments.map((p) => (
              <tr key={p.id} className="border-b">
                <td>{new Date(p.createdAt).toLocaleString()}</td>
                <td>{p.type}</td>
                <td>
                  {(p.amountCreator / 100).toFixed(2)}{" "}
                  {p.currency.toUpperCase()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 border rounded">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-xl font-semibold">
        ${(value / 100).toFixed(2)}
      </div>
    </div>
  );
}
