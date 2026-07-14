"use client";

// Formulář kroku 3 (texty + kontakt). Přes useActionState: chyba se ukáže
// na místě a rozepsané texty zůstávají — u dlouhých textů zásadní.

import Link from "next/link";
import { useActionState } from "react";
import { MAX } from "@/lib/presentations/form";
import { label, hint, input, textarea, primaryBtn, ErrorBox } from "../../ui";
import { updateTexts } from "./actions";

export type TextsFormDefaults = {
  title: string;
  description: string;
  location_text: string;
  features_text: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
};

export function TextsForm({
  presentationId,
  defaults,
  contactPrefilled,
}: {
  presentationId: string;
  defaults: TextsFormDefaults;
  contactPrefilled: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateTexts, {});

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {state.error ? <ErrorBox>{state.error}</ErrorBox> : null}

      <input type="hidden" name="id" value={presentationId} />

      <label style={label}>
        Titulek prezentace
        <input
          style={input}
          type="text"
          name="title"
          maxLength={MAX.title}
          placeholder="např. Slunný byt 3+kk s balkonem a výhledem do zeleně"
          defaultValue={defaults.title}
        />
        <span style={hint}>To první, co návštěvník uvidí. Max {MAX.title} znaků.</span>
      </label>

      <label style={label}>
        Popis a příběh nemovitosti
        <textarea
          style={textarea}
          name="description"
          maxLength={MAX.description}
          placeholder="např. Byt jsme před pěti lety kompletně zrekonstruovali. Ráno sem svítí slunce do kuchyně…"
          defaultValue={defaults.description}
        />
        <span style={hint}>
          Hlavní text prezentace — stav, rekonstrukce, atmosféra. Max {MAX.description} znaků.
        </span>
      </label>

      <label style={label}>
        Lokalita a okolí
        <textarea
          style={textarea}
          name="location_text"
          maxLength={MAX.location_text}
          placeholder="např. Pět minut pěšky na tramvaj, škola a školka za rohem, o víkendu les hned za domem…"
          defaultValue={defaults.location_text}
        />
        <span style={hint}>
          Co je v okolí — doprava, obchody, školy, příroda. Max {MAX.location_text} znaků.
        </span>
      </label>

      <label style={label}>
        Vybavení a přednosti
        <textarea
          style={textarea}
          name="features_text"
          maxLength={MAX.features_text}
          placeholder="např. Kuchyňská linka na míru (2023), vestavěné skříně, sklep 4 m², parkovací stání ve dvoře…"
          defaultValue={defaults.features_text}
        />
        <span style={hint}>
          Co v nemovitosti zůstává a co stojí za zmínku. Max {MAX.features_text} znaků.
        </span>
      </label>

      <div
        style={{
          borderTop: "1px solid #1e293b",
          paddingTop: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Kontakt pro zájemce</h2>
          <p style={{ ...hint, marginTop: "0.25rem" }}>
            Zobrazí se na veřejné stránce s tlačítky &bdquo;Zavolat&ldquo; a &bdquo;Napsat e-mail&ldquo;.
            Dokud kontakt nevyplníš, sekce se zájemcům neukáže — a nemají se jak ozvat.
            {contactPrefilled
              ? " Předvyplnili jsme údaje z tvého účtu — zkontroluj je a ulož."
              : ""}
          </p>
        </div>

        <label style={label}>
          Jméno
          <input
            style={input}
            type="text"
            name="contact_name"
            maxLength={MAX.contact_name}
            placeholder="např. Karel Novák"
            defaultValue={defaults.contact_name}
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <label style={label}>
            Telefon
            <input
              style={input}
              type="tel"
              name="contact_phone"
              maxLength={MAX.contact_phone}
              placeholder="např. +420 777 123 456"
              inputMode="tel"
              defaultValue={defaults.contact_phone}
            />
          </label>
          <label style={label}>
            E-mail
            <input
              style={input}
              type="email"
              name="contact_email"
              maxLength={MAX.contact_email}
              placeholder="např. karel@email.cz"
              inputMode="email"
              defaultValue={defaults.contact_email}
            />
          </label>
        </div>
      </div>

      <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginTop: "0.5rem" }}>
        <button
          type="submit"
          disabled={pending}
          style={{ ...primaryBtn, opacity: pending ? 0.6 : 1, cursor: pending ? "wait" : "pointer" }}
        >
          {pending ? "Ukládám…" : "Uložit texty a kontakt"}
        </button>
        <Link href={`/presentations/${presentationId}/photos`} style={{ color: "var(--muted)" }}>
          ← Fotky
        </Link>
        <Link href="/presentations" style={{ color: "var(--muted)", marginLeft: "auto" }}>
          Zpět na seznam
        </Link>
      </div>
    </form>
  );
}
