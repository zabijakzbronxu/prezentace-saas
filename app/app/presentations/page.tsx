import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format";
import { PHOTOS_BUCKET } from "@/lib/photos";
import { isMissingSchemaError } from "@/lib/db-errors";
import { SchemaErrorScreen } from "../schema-error";
import { ErrorBox, SuccessBox, smallBtn } from "./ui";
import { ConfirmSubmit } from "./confirm-submit";
import { deletePresentation } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "Koncept",
  paid: "Zaplaceno",
  published: "Publikováno",
};

const wrap: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "3rem 1.5rem",
};

const container: React.CSSProperties = {
  width: "46rem",
  maxWidth: "100%",
  display: "flex",
  flexDirection: "column",
  gap: "1.5rem",
};

const primaryBtn: React.CSSProperties = {
  padding: "0.7rem 1.3rem",
  borderRadius: "8px",
  background: "var(--accent)",
  color: "#04263a",
  fontWeight: 700,
  fontSize: "1rem",
  border: "none",
  display: "inline-block",
};

const quickLink: React.CSSProperties = {
  fontSize: "0.85rem",
  color: "var(--foreground)",
  border: "1px solid #334155",
  borderRadius: "8px",
  padding: "0.3rem 0.75rem",
  whiteSpace: "nowrap",
};

