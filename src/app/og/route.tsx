import { ImageResponse } from "next/og";
import { decodeDesign } from "@/lib/shareCodec";
import { computeDrive, fmt, ratioLabel } from "@/lib/physics";
import { STAGE_TYPES } from "@/lib/catalog";
import type { ActuatorDesign, CoverStyle } from "@/lib/types";

// Per-design share card: a REAL render of the 3D actuator (captured from the
// app at 50% explode with X-ray on) matching the design's product cover,
// composited with the design's name and computed specs. Zinc + orange only.

const W = 1200;
const H = 630;

const COVER_IMG: Record<CoverStyle | "generic", string> = {
  "qdd-pancake": "qdd-pancake.png",
  "smart-servo": "smart-servo.png",
  "harmonic-module": "harmonic-module.png",
  nema17: "nema17.png",
  "damiao-pancake": "damiao-pancake.png",
  generic: "generic.png",
};

function fallbackCard() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#09090b", color: "#fafafa", fontSize: 56, fontWeight: 700 }}>
        BYOA — Build Your Own Actuators
      </div>
    ),
    { width: W, height: H },
  );
}

export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("d");
  const design: ActuatorDesign | null = code ? decodeDesign(code) : null;
  if (!design) return fallbackCard();

  const drive = computeDrive(design);
  const file = COVER_IMG[design.cover ?? "generic"] ?? COVER_IMG.generic;
  let hero = "";
  try {
    const res = await fetch(new URL(`/og3d/${file}`, req.url));
    hero = `data:image/png;base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return fallbackCard();
  }

  const chain = ["Motor", ...design.stages.map((s) => STAGE_TYPES[s.type].label)].join("  →  ") + "  →  Output";
  const specs = drive.isLinear
    ? [`${fmt(drive.linear?.stallForce ?? 0, 0)} N force`, `${fmt(drive.linear?.noLoadSpeed ?? 0, 0)} mm/s`, `${ratioLabel(drive.totalRatio)} ratio`, `backdrive: ${drive.backdrive}`]
    : [`${fmt(drive.stallTorque, 1)} N·m stall`, `${fmt(drive.noLoadSpeed, 0)} rpm`, `${ratioLabel(drive.totalRatio)} ratio`, `backdrive: ${drive.backdrive}`];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#09090b", position: "relative", fontFamily: "sans-serif" }}>
        {/* the real 3D machine, exploded ×0.5 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={hero} width={W} height={H} style={{ position: "absolute", inset: 0, objectFit: "cover" }} alt="" />
        {/* scrims for legibility — left for the title block, bottom for chips */}
        <div style={{ position: "absolute", inset: 0, display: "flex", backgroundImage: "linear-gradient(90deg, rgba(9,9,11,0.94) 0%, rgba(9,9,11,0.72) 30%, rgba(9,9,11,0) 58%)" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", backgroundImage: "linear-gradient(0deg, rgba(9,9,11,0.9) 0%, rgba(9,9,11,0) 30%)" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", backgroundImage: "radial-gradient(circle at 72% 40%, rgba(249,115,22,0.10), transparent 55%)" }} />

        {/* title block */}
        <div style={{ position: "absolute", left: 64, top: 64, display: "flex", flexDirection: "column", maxWidth: 620 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: 12, height: 12, background: "#f97316", display: "flex", marginRight: 12 }} />
            <div style={{ display: "flex", fontSize: 17, letterSpacing: 6, color: "#f97316" }}>BYOA · SHARED ACTUATOR</div>
          </div>
          <div style={{ display: "flex", fontSize: 54, fontWeight: 700, color: "#fafafa", marginTop: 18, lineHeight: 1.08, letterSpacing: -1 }}>
            {design.name.length > 46 ? design.name.slice(0, 45) + "…" : design.name}
          </div>
        </div>

        {/* exploded badge */}
        <div style={{ position: "absolute", right: 56, top: 64, display: "flex", border: "1px solid #3f3f46", background: "rgba(9,9,11,0.75)", color: "#9f9fa8", padding: "8px 14px", fontSize: 15, letterSpacing: 3 }}>
          X-RAY · EXPLODED ×0.5
        </div>

        {/* chain + spec chips + domain */}
        <div style={{ position: "absolute", left: 64, right: 56, bottom: 106, display: "flex", fontSize: 19, color: "#9f9fa8", letterSpacing: 1 }}>
          {chain.length > 100 ? chain.slice(0, 99) + "…" : chain}
        </div>
        <div style={{ position: "absolute", left: 64, right: 56, bottom: 44, display: "flex", alignItems: "center" }}>
          {specs.map((t) => (
            <div key={t} style={{ display: "flex", borderTop: "1px solid #3f3f46", borderBottom: "1px solid #3f3f46", borderRight: "1px solid #3f3f46", borderLeft: "2px solid #f97316", color: "#e4e4e7", padding: "9px 16px", fontSize: 19, marginRight: 12, background: "rgba(18,18,20,0.92)" }}>
              {t}
            </div>
          ))}
          <div style={{ display: "flex", marginLeft: "auto", color: "#71717a", fontSize: 16 }}>buildyourownactuator.vercel.app</div>
        </div>
      </div>
    ),
    { width: W, height: H },
  );
}
