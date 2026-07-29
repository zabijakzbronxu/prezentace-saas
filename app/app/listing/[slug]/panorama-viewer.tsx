"use client";

// Interaktivní 360° prohlížeč — BEZ cizí knihovny a bez placeného klíče.
// Vlastní minimální WebGL: equirektangulární fotka se natáhne na kouli, kamera
// sedí uvnitř a otáčí se tažením (myš i prst) + zoom. Hotspoty (klikací body)
// se promítají STEJNÝMI maticemi jako shader (sdílená čistá funkce projectHotspot
// v sections.ts), takže špendlík vždy sedí na stejném místě fotky jako v editoru.
//
// SSR-bezpečné: všechno kolem `window`/`canvas` běží až v useEffect. Když WebGL
// nebo textura selže (starý prohlížeč, CORS), spadne to na statický obrázek —
// nikdy prázdno ani pád. Stejný „klientský ostrov" jako FloorplansView.

import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as RPointerEvent } from "react";
import { projectHotspot } from "@/lib/presentations/sections";

const INK = "#1c1917";
const MUTED = "#646463";
const BORDER = "#e7e5e4";

export type PanoramaHotspotView = {
  id: string;
  yaw: number;
  pitch: number;
  title?: string;
  description?: string;
  url?: string;
};
export type PanoramaSceneView = {
  id: string;
  title?: string;
  url?: string;
  hotspots: PanoramaHotspotView[];
};

const FOV_MIN = 40;
const FOV_MAX = 100;
const PITCH_LIMIT = 85;

// ---- malé mat4 pomůcky (column-major, stejná konvence jako projectHotspot) ----
type Mat4 = number[];
function mat4Perspective(fovYdeg: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1 / Math.tan((fovYdeg * Math.PI) / 360);
  const nf = 1 / (near - far);
  return [
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0,
  ];
}
function mat4RotX(a: number): Mat4 {
  const c = Math.cos(a), s = Math.sin(a);
  return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
}
function mat4RotY(a: number): Mat4 {
  const c = Math.cos(a), s = Math.sin(a);
  return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
}
function mat4Mul(a: Mat4, b: Mat4): Mat4 {
  const r = new Array(16).fill(0);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[col * 4 + k];
      r[col * 4 + row] = sum;
    }
  }
  return r;
}

