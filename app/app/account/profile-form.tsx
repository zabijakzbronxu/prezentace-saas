"use client";

// Formulář profilu — useActionState: chyba se ukáže na místě,
// vyplněné hodnoty zůstávají.

import { useActionState } from "react";
import { MAX } from "@/lib/presentations/form";
import { label, hint, input, primaryBtn, ErrorBox } from "../presentations/ui";
import { updateProfile } from "./actions";

export function ProfileForm({
  defaults,
}: {
  defaults: { full_name: string; phone: string };
}) {
  const [state, formAction, pending] = useActionState(updateProfile, {});

  return (
    <form
      action={formAction}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
        borderTop: "1px solid #1e293b",
        paddingTop: "1.25rem",
      }}
    >
      <div>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Profil</h2>
        <p style={{ ...hint, marginTop: "0.25rem" }}>
          Jméno a telefon použijeme jako předvyplnění kontaktu u nových
          prezentací. Obojí je nepovinné.
        </p>
      </div>

      {state.error ? <ErrorBox>{state.error}</ErrorBox> : null}

      <label style={label}>
        Jméno
        <input
          style={input}
          type="text"
          name="full_name"
          maxLength={MAX.contact_name}
          placeholder="např. Karel Novák"
          defaultValue={defaults.full_name}
        />
      </label>

      <label style={label}>
        Telefon
        <input
          style={input}
          type="tel"
          name="phone"
          maxLength={MAX.contact_phone}
          placeholder="např. +420 777 123 456"
          inputMode="tel"
          defaultValue={defaults.phone}
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        style={{
          ...primaryBtn,
          alignSelf: "flex-start",
          opacity: pending ? 0.6 : 1,
          cursor: pending ? "wait" : "pointer",
        }}
      >
        {pending ? "Ukládám…" : "Uložit profil"}
      </button>
    </form>
  );
}
