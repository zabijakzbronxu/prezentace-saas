"use client";

// Kontaktní formulář na veřejné stránce (u kontaktní sekce). Odeslání jde do DB
// tabulky poptávek (majitel je uvidí ve svém účtu). Nikdy tiché selhání — přes
// useActionState se hláška o úspěchu/chybě ukáže rovnou u tlačítka. Anti-spam:
// skryté honeypot pole `company`. V náhledu (koncept) je odeslání vypnuté, protože
// RLS pustí poptávku jen na zveřejněnou stránku.

import { useActionState } from "react";
import { submitInquiry, type InquiryState } from "./inquiry-actions";

const INK = "#1c1917";
const MUTED = "#646463";
const BORDER = "#e7e5e4";
const PAPER_ALT = "#faf9f7";

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.7rem 0.85rem",
  borderRadius: "10px",
  border: `1px solid ${BORDER}`,
  background: "#fff",
  color: INK,
  fontSize: "0.95rem",
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.3rem",
  fontSize: "0.85rem",
  color: MUTED,
  textAlign: "left",
};

export function ContactForm({
  presentationId,
  isPreview = false,
}: {
  presentationId: string;
  isPreview?: boolean;
}) {
  const [state, formAction, pending] = useActionState<InquiryState, FormData>(submitInquiry, {});

  if (state.ok) {
    return (
      <div
        style={{
          width: "100%",
          maxWidth: "34rem",
          background: PAPER_ALT,
          border: `1px solid ${BORDER}`,
          borderRadius: "12px",
          padding: "1.5rem",
          textAlign: "center",
          color: INK,
        }}
      >
        <strong style={{ fontSize: "1.05rem" }}>Zpráva odeslána. ✅</strong>
        <p style={{ color: MUTED, marginTop: "0.5rem", lineHeight: 1.6 }}>
          Děkujeme, ozveme se vám co nejdříve.
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      style={{
        width: "100%",
        maxWidth: "34rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.8rem",
        textAlign: "left",
      }}
    >
      <input type="hidden" name="presentation_id" value={presentationId} />
      {/* Honeypot: skryté pole, které vyplní jen bot. */}
      <div style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", overflow: "hidden" }} aria-hidden="true">
        <label>
          Nevyplňujte
          <input type="text" name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label style={labelStyle}>
        Jméno
        <input style={fieldStyle} type="text" name="name" maxLength={120} required placeholder="Vaše jméno" />
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
        <label style={labelStyle}>
          E-mail
          <input style={fieldStyle} type="email" name="email" maxLength={200} placeholder="vas@email.cz" />
        </label>
        <label style={labelStyle}>
          Telefon
          <input style={fieldStyle} type="tel" name="phone" maxLength={30} placeholder="+420…" />
        </label>
      </div>
      <label style={labelStyle}>
        Zpráva
        <textarea
          style={{ ...fieldStyle, minHeight: "6rem", resize: "vertical" }}
          name="message"
          maxLength={2000}
          required
          placeholder="Dobrý den, měl(a) bych zájem o prohlídku…"
        />
      </label>

      <p style={{ fontSize: "0.75rem", color: MUTED, margin: 0 }}>
        Nechte e-mail nebo telefon, ať se vám dá odpovědět.
      </p>

      {state.error ? (
        <p
          style={{
            color: "#b91c1c",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            padding: "0.6rem 0.8rem",
            fontSize: "0.9rem",
            margin: 0,
          }}
        >
          {state.error}
        </p>
      ) : null}

      {isPreview ? (
        <p style={{ fontSize: "0.8rem", color: MUTED, margin: 0 }}>
          Náhled: formulář začne přijímat poptávky až po zveřejnění stránky.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        style={{
          alignSelf: "center",
          padding: "0.85rem 1.8rem",
          borderRadius: "999px",
          background: INK,
          color: "#fff",
          fontWeight: 600,
          border: "none",
          cursor: pending ? "wait" : "pointer",
          opacity: pending ? 0.6 : 1,
        }}
      >
        {pending ? "Odesílám…" : "Odeslat zprávu"}
      </button>
    </form>
  );
}
