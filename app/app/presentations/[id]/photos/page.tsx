import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { isUuid } from "@/lib/presentations/form";
import { PHOTOS_BUCKET } from "@/lib/photos";
import { wrap, card, smallBtn, ErrorBox, SuccessBox, WizardNav } from "../../ui";
import { ConfirmSubmit } from "../../confirm-submit";
import { PhotoUploader } from "./uploader";
import { deletePhoto, movePhoto, setHeroPhoto } from "./actions";

export const dynamic = "force-dynamic";

export default async function PresentationPhotosPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const { id } = await params;
  const { error, created } = await searchParams;

  if (!isSupabaseConfigured()) redirect("/presentations");
  if (!isUuid(id)) redirect("/presentations");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: p, error: loadError } = await supabase
    .from("presentations")
    .select("id, title, street, city")
    .eq("id", id)
    .maybeSingle();

  if (loadError) {
    console.error("[presentations/photos] načtení selhalo:", loadError.message);
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

  const { data: photosData, error: photosError } = await supabase
    .from("presentation_photos")
    .select("id, storage_path, is_hero, sort_order")
    .eq("presentation_id", p.id)
    .order("sort_order", { ascending: true });

  if (photosError) {
    console.error("[presentations/photos] načtení fotek selhalo:", photosError.message);
  }
  const photos = photosData ?? [];

  // Náhledy: bucket je privátní, potřebujeme podepsané (dočasné) odkazy.
  const signedUrls = new Map<string, string>();
  let storageUnavailable = false;
  if (photos.length > 0) {
    const { data: signed, error: signError } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .createSignedUrls(
        photos.map((ph) => ph.storage_path),
        60 * 60, // hodina — stránka se stejně načítá čerstvá
      );
    if (signError || !signed) {
      console.error(
        "[presentations/photos] podepsané odkazy selhaly:",
        signError?.message,
      );
      storageUnavailable = true;
    } else {
      for (const item of signed) {
        if (item.signedUrl && item.path) signedUrls.set(item.path, item.signedUrl);
      }
    }
  }

  return (
    <main style={wrap}>
      <div style={{ ...card, width: "44rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <WizardNav presentationId={p.id} current="photos" />
          <h1 style={{ fontSize: "1.7rem", fontWeight: 700 }}>
            {p.title || [p.street, p.city].filter(Boolean).join(", ") || "Prezentace"}
          </h1>
          <p style={{ color: "var(--muted)" }}>
            Krok 2 · Fotky. První dojem prodává — začni tou nejlepší. Jedna fotka je{" "}
            <strong>hlavní (hero)</strong>, ostatní tvoří galerii.
          </p>
        </div>

        {created ? (
          <SuccessBox>
            Základ je uložený. ✅ Teď přidej fotky — první nahraná se stane hlavní.
          </SuccessBox>
        ) : null}
        {error ? <ErrorBox>{error}</ErrorBox> : null}
        {storageUnavailable ? (
          <ErrorBox>
            Náhledy fotek se nepodařilo načíst. Nejspíš ještě není zapnuté úložiště
            (bucket v Supabase) — viz „kroky pro Karla".
          </ErrorBox>
        ) : null}

        <PhotoUploader presentationId={p.id} userId={user.id} photoCount={photos.length} />

        {photos.length === 0 ? (
          <div
            style={{
              border: "1px dashed #334155",
              borderRadius: "12px",
              padding: "2rem 1.5rem",
              textAlign: "center",
              color: "var(--muted)",
            }}
          >
            Zatím žádné fotky. Přidej je polem výše — klidně víc najednou.
          </div>
        ) : (
          <ul
            style={{
              listStyle: "none",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: "1rem",
            }}
          >
            {photos.map((photo, index) => {
              const url = signedUrls.get(photo.storage_path);
              return (
                <li
                  key={photo.id}
                  style={{
                    border: photo.is_hero ? "1px solid var(--accent)" : "1px solid #1e293b",
                    borderRadius: "10px",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div style={{ position: "relative", aspectRatio: "4 / 3", background: "#0f172a" }}>
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- podepsané URL jsou dočasné, next/image je neumí kešovat
                      <img
                        src={url}
                        alt={`Fotka ${index + 1}`}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      <div
                        style={{
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--muted)",
                          fontSize: "0.8rem",
                        }}
                      >
                        náhled nedostupný
                      </div>
                    )}
                    {photo.is_hero ? (
                      <span
                        style={{
                          position: "absolute",
                          top: "0.5rem",
                          left: "0.5rem",
                          background: "var(--accent)",
                          color: "#04263a",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          borderRadius: "999px",
                          padding: "0.15rem 0.6rem",
                        }}
                      >
                        Hlavní fotka
                      </span>
                    ) : null}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.4rem",
                      padding: "0.6rem",
                    }}
                  >
                    <form action={movePhoto}>
                      <input type="hidden" name="photo_id" value={photo.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button type="submit" style={smallBtn} disabled={index === 0} title="Posunout dopředu">
                        ←
                      </button>
                    </form>
                    <form action={movePhoto}>
                      <input type="hidden" name="photo_id" value={photo.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button
                        type="submit"
                        style={smallBtn}
                        disabled={index === photos.length - 1}
                        title="Posunout dozadu"
                      >
                        →
                      </button>
                    </form>
                    {!photo.is_hero ? (
                      <form action={setHeroPhoto}>
                        <input type="hidden" name="photo_id" value={photo.id} />
                        <button type="submit" style={smallBtn}>
                          Jako hlavní
                        </button>
                      </form>
                    ) : null}
                    <form action={deletePhoto} style={{ marginLeft: "auto" }}>
                      <input type="hidden" name="photo_id" value={photo.id} />
                      <ConfirmSubmit
                        message="Opravdu fotku smazat? Tohle nejde vrátit."
                        style={{ ...smallBtn, color: "#fca5a5", borderColor: "rgba(248,113,113,0.4)" }}
                      >
                        Smazat
                      </ConfirmSubmit>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginTop: "0.5rem" }}>
          <Link href={`/presentations/${p.id}/edit`} style={{ color: "var(--muted)" }}>
            ← Základ
          </Link>
          <Link href={`/presentations/${p.id}/texts`} style={{ color: "var(--accent)", fontWeight: 600 }}>
            Pokračovat na texty →
          </Link>
          <Link href="/presentations" style={{ color: "var(--muted)", marginLeft: "auto" }}>
            Zpět na seznam
          </Link>
        </div>
      </div>
    </main>
  );
}
