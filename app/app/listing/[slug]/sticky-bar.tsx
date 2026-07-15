"use client";

// Lišta s cenou a tlačítkem Zavolat, která se objeví, jakmile návštěvník
// odscrolluje pod úvodní blok. Drží se dole na obrazovce.

import { useEffect, useState } from "react";

export function StickyBar({
  title,
  price,
  phone,
}: {
  title: string;
  price: string;
  phone: string | null;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    function onScroll() {
      setShow(window.scrollY > 480);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(28,25,23,0.97)",
        color: "#fff",
        borderTop: "1px solid rgba(255,255,255,0.12)",
        zIndex: 60,
        padding: "0.7rem 1.25rem",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        justifyContent: "space-between",
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.65)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60vw" }}>
          {title}
        </span>
        <strong style={{ fontSize: "1.05rem" }}>{price}</strong>
      </div>
      {phone ? (
        <a
          href={`tel:${phone.replace(/\s/g, "")}`}
          style={{
            padding: "0.6rem 1.4rem",
            borderRadius: "999px",
            background: "#fff",
            color: "#1c1917",
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          Zavolat
        </a>
      ) : null}
    </div>
  );
}
