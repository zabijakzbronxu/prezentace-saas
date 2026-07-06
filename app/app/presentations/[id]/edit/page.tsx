import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { isUuid } from "@/lib/presentations/form";
import { updatePresentation } from "./actions";
import {
  wrap,
  card,
  label,
  hint,
  input,
  row,
  primaryBtn,
  ErrorBox,
  SuccessBox,
  WizardNav,
  PreviewLink,
} from "../../ui";

export const dynamic = "force-dynamic";

export default async function EditPresentationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const { error, saved } = await searchParams;

  if (!isSupabaseConfigured()) redirect("/presentations");
  if (!isUuid(id)) redirect("/presentations");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS: vrátí jen vlastní prezentaci. Cizí/neexistující → data null.
  const { data: p, error: loadError } = await supabase
    .from("presentations")
    .select(
      "id, slug, title, street, city, postal_code, property_type, disposition, price_czk, floor_area_m2, land_area_m2, energy_class, status",
    )
    .eq("id", id)
    .maybeSingle();

  if (loadError) {
    console.error("[presentations/edit] načtení selhalo:", loadError.message);
  }
  if (!p) {
    return (
      <main style={{ ...wrap, justifyContent: "center", textAlign: "center", gap: "1rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 700 }}>Prezentace nenalezena</h1>
        <p style={{ color: "var(--muted)", maxWidth: "28rem" }}>
          Buď neexistuje, nebo nepatří k tvému účtu.
        </p>
        <Link href="/presentations" style={{ color: "var(--accent)" }}>
          ← zpět na Moje prezentace
        </Link>
      </main>
    );
  }

  return (
    <main style={wrap}>
      <div style={card}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <WizardNav presentationId={p.id} current="edit" />
            <PreviewLink slug={p.slug} />
          </div>
          <h1 style={{ fontSize: "1.7rem", fontWeight: 700 }}>
            {p.title || [p.street, p.city].filter(Boolean).join(", ") || "Prezentace"}
          </h1>
          <p style={{ color: "var(--muted)" }}>
            Krok 1 · Základní údaje. Povinné jsou jen <strong>adresa</strong> a{" "}
            <strong>cena</strong>.
          </p>
        </div>

        {error ? <ErrorBox>{error}</ErrorBox> : null}
        {saved ? <SuccessBox>Změny uloženy. ✅</SuccessBox> : null}

        <form
          action={updatePresentation}
          style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
        >
          <input type="hidden" name="id" value={p.id} />

          <label style={label}>
            Ulice a číslo
            <input
              style={input}
              type="text"
              name="street"
              placeholder="např. Otínská 123"
              defaultValue={p.street ?? ""}
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
                defaultValue={p.city ?? ""}
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
                defaultValue={p.postal_code ?? ""}
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
                defaultValue={p.property_type ?? ""}
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
                defaultValue={p.disposition ?? ""}
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
                defaultValue={p.floor_area_m2 ?? ""}
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
                defaultValue={p.land_area_m2 ?? ""}
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
                defaultValue={p.price_czk ?? ""}
              />
            </label>
            <label style={label}>
              Energetická třída (PENB)
              <select style={input} name="energy_class" defaultValue={p.energy_class ?? ""}>
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
              defaultValue={p.title ?? ""}
            />
            <span style={hint}>
              Nepovinné — krátký poutavý název. Podrobněji ho vyladíš v kroku 3 (Texty).
            </span>
          </label>

          <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginTop: "0.5rem" }}>
            <button type="submit" style={primaryBtn}>
              Uložit změny
            </button>
            <Link href={`/presentations/${p.id}/photos`} style={{ color: "var(--accent)" }}>
              Pokračovat na fotky →
            </Link>
            <Link href="/presentations" style={{ color: "var(--muted)" }}>
              Zpět na seznam
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
