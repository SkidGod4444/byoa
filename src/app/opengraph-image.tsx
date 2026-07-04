import { ImageResponse } from "next/og";
import { generateGear, meshPhase } from "@/lib/gearGeometry";

// Social share card — rendered at build time with REAL involute gear
// profiles from the app's own geometry engine.

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "BYOA — Build Your Own Actuators: an interactive 3D robot actuator anatomy lab";

export default function OpenGraphImage() {
  const big = generateGear(26, 14); // pitch Ø 364
  const small = generateGear(13, 14); // pitch Ø 182
  const cd = big.pitchRadius + small.pitchRadius;
  const smallRot = ((meshPhase(13) * 180) / Math.PI).toFixed(1);

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
        {/* gear pair, meshing for real, bleeding off the right edge */}
        <svg
          width={620}
          height={630}
          viewBox="-40 -315 620 630"
          style={{ position: "absolute", right: -60, top: 0 }}
        >
          <g transform="rotate(8)">
            <path d={big.path} fill="#f97316" opacity={0.92} transform="translate(310 0)" />
            <circle cx={310} cy={0} r={52} fill="#09090b" />
            <circle cx={310} cy={0} r={52} fill="none" stroke="#3f3f46" strokeWidth={3} />
            <path
              d={small.path}
              fill="#52525b"
              opacity={0.95}
              transform={`translate(${310 - cd} 0) rotate(${smallRot})`}
            />
            <circle cx={310 - cd} cy={0} r={26} fill="#09090b" />
            <circle cx={310 - cd} cy={0} r={26} fill="none" stroke="#3f3f46" strokeWidth={3} />
          </g>
        </svg>

        {/* text block */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 80px",
            width: 640,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 14,
                height: 14,
                background: "#f97316",
                display: "flex",
              }}
            />
            <div style={{ display: "flex", fontSize: 30, color: "#9f9fa8", letterSpacing: 8 }}>BYOA</div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 68,
              fontWeight: 700,
              color: "#fafafa",
              lineHeight: 1.08,
              marginTop: 22,
            }}
          >
            Build Your Own Actuators
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 27,
              color: "#9f9fa8",
              lineHeight: 1.4,
              marginTop: 22,
            }}
          >
            A 3D anatomy lab for robot muscles — click every part, explode the machine, learn the physics.
          </div>
          <div style={{ display: "flex", marginTop: 34 }}>
            {["Involute gears", "OpenArm · Mini-Cheetah", "Live physics"].map((t) => (
              <div
                key={t}
                style={{
                  display: "flex",
                  border: "1px solid #3f3f46",
                  color: "#d4d4d8",
                  padding: "7px 14px",
                  fontSize: 17,
                  marginRight: 12,
                }}
              >
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
