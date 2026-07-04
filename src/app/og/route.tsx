import { ImageResponse } from "next/og";
import { decodeDesign } from "@/lib/shareCodec";
import { computeDrive, fmt, ratioLabel } from "@/lib/physics";
import { generateGear, generateRingGear } from "@/lib/gearGeometry";
import { STAGE_TYPES } from "@/lib/catalog";
import type { ActuatorDesign, Stage } from "@/lib/types";

// Per-design share card: the actuator drawn as a 50%-exploded technical
// schematic (real involute profiles), with the design's computed specs.
// NOTE for satori: no fragments, no <text>/<ellipse> in svg — arrays, paths.

const W = 1200;
const H = 630;

/** Ellipse as a path (satori has no <ellipse>). */
const ellipsePath = (a: number, b: number) => `M ${-a} 0 A ${a} ${b} 0 1 0 ${a} 0 A ${a} ${b} 0 1 0 ${-a} 0 Z`;

interface Glyph {
  els: React.ReactNode[];
  w: number;
  h: number;
}

function motorGlyph(color: string): Glyph {
  const els = [
    <rect key="m0" x={0} y={-62} width={138} height={124} fill="#1c1c21" stroke="#3f3f46" strokeWidth={2} />,
    <rect key="m1" x={0} y={-62} width={10} height={124} fill={color} opacity={0.9} />,
  ];
  for (let i = 0; i < 6; i++) {
    els.push(<line key={`s${i}`} x1={26 + i * 18} y1={-46} x2={26 + i * 18} y2={46} stroke="#3f3f46" strokeWidth={3} />);
  }
  els.push(<rect key="sh" x={138} y={-7} width={26} height={14} fill="#71717a" />);
  return { els, w: 164, h: 124 };
}