export default async function PresentationsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; deleted?: string; error?: string }>;
}) {
  const { created, deleted, error } = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <main style={{ ...wrap, justifyContent: "center", textAlign: "center", gap: "1rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 700 }}>Moje prezentace</h1>
        <p style={{ color: "var(--muted)" }}>Zatím není zapnuté napojení na Supabase.</p>
        <Link href="/" style={{ color: "var(--accent)" }}>← zpět na úvod</Link>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: presentations, error: loadError } = await supabase
    .from("presentations")
    .select("id, slug, title, street, city, price_czk, status, created_at")
    .order("created_at", { ascending: false });

  // Chybu NEZAHAZUJEME: prázdný seznam ≠ chyba. Kdyby se to spolklo, maskovalo by to
  // rozbité RLS/migraci/chybějící profil. Zaloguj na server a ukaž bezpečnou hlášku.
  if (loadError) {
    console.error("[presentations] načtení selhalo:", loadError.message);
    // Chybějící sloupec/tabulka = nedorovnaná databáze. Řekni to konkrétně,
    // ať to nevypadá jako výpadek, který se sám spraví „za chvíli".
    if (isMissingSchemaError(loadError)) {
      return (
        <SchemaErrorScreen
          detail={loadError.message}
          backHref="/account"
          backLabel="← zpět na účet"
        />
      );
    }
    return (
      <main style={{ ...wrap, justifyContent: "center", textAlign: "center", gap: "1rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 700 }}>Moje prezentace</h1>
        <p style={{ color: "#fca5a5", maxWidth: "28rem" }}>
          Nepodařilo se načíst prezentace. Zkus to prosím za chvíli znovu.
        </p>
        <Link href="/account" style={{ color: "var(--muted)" }}>← zpět na účet</Link>
      </main>
    );
  }

  const list = presentations ?? [];

  // Miniatury: hlavní (hero) fotka každé prezentace; když hero chybí
  // (např. selhalo povýšení po smazání), vezme se první fotka v pořadí.
  const thumbnails = new Map<string, string>(); // presentation_id → podepsaná URL
  if (list.length > 0) {
    const { data: photos, error: photosError } = await supabase
      .from("presentation_photos")
      .select("presentation_id, storage_path, is_hero, sort_order")
      .in(
        "presentation_id",
        list.map((p) => p.id),
      )
      .order("is_hero", { ascending: false })
      .order("sort_order", { ascending: true });
    if (photosError) {
      console.error("[presentations] načtení miniatur selhalo:", photosError.message);
    }
    // Díky řazení (hero první, pak dle pořadí) je první výskyt prezentace
    // rovnou ta správná miniatura.
    const thumbPaths = new Map<string, string>();
    for (const ph of photos ?? []) {
      if (!thumbPaths.has(ph.presentation_id)) {
        thumbPaths.set(ph.presentation_id, ph.storage_path);
      }
    }
    if (thumbPaths.size > 0) {
      const paths = [...thumbPaths.values()];
      const { data: signed, error: signError } = await supabase.storage
        .from(PHOTOS_BUCKET)
        .createSignedUrls(paths, 60 * 60);
      if (signError || !signed) {
        // Bez miniatur se obejdeme — nejspíš ještě není zapnutý bucket.
        console.error("[presentations] podepsané odkazy miniatur selhaly:", signError?.message);
      } else {
        const byPath = new Map(signed.map((s) => [s.path, s.signedUrl] as const));
        for (const [presentationId, path] of thumbPaths) {
          const url = byPath.get(path);
          if (url) thumbnails.set(presentationId, url);
        }
      }
    }
  }

  return (
    <main style={wrap}>
      <div style={container}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          <h1 style={{ fontSize: "1.7rem", fontWeight: 700 }}>Moje prezentace</h1>
          <Link href="/presentations/new" style={primaryBtn}>
            + Vytvořit novou
          </Link>
        </div>

        {created ? <SuccessBox>Prezentace uložena jako koncept. ✅</SuccessBox> : null}
        {deleted ? <SuccessBox>Prezentace smazána. ✅</SuccessBox> : null}
        {error ? (
          <ErrorBox>
            {/* Kód z URL → pevná hláška; neznámý kód dostane obecnou (nikdo nepodvrhne text). */}
            {error === "delete-failed"
              ? "Smazání prezentace se nepovedlo, zkus to prosím znovu."
              : "Něco se nepovedlo, zkus to prosím znovu."}
          </ErrorBox>
        ) : null}

        {list.length === 0 ? (
          <div
            style={{
              border: "1px dashed #334155",
              borderRadius: "12px",
              padding: "2.5rem 1.5rem",
              textAlign: "center",
              color: "var(--muted)",
            }}
          >
            <p style={{ marginBottom: "1rem" }}>
              Zatím tu nic není. Založ svou první prezentaci nemovitosti.
            </p>
            <Link href="/presentations/new" style={primaryBtn}>
              + Vytvořit první prezentaci
            </Link>
          </div>
        ) : (
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {list.map((p) => {
              const thumb = thumbnails.get(p.id);
              return (
                <li
                  key={p.id}
                  style={{
                    border: "1px solid #1e293b",
                    borderRadius: "10px",
                    padding: "0.9rem 1rem",
                    display: "flex",
                    gap: "1rem",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <Link
                    href={`/presentations/${p.id}/edit`}
                    style={{
                      width: "5.5rem",
                      height: "4rem",
                      borderRadius: "8px",
                      overflow: "hidden",
                      background: "#0f172a",
                      border: "1px solid #1e293b",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element -- podepsané URL jsou dočasné
                      <img
                        src={thumb}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      <span style={{ color: "var(--muted)", fontSize: "1.4rem" }} aria-hidden>
                        🏠
                      </span>
                    )}
                  </Link>

                  <div style={{ flex: 1, minWidth: "12rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                      <Link href={`/presentations/${p.id}/edit`} style={{ fontWeight: 600 }}>
                        {p.title || [p.street, p.city].filter(Boolean).join(", ") || "Bez názvu"}
                      </Link>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--accent)",
                          border: "1px solid #334155",
                          borderRadius: "999px",
                          padding: "0.15rem 0.6rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </div>
                    <div style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: "0.2rem" }}>
                      {[p.street, p.city].filter(Boolean).join(", ") || "adresa neuvedena"} ·{" "}
                      {formatPrice(p.price_czk)}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "0.4rem",
                        marginTop: "0.6rem",
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <Link href={`/presentations/${p.id}/edit`} style={quickLink}>
                        Upravit
                      </Link>
                      <Link href={`/presentations/${p.id}/photos`} style={quickLink}>
                        Fotky
                      </Link>
                      <Link href={`/presentations/${p.id}/texts`} style={quickLink}>
                        Texty
                      </Link>
                      {p.status === "published" ? null : (
                        <Link href={`/presentations/${p.id}/publish`} style={quickLink}>
                          Zveřejnit
                        </Link>
                      )}
                      <Link
                        href={`/listing/${p.slug}`}
                        target="_blank"
                        style={{ ...quickLink, color: "var(--accent)", borderColor: "var(--accent)" }}
                      >
                        {p.status === "published" ? "Veřejná stránka ↗" : "Náhled ↗"}
                      </Link>
                      <form action={deletePresentation} style={{ marginLeft: "auto" }}>
                        <input type="hidden" name="id" value={p.id} />
                        <ConfirmSubmit
                          message={`Opravdu smazat prezentaci „${
                            p.title || [p.street, p.city].filter(Boolean).join(", ") || "Bez názvu"
                          }" včetně všech fotek? Tohle nejde vrátit.`}
                          style={{ ...smallBtn, color: "#fca5a5", borderColor: "rgba(248,113,113,0.4)" }}
                        >
                          Smazat
                        </ConfirmSubmit>
                      </form>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <Link href="/account" style={{ color: "var(--muted)" }}>← zpět na účet</Link>
      </div>
    </main>
  );
}
