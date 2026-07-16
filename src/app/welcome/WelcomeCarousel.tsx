"use client";

import React, { useEffect, useRef, useState } from "react";

type Card = { id: string; src: string; alt: string };

// Add a card = add an entry here. Nothing else changes.
// `src` is the path WITHOUT extension; <picture> appends .avif / .webp.
const CARDS: Card[] = [
  { id: "circuit", src: "/welcome/cards/revolvr-welcome-circuit-card", alt: "REVOLVR — The Circuit" },
  { id: "tranche", src: "/welcome/cards/revolvr-welcome-tranche-card", alt: "REVOLVR — TRANCHE" },
];

export default function WelcomeCarousel() {
  const [active, setActive] = useState(0);
  const rowRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Active dot = whichever card is >=60% visible within the scroll row.
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const idx = Number((entry.target as HTMLElement).dataset.idx);
            if (!Number.isNaN(idx)) setActive(idx);
          }
        }
      },
      { root: row, threshold: [0, 0.6, 1] }
    );

    for (const el of cardRefs.current) {
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, []);

  return (
    <div className="wc-wrap">
      <style>{`
        .wc-wrap {
          /* Space reserved above/below the card for wordmark + dots + email box.
             On short screens this clamps card height so the Send-code CTA stays
             above the fold. Tuned against 375x667 (iPhone SE). */
          --wc-reserve: 300px;

          /* Card width, in priority order:
             1. (100vw - 104px)  -> yields a ~40px peek of the next card each
                                     side with the 12px gap (52px gutter - 12).
             2. height-clamped    -> on short screens, derive width from the
                                     height budget so the card can't push the CTA down.
             3. 360px cap         -> desktop constraint. */
          --wc-w: min(
            calc(100vw - 104px),
            calc((100dvh - var(--wc-reserve)) * 9 / 16),
            360px
          );
          width: 100%;
        }

        .wc-row {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          overflow-y: hidden;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          /* Symmetric gutter lets the first/last card rest centered and makes
             the next card peek on the right. */
          padding-inline: max(16px, calc((100vw - var(--wc-w)) / 2));
          scroll-padding-inline: max(16px, calc((100vw - var(--wc-w)) / 2));
          padding-block: 2px;
          /* Hide scrollbar */
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .wc-row::-webkit-scrollbar { display: none; }

        .wc-card {
          flex: 0 0 var(--wc-w);
          width: var(--wc-w);
          aspect-ratio: 9 / 16;
          scroll-snap-align: center;
          border-radius: 16px;
          overflow: hidden;
          background: #0d0d0d; /* placeholder while the image decodes */
        }

        .wc-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .wc-dots {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 6px;
          margin-top: 14px;
        }
        .wc-dot {
          width: 5px;
          height: 5px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.28);
          transition: width 0.25s ease, background 0.25s ease;
        }
        .wc-dot--active {
          width: 16px;
          background: #ffffff;
        }

        @media (min-width: 768px) {
          /* Desktop: same component, just capped + centered. */
          .wc-row { justify-content: center; }
        }
      `}</style>

      <div
        className="wc-row"
        ref={rowRef}
        role="region"
        aria-label="What REVOLVR does"
      >
        {CARDS.map((card, i) => (
          <div
            key={card.id}
            className="wc-card"
            data-idx={i}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
          >
            <picture>
              <source type="image/avif" srcSet={`${card.src}.avif`} />
              <source type="image/webp" srcSet={`${card.src}.webp`} />
              <img
                className="wc-img"
                src={`${card.src}.webp`}
                alt={card.alt}
                width={1080}
                height={1920}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "auto"}
                decoding="async"
                draggable={false}
              />
            </picture>
          </div>
        ))}
      </div>

      <div className="wc-dots" aria-hidden="true">
        {CARDS.map((card, i) => (
          <span key={card.id} className={`wc-dot${i === active ? " wc-dot--active" : ""}`} />
        ))}
      </div>
    </div>
  );
}