// ---- koule (equirektangulární UV) -----------------------------------
function buildSphere(latBands: number, lonBands: number) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const R = 10;
  const d2r = Math.PI / 180;
  for (let i = 0; i <= latBands; i++) {
    const phi = 90 - (i / latBands) * 180; // +90 nahoře → -90 dole
    const cp = Math.cos(phi * d2r), sp = Math.sin(phi * d2r);
    for (let j = 0; j <= lonBands; j++) {
      const lam = -180 + (j / lonBands) * 360; // -180 vlevo → +180 vpravo
      const sl = Math.sin(lam * d2r), cl = Math.cos(lam * d2r);
      // dir = Ry(lam)*Rx(phi)*(0,0,-1) — shodné s projectHotspot
      positions.push(-sl * cp * R, sp * R, -cl * cp * R);
      uvs.push(j / lonBands, (phi + 90) / 180); // u=(lam+180)/360, v=(phi+90)/180
    }
  }
  const stride = lonBands + 1;
  for (let i = 0; i < latBands; i++) {
    for (let j = 0; j < lonBands; j++) {
      const a = i * stride + j;
      const b = a + stride;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  return {
    positions: new Float32Array(positions),
    uvs: new Float32Array(uvs),
    indices: new Uint16Array(indices),
  };
}

const VERT_SRC = `
attribute vec3 aPos;
attribute vec2 aUV;
uniform mat4 uMVP;
varying vec2 vUV;
void main() {
  gl_Position = uMVP * vec4(aPos, 1.0);
  vUV = aUV;
}`;
const FRAG_SRC = `
precision mediump float;
uniform sampler2D uTex;
varying vec2 vUV;
void main() {
  gl_FragColor = texture2D(uTex, vUV);
}`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error("[panorama] shader:", gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export function PanoramaViewer({
  scenes,
  caption,
}: {
  scenes: PanoramaSceneView[];
  caption?: string;
}) {
  const [active, setActive] = useState(0);
  const [camYaw, setCamYaw] = useState(0);
  const [camPitch, setCamPitch] = useState(0);
  const [fov, setFov] = useState(75);
  const [size, setSize] = useState({ w: 1, h: 1 });
  const [ready, setReady] = useState(false); // textura nahraná
  const [failed, setFailed] = useState(false); // WebGL/textura selhala → fallback
  const [openHotspot, setOpenHotspot] = useState<PanoramaHotspotView | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const progRef = useRef<WebGLProgram | null>(null);
  const buffersRef = useRef<{ pos: WebGLBuffer; uv: WebGLBuffer; idx: WebGLBuffer; count: number } | null>(null);
  const texRef = useRef<WebGLTexture | null>(null);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchDist = useRef<number | null>(null);

  const scene = scenes[active] ?? scenes[0];
  const aspect = size.w / Math.max(1, size.h);

  // --- inicializace WebGL (jednou) ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let gl: WebGLRenderingContext | null = null;
    try {
      gl = (canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    } catch {
      gl = null;
    }
    if (!gl) {
      setFailed(true);
      return;
    }
    const vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) {
      setFailed(true);
      return;
    }
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("[panorama] program:", gl.getProgramInfoLog(prog));
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      setFailed(true);
      return;
    }
    // Po slinkování už zdrojové shadery nejsou potřeba (program má vlastní kopii).
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    const sphere = buildSphere(32, 64);
    const pos = gl.createBuffer(), uv = gl.createBuffer(), idx = gl.createBuffer();
    if (!pos || !uv || !idx) {
      setFailed(true);
      return;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, pos);
    gl.bufferData(gl.ARRAY_BUFFER, sphere.positions, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, uv);
    gl.bufferData(gl.ARRAY_BUFFER, sphere.uvs, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idx);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphere.indices, gl.STATIC_DRAW);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.06, 0.06, 0.07, 1);

    glRef.current = gl;
    progRef.current = prog;
    buffersRef.current = { pos, uv, idx, count: sphere.indices.length };

    // Ztráta WebGL kontextu (mobil v pozadí, tlak na GPU paměť): spadni na statickou
    // fotku — bez tohohle by zůstalo trvale černé plátno. `webglcontextrestored`
    // schválně neřešíme: fallback (fotka) je plnohodnotný a obnova by vyžadovala
    // kompletní reinicializaci; uživatel ji dostane obnovením stránky.
    const onContextLost = (e: Event) => {
      e.preventDefault();
      setFailed(true);
    };
    canvas.addEventListener("webglcontextlost", onContextLost);

    return () => {
      canvas.removeEventListener("webglcontextlost", onContextLost);
      const g = glRef.current;
      if (g) {
        if (texRef.current) g.deleteTexture(texRef.current);
        g.deleteBuffer(pos);
        g.deleteBuffer(uv);
        g.deleteBuffer(idx);
        g.deleteProgram(prog);
      }
      glRef.current = null;
    };
  }, []);

  // --- sledování velikosti ---
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setSize({ w: Math.max(1, Math.round(rect.width)), h: Math.max(1, Math.round(rect.height)) });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // --- nahrání textury při změně scény ---
  useEffect(() => {
    const gl = glRef.current;
    if (!gl || failed || !scene?.url) return;
    setReady(false);
    const img = new Image();
    img.crossOrigin = "anonymous";
    let cancelled = false;
    img.onload = () => {
      if (cancelled) return;
      try {
        if (texRef.current) gl.deleteTexture(texRef.current);
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        texRef.current = tex;
        setReady(true);
      } catch (e) {
        console.error("[panorama] textura selhala:", e);
        setFailed(true);
      }
    };
    img.onerror = () => {
      if (!cancelled) setFailed(true);
    };
    img.src = scene.url;
    return () => {
      cancelled = true;
    };
  }, [scene?.url, failed]);

  // --- vykreslení při každé změně pohledu/velikosti ---
  useEffect(() => {
    const gl = glRef.current;
    const prog = progRef.current;
    const bufs = buffersRef.current;
    const canvas = canvasRef.current;
    if (!gl || !prog || !bufs || !canvas || !ready) return;

    const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    const pw = Math.round(size.w * dpr), ph = Math.round(size.h * dpr);
    if (canvas.width !== pw) canvas.width = pw;
    if (canvas.height !== ph) canvas.height = ph;
    gl.viewport(0, 0, pw, ph);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(prog);

    const proj = mat4Perspective(fov, aspect, 0.1, 100);
    const view = mat4Mul(mat4RotX(-camPitch * (Math.PI / 180)), mat4RotY(-camYaw * (Math.PI / 180)));
    const mvp = mat4Mul(proj, view);
    const uMVP = gl.getUniformLocation(prog, "uMVP");
    gl.uniformMatrix4fv(uMVP, false, new Float32Array(mvp));

    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.bindBuffer(gl.ARRAY_BUFFER, bufs.pos);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
    const aUV = gl.getAttribLocation(prog, "aUV");
    gl.bindBuffer(gl.ARRAY_BUFFER, bufs.uv);
    gl.enableVertexAttribArray(aUV);
    gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texRef.current);
    gl.uniform1i(gl.getUniformLocation(prog, "uTex"), 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufs.idx);
    gl.drawElements(gl.TRIANGLES, bufs.count, gl.UNSIGNED_SHORT, 0);
  }, [camYaw, camPitch, fov, size.w, size.h, aspect, ready]);

  // Zoom kolečkem: vlastní non-passive listener, aby šel preventDefault — React
  // registruje wheel pasivně, takže by se při zoomu zároveň rolovala stránka.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setFov((f) => Math.min(FOV_MAX, Math.max(FOV_MIN, f + e.deltaY * 0.05)));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  // Reset pohledu při přepnutí scény dělá přímo onClick přepínače scén (ne efekt —
  // setState synchronně v efektu zakazuje lint a spouštěl by kaskádové rendery).

  // --- ovládání: tažení (myš+prst) a přiblížení ---
  const sensitivity = fov / Math.max(1, size.h); // stupňů na pixel

  function onPointerDown(e: RPointerEvent) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }
  function onPointerMove(e: RPointerEvent) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size >= 2) {
      // pinch: změna vzdálenosti dvou prstů → zoom
      const pts = Array.from(pointers.current.values());
      const dx = pts[0].x - pts[1].x, dy = pts[0].y - pts[1].y;
      const dist = Math.hypot(dx, dy);
      if (pinchDist.current !== null) {
        const delta = pinchDist.current - dist;
        setFov((f) => Math.min(FOV_MAX, Math.max(FOV_MIN, f + delta * 0.15)));
      }
      pinchDist.current = dist;
      return;
    }
    pinchDist.current = null;
    const dxp = e.clientX - prev.x;
    const dyp = e.clientY - prev.y;
    // „uchop a táhni": tažením vpravo se scéna posune vpravo (díváme se doleva)
    setCamYaw((y) => {
      const n = y - dxp * sensitivity;
      return ((n + 180) % 360 + 360) % 360 - 180;
    });
    setCamPitch((p) => Math.min(PITCH_LIMIT, Math.max(-PITCH_LIMIT, p + dyp * sensitivity)));
  }
  function onPointerUp(e: RPointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchDist.current = null;
  }

  function toggleFullscreen() {
    const el = wrapRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else el.requestFullscreen?.();
    } catch {
      /* fullscreen nemusí být povolený — nevadí */
    }
  }

  // pozice hotspotů na obrazovce (jen viditelné před kamerou a v záběru)
  const projected = useMemo(() => {
    if (!scene) return [];
    return scene.hotspots.map((h) => ({
      h,
      p: projectHotspot(h.yaw, h.pitch, camYaw, camPitch, fov, aspect),
    }));
  }, [scene, camYaw, camPitch, fov, aspect]);

  if (!scene?.url) return null;

  // FALLBACK: WebGL nedostupné → aspoň statický obrázek (nic se nerozbije)
  if (failed) {
    return (
      <div>
        <div style={{ borderRadius: "12px", overflow: "hidden", border: `1px solid ${BORDER}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- podepsané URL jsou dočasné */}
          <img src={scene.url} alt={caption || "Panorama"} style={{ width: "100%", display: "block" }} />
        </div>
        <p style={{ color: MUTED, marginTop: "0.6rem", fontSize: "0.9rem" }}>
          {caption ? `${caption} · ` : ""}Váš prohlížeč neumí interaktivní 360° zobrazení, ukazujeme fotku.
        </p>
      </div>
    );
  }

  return (
    <div>
      {scenes.length > 1 ? (
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.9rem" }}>
          {scenes.map((s, i) => {
            const on = i === active;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setActive(i);
                  setOpenHotspot(null);
                  // reset pohledu pro novou scénu
                  setCamYaw(0);
                  setCamPitch(0);
                  setFov(75);
                }}
                style={{
                  padding: "0.4rem 0.95rem",
                  borderRadius: "999px",
                  border: on ? `1px solid ${INK}` : `1px solid ${BORDER}`,
                  background: on ? INK : "#fff",
                  color: on ? "#fff" : INK,
                  fontWeight: on ? 700 : 500,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                }}
              >
                {s.title || `Scéna ${i + 1}`}
              </button>
            );
          })}
        </div>
      ) : null}

      <div
        ref={wrapRef}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16 / 9",
          borderRadius: "12px",
          overflow: "hidden",
          border: `1px solid ${BORDER}`,
          background: "#0f0f12",
          touchAction: "none",
          cursor: "grab",
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }}
        />

        {!ready ? (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "0.9rem", pointerEvents: "none" }}>
            Načítám panorama…
          </div>
        ) : null}

        {/* hotspoty */}
        {ready
          ? projected.map(({ h, p }) =>
              p.visible ? (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setOpenHotspot(h)}
                  aria-label={h.title || "Bod zájmu"}
                  title={h.title || "Bod zájmu"}
                  style={{
                    position: "absolute",
                    left: `${p.xPct}%`,
                    top: `${p.yPct}%`,
                    transform: "translate(-50%, -50%)",
                    width: "30px",
                    height: "30px",
                    borderRadius: "999px",
                    border: "2px solid #fff",
                    background: "rgba(214,69,69,0.92)",
                    color: "#fff",
                    fontSize: "1rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 1px 6px rgba(0,0,0,0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1,
                  }}
                >
                  +
                </button>
              ) : null,
            )
          : null}

        {/* ovládací lišta */}
        <div style={{ position: "absolute", right: "0.6rem", bottom: "0.6rem", display: "flex", gap: "0.35rem" }}>
          <ControlBtn label="−" title="Oddálit" onClick={() => setFov((f) => Math.min(FOV_MAX, f + 8))} />
          <ControlBtn label="+" title="Přiblížit" onClick={() => setFov((f) => Math.max(FOV_MIN, f - 8))} />
          <ControlBtn label="⛶" title="Celá obrazovka" onClick={toggleFullscreen} />
        </div>

        <div style={{ position: "absolute", left: "0.6rem", top: "0.6rem", padding: "0.25rem 0.6rem", borderRadius: "999px", background: "rgba(0,0,0,0.45)", color: "#fff", fontSize: "0.75rem", pointerEvents: "none" }}>
          Táhni myší nebo prstem · kolečkem přiblížíš
        </div>
      </div>

      {caption ? (
        <p style={{ color: MUTED, marginTop: "0.6rem", fontSize: "0.9rem" }}>{caption}</p>
      ) : null}

      {/* info okno hotspotu */}
      {openHotspot ? (
        <div
          onClick={() => setOpenHotspot(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1.5rem" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: "14px", overflow: "hidden", maxWidth: "36rem", width: "100%", maxHeight: "88vh", display: "flex", flexDirection: "column" }}
          >
            {openHotspot.url ? (
              // eslint-disable-next-line @next/next/no-img-element -- podepsané URL jsou dočasné
              <img src={openHotspot.url} alt={openHotspot.title || "Bod zájmu"} style={{ width: "100%", maxHeight: "60vh", objectFit: "cover", display: "block" }} />
            ) : null}
            <div style={{ padding: "1.25rem" }}>
              <h3 style={{ fontSize: "1.3rem", fontWeight: 700, color: INK }}>{openHotspot.title || "Bod zájmu"}</h3>
              {openHotspot.description ? <p style={{ color: MUTED, marginTop: "0.6rem", lineHeight: 1.7 }}>{openHotspot.description}</p> : null}
              <button
                type="button"
                onClick={() => setOpenHotspot(null)}
                style={{ marginTop: "1rem", padding: "0.6rem 1.4rem", borderRadius: "999px", border: `1px solid ${INK}`, background: "#fff", color: INK, fontWeight: 600, cursor: "pointer" }}
              >
                Zavřít
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ControlBtn({ label, title, onClick }: { label: string; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      style={{
        width: "34px",
        height: "34px",
        borderRadius: "8px",
        border: "1px solid rgba(255,255,255,0.35)",
        background: "rgba(0,0,0,0.5)",
        color: "#fff",
        fontSize: "1.05rem",
        fontWeight: 700,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {label}
    </button>
  );
}
