import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { isUuid } from "@/lib/presentations/form";
import { isMissingSchemaError } from "@/lib/db-errors";
import {
  SECTION_CATALOG,
  addableKinds,
  isSectionKind,
  sectionLabel,
  type SectionKind,
} from "@/lib/presentations/sections";
import { SchemaErrorScreen } from "../../../schema-error";
import { wrap, card, smallBtn, ErrorBox, SuccessBox, WizardNav, PreviewLink } from "../../ui";
import { ConfirmSubmit } from "../../confirm-submit";
import { addSection, moveSection, toggleSection, deleteSection, seedOtinska } from "./actions";

export const dynamic = "force-dynamic";

// Chyby chodí v URL jen jako KÓD; texty drží tahle mapa (neznámý kód → obecná
// hláška), aby přes odkaz nešel podvrhnout vlastní text.
const ERROR_TEXT: Record<string, string> = {
  "add-failed": "Přidání sekce se nepovedlo, zkus to znovu.",
  "move-failed": "Změna pořadí se nepovedla, zkus to znovu.",
  "toggle-failed": "Zapnutí/vypnutí sekce se nepovedlo, zkus to znovu.",
  "delete-failed": "Smazání sekce se nepovedlo, zkus to znovu.",
  singleton: "Tahle sekce už v prezentaci je — smí být jen jednou.",
  kind: "Tenhle typ sekce zatím přidat nejde.",
  "seed-not-empty":
    "Ukázkovým obsahem jde naplnit jen úplně prázdnou prezentaci (bez sekcí). Tahle už nějaké sekce má.",
  "seed-failed": "Naplnění ukázkovým obsahem se nepovedlo, zkus to prosím znovu.",
  schema:
    "Databáze není dorovnaná — chybí v ní tabulka nebo funkce pro sekce. Spusť v Supabase → SQL Editor soubor app/supabase/APLIKUJ_VSE.sql.",
};

