import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { isUuid, MAX } from "@/lib/presentations/form";
import { updateTexts } from "./actions";
import {
  wrap,
  card,
  label,
  hint,
  input,
  textarea,
  primaryBtn,
  ErrorBox,
  SuccessBox,
  WizardNav,
} from "../../ui";

export const dynamic = "force-dynamic";

export default async function PresentationTextsPage({
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

  const { data: p, error: loadError } = await supabase
    .from("presentations")
    .select("id, title, street, city, description, location_text, features_text")
    .eq("id", id)
    .maybeSingle();

  if (loadError) {
    console.error("[presentations/texts] načtení selhalo:", loadError.message);
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
          <WizardNav presentationId={p.id} current="texts" />
          <h1 style={{ fontSize: "1.7rem", fontWeight: 700 }}>
            {p.title || [p.street, p.city].filter(Boolean).join(", ") || "Prezentace"}
          </h1>
          <p style={{ color: "var(--muted)" }}>
            Krok 3 · Texty. Piš, jako bys o bydlení vyprávěl(a) známým — co se vám tu
            žilo dobře, co je kolem, co kupující ocení. Všechno je nepovinné a jde
            kdykoli doplnit.
          </p>
        </div>

        {error ? <ErrorBox>{error}</ErrorBox> : null}
        {saved ? <SuccessBox>Texty uloženy. ✅</SuccessBox> : null}

        <form
          action={updateTexts}
          style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
        >
          <input type="hidden" name="id" value={p.id} />

          <label style={label}>
            Titulek prezentace
            <input
              style={input}
              type="text"
              name="title"
              maxLength={MAX.title}
              placeholder="např. Slunný byt 3+kk s balkonem a výhledem do zeleně"
              defaultValue={p.title ?? ""}
            />
            <span style={hint}>
              To první, co návštěvník uvidí. Max {MAX.title} znaků.
            </span>
          </label>

          <label style={label}>
            Popis a příběh nemovitosti
            <textarea
              style={textarea}
              name="description"
              maxLength={MAX.description}
              placeholder="např. Byt jsme před pěti lety kompletně zrekonstruovali. Ráno sem svítí slunce do kuchyně…"
              defaultValue={p.description ?? ""}
            />
            <span style={hint}>
              Hlavní text prezentace — stav, rekonstrukce, atmosféra. Max{" "}
              {MAX.description} znaků.
            </span>
          </label>

          <label style={label}>
            Lokalita a okolí
            <textarea
              style={textarea}
              name="location_text"
              maxLength={MAX.location_text}
              placeholder="např. Pět minut pěšky na tramvaj, škola a školka za rohem, o víkendu les hned za domem…"
              defaultValue={p.location_text ?? ""}
            />
            <span style={hint}>
              Co je v okolí — doprava, obchody, školy, příroda. Max {MAX.location_text}{" "}
              znaků.
            </span>
          </label>

          <label style={label}>
            Vybavení a přednosti
            <textarea
              style={textarea}
              name="features_text"
              maxLength={MAX.features_text}
              placeholder="např. Kuchyňská linka na míru (2023), vestavěné skříně, sklep 4 m², parkovací stání ve dvoře…"
              defaultValue={p.features_text ?? ""}
            />
            <span style={hint}>
              Co v nemovitosti zůstává a co stojí za zmínku. Max {MAX.features_text}{" "}
              znaků.
            </span>
          </label>

          <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginTop: "0.5rem" }}>
            <button type="submit" style={primaryBtn}>
              Uložit texty
            </button>
            <Link href={`/presentations/${p.id}/photos`} style={{ color: "var(--muted)" }}>
              ← Fotky
            </Link>
            <Link href="/presentations" style={{ color: "var(--muted)", marginLeft: "auto" }}>
              Zpět na seznam
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
