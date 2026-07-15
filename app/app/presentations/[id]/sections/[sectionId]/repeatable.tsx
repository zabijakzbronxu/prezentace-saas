"use client";

// Sdílený editor „opakovatelných položek" (přednosti, odhady ceny, technický
// stav). Drží pole položek v paměti a serializuje ho do skrytého pole (JSON),
// které pak přečte serverová akce saveSection. Přidat / odebrat / nahoru / dolů.

import { useState } from "react";
import { input, textarea, smallBtn, label, hint } from "../../../ui";

export type ItemField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select";
  placeholder?: string;
  options?: { value: string; label: string }[];
};

type Item = Record<string, string>;

export function RepeatableItems({
  name,
  fields,
  initial,
  addLabel,
  emptyHint,
}: {
  name: string;
  fields: ItemField[];
  initial: Item[];
  addLabel: string;
  emptyHint?: string;
}) {
  const [items, setItems] = useState<Item[]>(initial.length > 0 ? initial : []);

  function update(index: number, key: string, value: string) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [key]: value } : it)));
  }
  function add() {
    const blank: Item = {};
    for (const f of fields) blank[f.key] = "";
    setItems((prev) => [...prev, blank]);
  }
  function remove(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }
  function move(index: number, dir: -1 | 1) {
    setItems((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <input type="hidden" name={name} value={JSON.stringify(items)} />

      {items.length === 0 ? (
        <p style={hint}>{emptyHint ?? "Zatím žádná položka. Přidej první tlačítkem níže."}</p>
      ) : (
        items.map((item, index) => (
          <div
            key={index}
            style={{
              border: "1px solid #1e293b",
              borderRadius: "10px",
              padding: "0.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Položka {index + 1}</span>
              <div style={{ display: "flex", gap: "0.35rem" }}>
                <button type="button" style={smallBtn} onClick={() => move(index, -1)} disabled={index === 0} title="Nahoru">
                  ↑
                </button>
                <button
                  type="button"
                  style={smallBtn}
                  onClick={() => move(index, 1)}
                  disabled={index === items.length - 1}
                  title="Dolů"
                >
                  ↓
                </button>
                <button
                  type="button"
                  style={{ ...smallBtn, color: "#fca5a5", borderColor: "rgba(248,113,113,0.4)" }}
                  onClick={() => remove(index)}
                >
                  Odebrat
                </button>
              </div>
            </div>

            {fields.map((f) => (
              <label key={f.key} style={label}>
                {f.label}
                {f.type === "textarea" ? (
                  <textarea
                    style={{ ...textarea, minHeight: "4rem" }}
                    value={item[f.key] ?? ""}
                    placeholder={f.placeholder}
                    onChange={(e) => update(index, f.key, e.target.value)}
                  />
                ) : f.type === "select" ? (
                  <select
                    style={input}
                    value={item[f.key] ?? ""}
                    onChange={(e) => update(index, f.key, e.target.value)}
                  >
                    <option value="">—</option>
                    {(f.options ?? []).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    style={input}
                    type={f.type === "number" ? "number" : "text"}
                    inputMode={f.type === "number" ? "numeric" : undefined}
                    value={item[f.key] ?? ""}
                    placeholder={f.placeholder}
                    onChange={(e) => update(index, f.key, e.target.value)}
                  />
                )}
              </label>
            ))}
          </div>
        ))
      )}

      <div>
        <button type="button" style={{ ...smallBtn, padding: "0.5rem 0.9rem" }} onClick={add}>
          + {addLabel}
        </button>
      </div>
    </div>
  );
}
