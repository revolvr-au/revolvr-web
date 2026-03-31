"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Home, User, Plus, Radio, Broadcast } from "lucide-react";

// import BottomBar from "@/components/BottomBar";
// import PeopleRail from "@/components/peoplerail/PeopleRail";

import { useState, useRef } from "react";

type Props = {
  children: ReactNode;
  title?: string;
  right?: ReactNode;
  onGoLive?: () => void;
  showMenu?: boolean;
  menuHref?: string;
  isLive?: boolean;
  activePost?: string | null;
  railUsers?: any[];
  onSelectCreator?: (id: string) => void;
};

export default function FeedLayout({
  children,
  title,
  right,
  onGoLive,
  showMenu = false,
  menuHref = "/command",
  isLive = false,
  activePost,
  railUsers,
  onSelectCreator
}: Props) {

  const [peopleOpen, setPeopleOpen] = useState(false);
  const swipeStart = useRef(0);

 return (
  <div>
    {children}
  </div>
);
}