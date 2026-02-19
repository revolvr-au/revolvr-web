"use client";

import Lottie from "lottie-react";
import giftAnimation from "@/public/animations/gift.json";

export default function GiftAnimation() {
  return (
    <div className="w-6 h-6">
      <Lottie animationData={giftAnimation} loop={true} />
    </div>
  );
}
