import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createPresentation } from "./actions";

export const dynamic = "force-dynamic";

const wrap: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "3rem 1.5rem",
};

const card: React.CSSProperties = {
  width: "38rem",
  maxWidth: "100%",
  display: "flex",
  flexDirection: "column",
  gap: "1.25rem",
};

const label: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.35rem",
  fontSize: "0.95rem",
};

const hint: React.CSSProperties = { color: "var(--muted)", fontSize: "0.8rem" };

const input: React.CSSProperties = {
  padding: "0.65rem 0.85rem",
  borderRadius: "8px",
  border: "1px solid #334155",
  background: "#0f172a",
  color: "var(--foreground)",
  fontSize: "1rem",
};

const row: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "1rem",
};

export default async function NewPresentationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <main style={{ ...wrap, justifyContent: "center", textAlign: "center", gap: "1rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 700 }}>Nová prezentace</h1>
        <p style={{ color: "var(--muted)", maxWidth: "28rem" }}>
          Tvorba prezentací zatím není zapnutá (chybí napojení na Supabase).
        </p>
        <Link href="/" style={{ color: "var(--accent)" }}>← zpět na úvod</Link>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main style={wrap}>
      <div style={card}>
        <div>
          <p style={{ ...hint, marginBottom: "0.25rem" }}>Krok 1 z 3 · Základní údaje</p>
          <h1 style={{ fontSize: "1.7rem", fontWeight: 700 }}>Nová prezentace nemovitosti</h1>
          <p style={{ color: "var(--muted)", marginTop: "0.5rem" }}>
            Vyplň, co víš. Povinné jsou jen <strong>adresa</strong> a{" "}
            <strong>cena</strong> — zbytek můžeš doplnit později.
          </p>
        </div>

        {error ? (
          <p
            style={{
              color: "#fca5a5",
              background: "rgba(248,113,113,0.1)",
              border: "1px solid rgba(248,113,113,0.3)",
              borderRadius: "8px",
              padding: "0.7rem 0.9rem",
            }}
          >
            {error}
          </p>
        ) : null}

        <form action={createPresentation} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <label style={label}>
            Ulice a číslo
            <input style={input} type="text" name="street" placeholder="např. Otínská 123" />
          </label>

          <div style={row}>
            <label style={label}>
              Město / obec <span style={{ color: "var(--accent)" }}>*</span>
              <input style={input} type="text" name="city" placeholder="např. Praha" required />
            </label>
            <label style={label}>
              PSČ
              <input style={input} type="text" name="postal_code" placeholder="např. 153 00" inputMode="numeric" />
            </label>
          </div>

          <div style={row}>
            <label style={label}>
              Typ nemovitosti
              <input style={input} type="text" name="property_type" list="property-types" placeholder="vyber nebo napiš" />
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
              <input style={input} type="text" name="disposition" list="dispositions" placeholder="např. 3+kk" />
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
              <input style={input} type="text" name="floor_area_m2" placeholder="např. 82" inputMode="decimal" />
            </label>
            <label style={label}>
              Plocha pozemku (m²)
              <input style={input} type="text" name="land_area_m2" placeholder="např. 350" inputMode="decimal" />
            </label>
          </div>

          <div style={row}>
            <label style={label}>
              Cena (Kč) <span style={{ color: "var(--accent)" }}>*</span>
              <input style={input} type="text" name="price_czk" placeholder="např. 8 900 000" inputMode="numeric" required />
            </label>
            <label style={label}>
              Energetická třída (PENB)
              <select style={input} name="energy_class" defaultValue="">
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
            <input style={input} type="text" name="title" placeholder="např. Slunný byt 3+kk s balkonem" />
            <span style={hint}>Nepovinné — krátký poutavý název. Když ho necháš prázdný, doplníme později.</span>
          </label>

          <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginTop: "0.5rem" }}>
            <button
              type="submit"
              style={{
                padding: "0.75rem 1.4rem",
                borderRadius: "8px",
                border: "none",
                background: "var(--accent)",
                color: "#04263a",
                fontWeight: 700,
                fontSize: "1rem",
                cursor: "pointer",
              }}
            >
              Uložit a pokračovat
            </button>
            <Link href="/presentations" style={{ color: "var(--muted)" }}>
              Zrušit
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
