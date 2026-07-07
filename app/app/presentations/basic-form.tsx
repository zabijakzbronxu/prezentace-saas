"use client";

// Formulář základních údajů prezentace — sdílí ho založení (krok 1)
// i editace. Běží přes useActionState: validační chyba se ukáže NA MÍSTĚ
// a rozepsané hodnoty ve formuláři zůstávají (žádné přesměrování).

import { useActionState } from "react";
import type { FormState } from "@/lib/presentations/form";
import { label, hint, input, row, primaryBtn, ErrorBox } from "./ui";

export type BasicFormDefaults = {
  street?: string | null;
  city?: string | null;
  postal_code?: string | null;
  property_type?: string | null;
  disposition?: string | null;
  floor_area_m2?: number | null;
  land_area_m2?: number | null;
  price_czk?: number | null;
  energy_class?: string | null;
  title?: string | null;
};

export function BasicFieldsForm({
  action,
  hiddenId,
  defaults = {},
  submitLabel,
  titleHint,
  footer,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  /** ID prezentace u editace (hidden pole); u založení se vynechá. */
  hiddenId?: string;
  defaults?: BasicFormDefaults;
  submitLabel: string;
  titleHint: string;
  /** Odkazy vedle tlačítka (Zrušit / Pokračovat…), dodá je stránka. */
  footer?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {state.error ? <ErrorBox>{state.error}</ErrorBox> : null}

      {hiddenId ? <input type="hidden" name="id" value={hiddenId} /> : null}

      <label style={label}>
        Ulice a číslo
        <input
          style={input}
          type="text"
          name="street"
          placeholder="např. Otínská 123"
          defaultValue={defaults.street ?? ""}
        />
      </label>

      <div style={row}>
        <label style={label}>
          Město / obec <span style={{ color: "var(--accent)" }}>*</span>
          <input
            style={input}
            type="text"
            name="city"
            placeholder="např. Praha"
            required
            defaultValue={defaults.city ?? ""}
          />
        </label>
        <label style={label}>
          PSČ
          <input
            style={input}
            type="text"
            name="postal_code"
            placeholder="např. 153 00"
            inputMode="numeric"
            defaultValue={defaults.postal_code ?? ""}
          />
        </label>
      </div>

      <div style={row}>
        <label style={label}>
          Typ nemovitosti
          <input
            style={input}
            type="text"
            name="property_type"
            list="property-types"
            placeholder="vyber nebo napiš"
            defaultValue={defaults.property_type ?? ""}
          />
          <datalist id="property-types">
            <option value="Byt" />
            <option value="Rodinný dům" />
            <option value="Pozemek" />
            <option value="Chata / chalupa" />
            <option value="Komerční prostor" />
          </datalist>
        </label>
        <label style={label}>
          Dispozice
          <input
            style={input}
            type="text"
            name="disposition"
            list="dispositions"
            placeholder="např. 3+kk"
            defaultValue={defaults.disposition ?? ""}
          />
          <datalist id="dispositions">
            <option value="1+kk" />
            <option value="1+1" />
            <option value="2+kk" />
            <option value="2+1" />
            <option value="3+kk" />
            <option value="3+1" />
            <option value="4+kk" />
            <option value="4+1" />
            <option value="5+1" />
            <option value="6 a více" />
          </datalist>
        </label>
      </div>

      <div style={row}>
        <label style={label}>
          Užitná plocha (m²)
          <input
            style={input}
            type="text"
            name="floor_area_m2"
            placeholder="např. 82"
            inputMode="decimal"
            defaultValue={defaults.floor_area_m2 ?? ""}
          />
        </label>
        <label style={label}>
          Plocha pozemku (m²)
          <input
            style={input}
            type="text"
            name="land_area_m2"
            placeholder="např. 350"
            inputMode="decimal"
            defaultValue={defaults.land_area_m2 ?? ""}
          />
        </label>
      </div>

      <div style={row}>
        <label style={label}>
          Cena (Kč) <span style={{ color: "var(--accent)" }}>*</span>
          <input
            style={input}
            type="text"
            name="price_czk"
            placeholder="např. 8 900 000"
            inputMode="numeric"
            required
            defaultValue={defaults.price_czk ?? ""}
          />
        </label>
        <label style={label}>
          Energetická třída (PENB)
          <select style={input} name="energy_class" defaultValue={defaults.energy_class ?? ""}>
            <option value="">— nevím / nevyplňovat —</option>
            <option value="A">A — mimořádně úsporná</option>
            <option value="B">B — velmi úsporná</option>
            <option value="C">C — úsporná</option>
            <option value="D">D — méně úsporná</option>
            <option value="E">E — nehospodárná</option>
            <option value="F">F — velmi nehospodárná</option>
            <option value="G">G — mimořádně nehospodárná</option>
          </select>
        </label>
      </div>

      <label style={label}>
        Titulek prezentace
        <input
          style={input}
          type="text"
          name="title"
          placeholder="např. Slunný byt 3+kk s balkonem"
          defaultValue={defaults.title ?? ""}
        />
        <span style={hint}>{titleHint}</span>
      </label>

      <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginTop: "0.5rem" }}>
        <button
          type="submit"
          disabled={pending}
          style={{ ...primaryBtn, opacity: pending ? 0.6 : 1, cursor: pending ? "wait" : "pointer" }}
        >
          {pending ? "Ukládám…" : submitLabel}
        </button>
        {footer}
      </div>
    </form>
  );
}
