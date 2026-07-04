import { ImageResponse } from "next/og";
import { generateGear } from "@/lib/gearGeometry";

// Social share card — a technical-blueprint composition rendered at build
// time, with a REAL meshing gear train from the app's own involute engine.

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "BYOA — Build Your Own Actuators: an interactive 3D robot actuator anatomy lab";

/**
 * Exact mesh phase for a driven gear whose center sits at angle `phi` (deg)
 * from the driver: θ2 = φ(1+z1/z2) + 180 + 180/z2 − (z1/z2)·(θ1 − φ).
 */
function meshAngle(z1: number, z2: number, phiDeg: number, theta1: number): number {
  const r = z1 / z2;
  return phiDeg * (1 + r) + 180 + 180 / z2 - r * (theta1 - phiDeg);
}

export default function OpenGraphImage() {
  const MOD = 13;
  const A = generateGear(30, MOD); // orange hero gear
  const B = generateGear(15, MOD); // steel mid gear
  const C = generateGear(10, MOD); // small zinc gear

  // gear train layout (svg coords, y down — consistent convention throughout)
  const thetaA = 8;
  const phiAB = 190; // B sits down-left of A
  const phiBC = 150; // C sits down-left of B
  const ax = 1060;
  const ay = 285;
  const dAB = A.pitchRadius + B.pitchRadius;
  const bx = ax + dAB * Math.cos((phiAB * Math.PI) / 180);
  const by = ay + dAB * Math.sin((phiAB * Math.PI) / 180);
  const dBC = B.pitchRadius + C.pitchRadius;
  const cx = bx + dBC * Math.cos((phiBC * Math.PI) / 180);
  const cy = by + dBC * Math.sin((phiBC * Math.PI) / 180);
  const thetaB = meshAngle(30, 15, phiAB, thetaA);
  const thetaC = meshAngle(15, 10, phiBC, thetaB);

  const gridLines: React.ReactNode[] = [];
  for (let x = 0; x <= 1200; x += 60) {
    gridLines.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={630} stroke={x % 300 === 0 ? "#1b1b20" : "#131317"} strokeWidth={1} />);
  }
  for (let y = 0; y <= 630; y += 60) {
    gridLines.push(<line key={`h${y}`} x1={0} y1={y} x2={1200} y2={y} stroke={y % 300 === 0 ? "#1b1b20" : "#131317"} strokeWidth={1} />);
  }

  // NOTE: returns an array, not a fragment — satori can't render <>…</>.
  const centerMark = (x: number, y: number, r: number, color: string, key: string) => [
    <circle key={`${key}-p`} cx={x} cy={y} r={r} fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="6 6" opacity={0.5} />,
    <line key={`${key}-h`} x1={x - 14} y1={y} x2={x + 14} y2={y} stroke={color} strokeWidth={1.5} opacity={0.7} />,
    <line key={`${key}-v`} x1={x} y1={y - 14} x2={x} y2={y + 14} stroke={color} strokeWidth={1.5} opacity={0.7} />,
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#09090b",
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        {/* glows */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage: "radial-gradient(circle at 82% 25%, rgba(249,115,22,0.14), transparent 52%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage: "radial-gradient(circle at 8% 95%, rgba(139,92,246,0.10), transparent 45%)",
          }}
        />

        {/* blueprint grid + real meshing gear train */}
        <svg width={1200} height={630} viewBox="0 0 1200 630" style={{ position: "absolute", top: 0, left: 0 }}>
          {gridLines}
          {/* line of centers, like a technical drawing */}
          <line x1={ax} y1={ay} x2={cx} y2={cy} stroke="#3f3f46" strokeWidth={1.5} strokeDasharray="4 8" opacity={0.7} />
          {/* small zinc gear (back) */}
          <g transform={`translate(${cx} ${cy}) rotate(${thetaC})`}>
            <path d={C.path} fill="#3b3b41" opacity={0.9} />
          </g>
          <circle cx={cx} cy={cy} r={17} fill="#09090b" stroke="#52525b" strokeWidth={2.5} />
          {/* steel mid gear */}
          <g transform={`translate(${bx} ${by}) rotate(${thetaB})`}>
            <path d={B.path} fill="#5c5c64" opacity={0.96} />
          </g>
          <circle cx={bx} cy={by} r={26} fill="#09090b" stroke="#71717a" strokeWidth={3} />
          {/* orange hero gear */}
          <g transform={`translate(${ax} ${ay}) rotate(${thetaA})`}>
            <path d={A.path} fill="#f97316" />
          </g>
          <circle cx={ax} cy={ay} r={52} fill="#09090b" stroke="#c2570c" strokeWidth={4} />
          {/* drafting marks: dashed pitch circles + center crosses */}
          {centerMark(ax, ay, A.pitchRadius, "#fdba74", "a")}
          {centerMark(bx, by, B.pitchRadius, "#a1a1aa", "b")}
        </svg>

        {/* text column */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 76px",
            width: 660,
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: 13, height: 13, background: "#f97316", display: "flex", marginRight: 14 }} />
            <div style={{ display: "flex", fontSize: 26, color: "#9f9fa8", letterSpacing: 9 }}>BYOA</div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 72,
              fontWeight: 700,
              color: "#fafafa",
              lineHeight: 1.05,
              marginTop: 24,
              letterSpacing: -1.5,
            }}
          >
            Build Your Own Actuators
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              color: "#a6a6af",
              lineHeight: 1.42,
              marginTop: 20,
              width: 520,
            }}
          >
            A 3D anatomy lab for robot muscles — click every part, explode the machine, learn the physics.
          </div>
          <div style={{ display: "flex", marginTop: 34 }}>
            {["Real involute gears", "OpenArm · Mini-Cheetah", "Zero jargon"].map((t) => (
              <div
                key={t}
                style={{
                  display: "flex",
                  borderTop: "1px solid #3f3f46",
                  borderBottom: "1px solid #3f3f46",
                  borderRight: "1px solid #3f3f46",
                  borderLeft: "2px solid #f97316",
                  color: "#d4d4d8",
                  padding: "7px 14px",
                  fontSize: 16.5,
                  marginRight: 12,
                  background: "rgba(18,18,20,0.85)",
                }}
              >
                {t}
              </div>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: 40,
              fontSize: 15,
              letterSpacing: 4,
              color: "#71717a",
            }}
          >
            MOTOR&nbsp;&nbsp;→&nbsp;&nbsp;GEARS&nbsp;&nbsp;→&nbsp;&nbsp;MOTION
          </div>
        </div>
      </div>
    ),
    size,
  );
}
