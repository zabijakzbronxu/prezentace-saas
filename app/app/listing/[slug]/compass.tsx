// Kompasová růžice — čistá prezentační SVG komponenta (žádné hooky, žádný stav,
// žádná knihovna). Rotuje CELOU růžici o `deg` = natočení severu ve stupních
// (0–360, po směru hodinových ručiček od svislice nahoru). Sdílí ji editor
// půdorysů i veřejný render, ať vypadá všude stejně. Bílý terč čitelný na tmavém
// (editor) i světlém (veřejná stránka) pozadí.
//
// Bez "use client": komponenta je čistě prezentační, takže ji lze importovat do
// serverového i klientského stromu.

const RING = "#d6d3d1";
const INK = "#1c1917";
const NORTH = "#d64545";
const SOUTH = "#b8b5b2";
const SANS = "system-ui, -apple-system, Segoe UI, sans-serif";

export function CompassRose({ deg = 0, size = 72 }: { deg?: number; size?: number }) {
  const rot = Number.isFinite(deg) ? deg : 0;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={`Kompas — sever natočen o ${Math.round(rot)} stupňů`}
      style={{ display: "block" }}
    >
      <circle cx="50" cy="50" r="49" fill="#ffffff" stroke={RING} strokeWidth="2" />
      <circle cx="50" cy="50" r="40" fill="none" stroke={RING} strokeWidth="1" />
      <g transform={`rotate(${rot} 50 50)`}>
        {/* jehla: severní půlka červená, jižní šedá */}
        <polygon points="50,26 45.5,50 54.5,50" fill={NORTH} />
        <polygon points="50,74 45.5,50 54.5,50" fill={SOUTH} />
        <circle cx="50" cy="50" r="3.2" fill={INK} />
        {/* světové strany: S (sever, nahoře), V, J, Z */}
        <text x="50" y="18" textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="700" fill={NORTH} fontFamily={SANS}>
          S
        </text>
        <text x="82" y="50" textAnchor="middle" dominantBaseline="central" fontSize="10" fontWeight="600" fill={INK} fontFamily={SANS}>
          V
        </text>
        <text x="50" y="82" textAnchor="middle" dominantBaseline="central" fontSize="10" fontWeight="600" fill={INK} fontFamily={SANS}>
          J
        </text>
        <text x="18" y="50" textAnchor="middle" dominantBaseline="central" fontSize="10" fontWeight="600" fill={INK} fontFamily={SANS}>
          Z
        </text>
      </g>
    </svg>
  );
}
