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
  PreviewLink,
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
    .select(
      "id, slug, title, street, city, description, location_text, features_text, contact_name, contact_email, contact_phone",
    )
    .eq("id", id)
    .maybeSingle();

  if (loadError) {
    console.error("[presentations/texts] načtení selhalo:", loadError.message);
  }

  // Předvyplnění kontaktu z profilu (jen když je kontakt prezentace celý prázdný).
  // Nic se neukládá samo — uživatel to vidí ve formuláři a ukládá tlačítkem.
  let contactDefaults = {
    name: p?.contact_name ?? "",
    phone: p?.contact_phone ?? "",
    email: p?.contact_email ?? "",
  };
  let contactPrefilled = false;
  if (p && !p.contact_name && !p.contact_phone && !p.contact_email) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.full_name || profile?.phone || user.email) {
      contactDefaults = {
        name: profile?.full_name ?? "",
        phone: profile?.phone ?? "",
        email: user.email ?? "",
      };
      contactPrefilled = true;
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
            <WizardNav presentationId={p.id} current="texts" />
            <PreviewLink slug={p.slug} />
          </div>
          <h1 style={{ fontSize: "1.7rem", fontWeight: 700 }}>
            {p.title || [p.street, p.city].filter(Boolean).join(", ") || "Prezentace"}
          </h1>
          <p style={{ color: "var(--muted)" }}>
            Krok 3 · Texty a kontakt. Piš, jako bys o bydlení vyprávěl(a) známým — co
            se vám tu žilo dobře, co je kolem, co kupující ocení. Všechno je nepovinné
            a jde kdykoli doplnit.
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
                Zobrazí se na veřejné stránce s tlačítky „Zavolat" a „Napsat e-mail".
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
                defaultValue={contactDefaults.name}
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
                  defaultValue={contactDefaults.phone}
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
                  defaultValue={contactDefaults.email}
                />
              </label>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginTop: "0.5rem" }}>
            <button type="submit" style={primaryBtn}>
              Uložit texty a kontakt
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
