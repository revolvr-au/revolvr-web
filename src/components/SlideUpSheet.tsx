"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type SlideUpSheetProps = {
  children: ReactNode;
  open: boolean;
  onClose: () => void;
  id?: string;
};

export default function SlideUpSheet({ open, onClose, children, id }: SlideUpSheetProps) {
  const [visible, setVisible] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  const panelRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const isDragging = dragOffset > 0;

  // Mount animation
  useEffect(() => {
    if (open) {
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }
  }, [open]);

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 220); // transition duration
  }, [onClose]);

  // Drag handle gesture
  const onHandlePointerDown = useCallback((e: React.PointerEvent) => {
    dragStartY.current = e.clientY;
    handleRef.current?.setPointerCapture(e.pointerId);
  }, []);

  const onHandlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragStartY.current === null) return;
    const delta = e.clientY - dragStartY.current;
    if (delta > 0) setDragOffset(delta);
  }, []);

  const onHandlePointerUp = useCallback(() => {
    if (dragOffset > 120) {
      dismiss();
    } else {
      setDragOffset(0);
    }
    dragStartY.current = null;
  }, [dragOffset, dismiss]);

  if (!open) return null;

  const backdropOpacity = visible ? 1 : 0;
  const panelTransform = isDragging
    ? `translateY(${dragOffset}px)`
    : visible
    ? "translateY(0)"
    : "translateY(100%)";

  return (
    <div
      onClick={dismiss}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        opacity: backdropOpacity,
        transition: "opacity 0.22s ease",
      }}
    >
      <div
        id={id}
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          maxHeight: "90dvh",
          display: "flex",
          flexDirection: "column",
          transition: isDragging ? "none" : "transform 0.22s ease-out",
          transform: panelTransform,
          willChange: "transform",
        }}
      >
        <div
          ref={handleRef}
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          style={{
            flexShrink: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "12px 0 8px",
            cursor: "grab",
            touchAction: "none",
          }}
        >
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)" }} />
        </div>
        {children}
      </div>
    </div>
  );
}