function stageGlyph(stage: Stage): Glyph {
  const color = STAGE_TYPES[stage.type].color;
  switch (stage.type) {
    case "spur":
    case "belt": {
      const z1 = Math.max(6, stage.teethIn ?? 15);
      const z2 = Math.max(6, stage.teethOut ?? 45);
      const m = Math.min(3.4, 168 / (z2 + z1 + 8));
      const g1 = generateGear(z1, m);
      const g2 = generateGear(z2, m);
      const cd = g1.pitchRadius + g2.pitchRadius + (stage.type === "belt" ? 26 : 0);
      const els: React.ReactNode[] = [];
      if (stage.type === "belt") {
        els.push(
          <line key="b1" x1={g1.outerRadius} y1={-g1.pitchRadius} x2={g1.outerRadius + cd} y2={-g2.pitchRadius} stroke={color} strokeWidth={5} opacity={0.55} />,
          <line key="b2" x1={g1.outerRadius} y1={g1.pitchRadius} x2={g1.outerRadius + cd} y2={g2.pitchRadius} stroke={color} strokeWidth={5} opacity={0.55} />,
        );
      }
      els.push(
        <g key="g1" transform={`translate(${g1.outerRadius} 0)`}>
          <path d={g1.path} fill={color} opacity={0.95} />
        </g>,
        <circle key="c1" cx={g1.outerRadius} cy={0} r={Math.max(4, g1.rootRadius * 0.3)} fill="#09090b" stroke="#52525b" strokeWidth={2} />,
        <g key="g2" transform={`translate(${g1.outerRadius + cd} 0) rotate(${180 + 180 / z2})`}>
          <path d={g2.path} fill="#5c5c64" />
        </g>,
        <circle key="c2" cx={g1.outerRadius + cd} cy={0} r={Math.max(5, g2.rootRadius * 0.28)} fill="#09090b" stroke="#71717a" strokeWidth={2} />,
      );
      return { els, w: g1.outerRadius + cd + g2.outerRadius, h: 2 * Math.max(g1.outerRadius, g2.outerRadius) };
    }
    case "planetary": {
      const zs = Math.max(8, stage.sunTeeth ?? 12);
      const zp = Math.max(8, stage.planetTeeth ?? 18);
      const zr = zs + 2 * zp;
      const np = Math.min(5, Math.max(3, stage.planetCount ?? 3));
      const m = Math.min(2.4, 176 / (zr + 10));
      const sun = generateGear(zs, m);
      const planet = generateGear(zp, m);
      const ring = generateRingGear(zr, m);
      const R = ring.outerRadius + 6;
      const orbit = sun.pitchRadius + planet.pitchRadius;
      const els: React.ReactNode[] = [
        <circle key="rim" cx={R} cy={0} r={R} fill="#1c1c21" stroke="#3f3f46" strokeWidth={2} />,
        <circle key="rin" cx={R} cy={0} r={ring.rootRadius} fill="#09090b" />,
        <g key="ring" transform={`translate(${R} 0)`}>
          <path d={ring.path} fill="#26262c" />
        </g>,
      ];
      for (let k = 0; k < np; k++) {
        const a = (k / np) * Math.PI * 2 - Math.PI / 2;
        els.push(
          <g key={`p${k}`} transform={`translate(${R + orbit * Math.cos(a)} ${orbit * Math.sin(a)})`}>
            <path d={planet.path} fill="#5c5c64" />
          </g>,
        );
      }
      els.push(
        <g key="sun" transform={`translate(${R} 0)`}>
          <path d={sun.path} fill={color} />
        </g>,
        <circle key="bore" cx={R} cy={0} r={Math.max(4, sun.rootRadius * 0.35)} fill="#09090b" stroke="#52525b" strokeWidth={2} />,
      );
      return { els, w: 2 * R, h: 2 * R };
    }
    case "harmonic": {
      const R = 84;
      const els: React.ReactNode[] = [
        <circle key="o" cx={R} cy={0} r={R} fill="#1c1c21" stroke="#3f3f46" strokeWidth={2} />,
        <circle key="i" cx={R} cy={0} r={R - 14} fill="#09090b" />,
        <g key="fx" transform={`translate(${R} 0) rotate(18)`}>
          <path d={ellipsePath(R - 20, R - 36)} fill="none" stroke={color} strokeWidth={7} />
          <path d={ellipsePath(R - 32, R - 48)} fill="#26262c" />
        </g>,
        <circle key="b" cx={R} cy={0} r={9} fill="#09090b" stroke="#71717a" strokeWidth={2} />,
      ];
      return { els, w: 2 * R, h: 2 * R };
    }
    case "cycloidal": {
      const R = 84;
      const lobes = 9;
      let path = "";
      for (let i = 0; i <= 120; i++) {
        const th = (i / 120) * Math.PI * 2;
        const r = R - 26 + 7 * Math.cos(lobes * th);
        path += `${i === 0 ? "M" : "L"} ${(r * Math.cos(th)).toFixed(1)} ${(r * Math.sin(th)).toFixed(1)} `;
      }
      const els: React.ReactNode[] = [<circle key="o" cx={R} cy={0} r={R} fill="#1c1c21" stroke="#3f3f46" strokeWidth={2} />];
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        els.push(<circle key={`pin${k}`} cx={R + (R - 11) * Math.cos(a)} cy={(R - 11) * Math.sin(a)} r={6} fill="#52525b" />);
      }
      els.push(
        <g key="disc" transform={`translate(${R + 6} 0)`}>
          <path d={`${path}Z`} fill={color} opacity={0.95} />
        </g>,
        <circle key="b" cx={R + 6} cy={0} r={12} fill="#09090b" stroke="#71717a" strokeWidth={2} />,
      );
      return { els, w: 2 * R, h: 2 * R };
    }
    case "worm": {
      const els: React.ReactNode[] = [<rect key="w" x={0} y={-24} width={150} height={48} fill="#26262c" stroke="#3f3f46" strokeWidth={2} />];
      for (let i = 0; i < 8; i++) {
        els.push(<line key={`t${i}`} x1={10 + i * 18} y1={26} x2={28 + i * 18} y2={-26} stroke={color} strokeWidth={5} opacity={0.8} />);
      }
      els.push(<circle key="wh" cx={75} cy={62} r={34} fill="#5c5c64" />, <circle key="whb" cx={75} cy={62} r={9} fill="#09090b" stroke="#71717a" strokeWidth={2} />);
      return { els, w: 150, h: 190 };
    }
    case "leadscrew":
    case "ballscrew": {
      const els: React.ReactNode[] = [<rect key="s" x={0} y={-13} width={190} height={26} fill="#26262c" stroke="#3f3f46" strokeWidth={2} />];
      for (let i = 0; i < 12; i++) {
        els.push(<line key={`t${i}`} x1={6 + i * 16} y1={14} x2={16 + i * 16} y2={-14} stroke={color} strokeWidth={3.5} opacity={0.85} />);
      }
      els.push(<rect key="n" x={78} y={-27} width={46} height={54} fill="#52525b" stroke="#71717a" strokeWidth={2} />);
      return { els, w: 190, h: 60 };
    }
    default:
      return { els: [], w: 0, h: 0 };
  }
}

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
  const glyphs: Glyph[] = [motorGlyph("#f97316"), ...design.stages.map(stageGlyph)];

  // 50% exploded: half of the full 88px teardown gap between every element
  const GAP = 28 + 0.5 * 88;
  const naturalW = glyphs.reduce((a, g) => a + g.w, 0) + GAP * (glyphs.length - 1);
  const naturalH = Math.max(...glyphs.map((g) => g.h), 140);
  const scale = Math.min(1, 1050 / naturalW, 320 / naturalH);

  // assemble the chain svg
  const els: React.ReactNode[] = [
    <line key="axis" x1={0} y1={0} x2={naturalW} y2={0} stroke="#3f3f46" strokeWidth={2} strokeDasharray="5 10" />,
  ];
  let x = 0;
  glyphs.forEach((g, i) => {
    els.push(
      <g key={`g${i}`} transform={`translate(${x} 0)`}>
        {g.els}
      </g>,
    );
    x += g.w + GAP;
  });

  const chainLabel = ["Motor", ...design.stages.map((s) => STAGE_TYPES[s.type].label)].join("  →  ") + "  →  Output";
  const specs = drive.isLinear
    ? [`${fmt(drive.linear?.stallForce ?? 0, 0)} N force`, `${fmt(drive.linear?.noLoadSpeed ?? 0, 0)} mm/s`, `${ratioLabel(drive.totalRatio)} ratio`, drive.backdrive]
    : [`${fmt(drive.stallTorque, 1)} N·m`, `${fmt(drive.noLoadSpeed, 0)} rpm`, `${ratioLabel(drive.totalRatio)} ratio`, drive.backdrive];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#09090b", position: "relative", fontFamily: "sans-serif" }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", backgroundImage: "radial-gradient(circle at 78% 30%, rgba(249,115,22,0.12), transparent 55%)" }} />

        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "44px 64px 0 64px" }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 900 }}>
            <div style={{ display: "flex", fontSize: 17, letterSpacing: 6, color: "#f97316" }}>BYOA · SHARED ACTUATOR</div>
            <div style={{ display: "flex", fontSize: 46, fontWeight: 700, color: "#fafafa", marginTop: 10, letterSpacing: -0.5 }}>
              {design.name.length > 42 ? design.name.slice(0, 41) + "…" : design.name}
            </div>
          </div>
          <div style={{ display: "flex", border: "1px solid #3f3f46", color: "#9f9fa8", padding: "8px 14px", fontSize: 15, letterSpacing: 3 }}>
            EXPLODED ×0.5
          </div>
        </div>

        {/* schematic */}
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center" }}>
          <svg
            width={naturalW * scale}
            height={(naturalH + 40) * scale}
            viewBox={`0 ${-(naturalH + 40) / 2} ${naturalW} ${naturalH + 40}`}
          >
            {els}
          </svg>
        </div>

        {/* footer: chain + specs */}
        <div style={{ display: "flex", flexDirection: "column", padding: "0 64px 40px 64px" }}>
          <div style={{ display: "flex", fontSize: 17, color: "#71717a", letterSpacing: 1 }}>
            {chainLabel.length > 92 ? chainLabel.slice(0, 91) + "…" : chainLabel}
          </div>
          <div style={{ display: "flex", marginTop: 16 }}>
            {specs.map((t) => (
              <div key={t} style={{ display: "flex", borderTop: "1px solid #3f3f46", borderBottom: "1px solid #3f3f46", borderRight: "1px solid #3f3f46", borderLeft: "2px solid #f97316", color: "#e4e4e7", padding: "8px 16px", fontSize: 19, marginRight: 12, background: "rgba(18,18,20,0.9)" }}>
                {t}
              </div>
            ))}
            <div style={{ display: "flex", marginLeft: "auto", alignItems: "center", color: "#71717a", fontSize: 16 }}>
              buildyourownactuator.vercel.app
            </div>
          </div>
        </div>
      </div>
    ),
    { width: W, height: H },
  );
}