export default async function PresentationSectionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string; seeded?: string }>;
}) {
  const { id } = await params;
  const { error, saved, seeded } = await searchParams;

  if (!isSupabaseConfigured()) redirect("/presentations");
  if (!isUuid(id)) redirect("/presentations");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: p, error: loadError } = await supabase
    .from("presentations")
    .select("id, slug, title, street, city")
    .eq("id", id)
    .maybeSingle();

  if (loadError) {
    console.error("[presentations/sections] načtení selhalo:", loadError.message);
    if (isMissingSchemaError(loadError)) {
      return <SchemaErrorScreen detail={loadError.message} />;
    }
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

  const { data: sectionsData, error: sectionsError } = await supabase
    .from("presentation_sections")
    .select("id, kind, position, enabled")
    .eq("presentation_id", p.id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  // Chybějící tabulka NENÍ „žádné sekce" — řekni to nahlas (jinak by to vypadalo
  // jako prázdná prezentace a poslalo hledat úplně jinam).
  if (sectionsError) {
    console.error("[presentations/sections] načtení sekcí selhalo:", sectionsError.message);
    if (isMissingSchemaError(sectionsError)) {
      return <SchemaErrorScreen detail={sectionsError.message} />;
    }
  }
  const sections = (sectionsData ?? []).filter((s) => isSectionKind(s.kind));
  const existingKinds = sections.map((s) => s.kind as SectionKind);
  const toAdd = addableKinds(existingKinds);
  const notReady = SECTION_CATALOG.filter((m) => !m.ready);

  return (
    <main style={wrap}>
      <div style={{ ...card, width: "46rem" }}>
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
            <WizardNav presentationId={p.id} current="sections" />
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <Link
                href={`/presentations/${p.id}/design`}
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "var(--accent)",
                  border: "1px solid var(--accent)",
                  borderRadius: "8px",
                  padding: "0.35rem 0.8rem",
                  whiteSpace: "nowrap",
                }}
              >
                🎨 Vizuální úpravy
              </Link>
              <PreviewLink slug={p.slug} />
            </div>
          </div>
          <h1 style={{ fontSize: "1.7rem", fontWeight: 700 }}>
            {p.title || [p.street, p.city].filter(Boolean).join(", ") || "Prezentace"}
          </h1>
          <p style={{ color: "var(--muted)" }}>
            Krok 4 · Sekce. Prezentace je stavebnice — sekce si přeskládej šipkami,
            vypni nebo zapni přepínačem, nebo přidej novou. Na veřejné stránce se
            zobrazí jen <strong>zapnuté</strong> sekce, a to v tomhle pořadí. Radši
            upravovat rovnou na vizuální stránce? Otevři{" "}
            <Link href={`/presentations/${p.id}/design`} style={{ color: "var(--accent)" }}>
              🎨 Vizuální úpravy
            </Link>
            .
          </p>
        </div>

        {saved ? <SuccessBox>Sekce uložena. ✅</SuccessBox> : null}
        {seeded ? (
          <SuccessBox>
            Prezentace naplněna ukázkovým obsahem Otínská. ✅ Projdi si sekce níže, nebo otevři
            náhled. Fotky a galerii doplň sám — ukázka je bez obrázků.
          </SuccessBox>
        ) : null}
        {error ? (
          <ErrorBox>{ERROR_TEXT[error] ?? "Něco se nepovedlo, zkus to prosím znovu."}</ErrorBox>
        ) : null}

        {sections.length === 0 ? (
          <div
            style={{
              border: "1px dashed #334155",
              borderRadius: "12px",
              padding: "1.5rem",
              color: "var(--muted)",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <p>
              Tahle prezentace zatím nemá žádné sekce. Buď ještě neproběhla migrace
              (spusť app/supabase/APLIKUJ_VSE.sql), nebo si sekce přidej níže. Veřejná
              stránka si zatím poradí i bez nich — dopočítá výchozí pořadí sama.
            </p>

            <div
              style={{
                borderTop: "1px solid #334155",
                paddingTop: "1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                alignItems: "flex-start",
              }}
            >
              <strong style={{ color: "var(--foreground)" }}>
                Nechce se ti začínat od prázdna?
              </strong>
              <p style={{ fontSize: "0.9rem" }}>
                Naplní prezentaci reálným ukázkovým obsahem z Otínské: úvod, přednosti, parametry,
                technický stav, ceny, okolí, reference, novinky, kalkulačku i kontakt. Fotky a
                galerii doplníš sám — ukázka je bez obrázků. Funguje jen tady, na prázdné prezentaci.
              </p>
              <form action={seedOtinska}>
                <input type="hidden" name="presentation_id" value={p.id} />
                <ConfirmSubmit
                  message={`Naplnit tuhle prezentaci ukázkovým obsahem z Otínské? Přepíše se titulek, podnadpis, popis, parametry i kontakt této prezentace ukázkovými hodnotami a vytvoří se sada sekcí. Funguje jen na prázdné prezentaci.`}
                  style={{
                    ...smallBtn,
                    padding: "0.6rem 1rem",
                    color: "var(--accent)",
                    borderColor: "var(--accent)",
                    fontWeight: 600,
                  }}
                >
                  ✨ Naplnit ukázkovým obsahem Otínská
                </ConfirmSubmit>
              </form>
            </div>
          </div>
        ) : (
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {sections.map((section, index) => {
              return (
                <li
                  key={section.id}
                  style={{
                    border: "1px solid #1e293b",
                    borderRadius: "10px",
                    padding: "0.75rem 0.9rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    flexWrap: "wrap",
                    opacity: section.enabled ? 1 : 0.55,
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem", minWidth: "12rem", flex: 1 }}>
                    <Link
                      href={`/presentations/${p.id}/sections/${section.id}`}
                      style={{ fontWeight: 600, color: "var(--foreground)" }}
                    >
                      {index + 1}. {sectionLabel(section.kind as SectionKind)}
                    </Link>
                    <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                      {section.enabled ? "zapnuto" : "vypnuto"}
                      {" · "}
                      <Link
                        href={`/presentations/${p.id}/sections/${section.id}`}
                        style={{ color: "var(--accent)" }}
                      >
                        upravit obsah
                      </Link>
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                    <form action={moveSection}>
                      <input type="hidden" name="section_id" value={section.id} />
                      <input type="hidden" name="presentation_id" value={p.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button type="submit" style={smallBtn} disabled={index === 0} title="Nahoru">
                        ↑
                      </button>
                    </form>
                    <form action={moveSection}>
                      <input type="hidden" name="section_id" value={section.id} />
                      <input type="hidden" name="presentation_id" value={p.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button
                        type="submit"
                        style={smallBtn}
                        disabled={index === sections.length - 1}
                        title="Dolů"
                      >
                        ↓
                      </button>
                    </form>
                    <form action={toggleSection}>
                      <input type="hidden" name="section_id" value={section.id} />
                      <input type="hidden" name="presentation_id" value={p.id} />
                      <input type="hidden" name="enabled" value={section.enabled ? "false" : "true"} />
                      <button type="submit" style={smallBtn}>
                        {section.enabled ? "Vypnout" : "Zapnout"}
                      </button>
                    </form>
                    <form action={deleteSection}>
                      <input type="hidden" name="section_id" value={section.id} />
                      <input type="hidden" name="presentation_id" value={p.id} />
                      <ConfirmSubmit
                        message={`Opravdu odebrat sekci „${sectionLabel(section.kind as SectionKind)}"? Obsah sekce se smaže.`}
                        style={{ ...smallBtn, color: "#fca5a5", borderColor: "rgba(248,113,113,0.4)" }}
                      >
                        Odebrat
                      </ConfirmSubmit>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* PŘIDAT SEKCI */}
        <div style={{ borderTop: "1px solid #1e293b", paddingTop: "1.25rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.75rem" }}>Přidat sekci</h2>
          {toAdd.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
              Všechny dostupné typy sekcí už v prezentaci máš.
            </p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {toAdd.map((meta) => (
                <form action={addSection} key={meta.kind}>
                  <input type="hidden" name="presentation_id" value={p.id} />
                  <input type="hidden" name="kind" value={meta.kind} />
                  <button
                    type="submit"
                    style={{ ...smallBtn, padding: "0.5rem 0.85rem" }}
                    title={meta.description}
                  >
                    + {meta.label}
                  </button>
                </form>
              ))}
            </div>
          )}
        </div>

        {/* PŘIPRAVUJEME */}
        {notReady.length > 0 ? (
          <div>
            <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--muted)" }}>
              Připravujeme (zatím nelze zapnout)
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {notReady.map((meta) => (
                <span
                  key={meta.kind}
                  title={meta.description}
                  style={{
                    ...smallBtn,
                    cursor: "default",
                    opacity: 0.5,
                    borderStyle: "dashed",
                  }}
                >
                  {meta.label} 🔒
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginTop: "0.5rem" }}>
          <Link href={`/presentations/${p.id}/texts`} style={{ color: "var(--muted)" }}>
            ← Texty
          </Link>
          <Link href={`/presentations/${p.id}/publish`} style={{ color: "var(--accent)", fontWeight: 600 }}>
            Pokračovat na zveřejnění →
          </Link>
          <Link href="/presentations" style={{ color: "var(--muted)", marginLeft: "auto" }}>
            Zpět na seznam
          </Link>
        </div>
      </div>
    </main>
  );
}
