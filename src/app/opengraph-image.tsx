import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// Default social card — the REAL 3D machine (gold Mini-Cheetah-style QDD,
// captured from the app itself at 50% explode with X-ray on) as the hero,
// composed in the app's zinc + orange scheme. Rendered once at build time.

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "BYOA — Build Your Own Actuators: an interactive 3D robot actuator anatomy lab";

export default async function OpenGraphImage() {
  const png = await readFile(path.join(process.cwd(), "public", "og3d", "qdd-pancake.png"));
  const hero = `data:image/png;base64,${png.toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#09090b", position: "relative", fontFamily: "sans-serif" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={hero} width={1200} height={630} style={{ position: "absolute", inset: 0, objectFit: "cover" }} alt="" />
        <div style={{ position: "absolute", inset: 0, display: "flex", backgroundImage: "linear-gradient(90deg, rgba(9,9,11,0.96) 0%, rgba(9,9,11,0.8) 34%, rgba(9,9,11,0) 62%)" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", backgroundImage: "linear-gradient(0deg, rgba(9,9,11,0.85) 0%, rgba(9,9,11,0) 26%)" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", backgroundImage: "radial-gradient(circle at 74% 42%, rgba(249,115,22,0.12), transparent 55%)" }} />

        <div style={{ position: "absolute", left: 72, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 640 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: 13, height: 13, background: "#f97316", display: "flex", marginRight: 14 }} />
            <div style={{ display: "flex", fontSize: 26, color: "#9f9fa8", letterSpacing: 9 }}>BYOA</div>
          </div>
          <div style={{ display: "flex", fontSize: 74, fontWeight: 700, color: "#fafafa", lineHeight: 1.04, marginTop: 26, letterSpacing: -1.5 }}>
            Build Your Own Actuators
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#b0b0b8", lineHeight: 1.42, marginTop: 22, width: 520 }}>
            A 3D anatomy lab for robot muscles — click every part, explode the machine, learn the physics.
          </div>
          <div style={{ display: "flex", marginTop: 36 }}>
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
                  padding: "8px 15px",
                  fontSize: 17,
                  marginRight: 12,
                  background: "rgba(18,18,20,0.9)",
                }}
              >
                {t}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 42, fontSize: 15, letterSpacing: 4, color: "#71717a" }}>
            MOTOR&nbsp;&nbsp;→&nbsp;&nbsp;GEARS&nbsp;&nbsp;→&nbsp;&nbsp;MOTION
          </div>
        </div>

        <div style={{ position: "absolute", right: 56, top: 56, display: "flex", border: "1px solid #3f3f46", background: "rgba(9,9,11,0.75)", color: "#9f9fa8", padding: "8px 14px", fontSize: 15, letterSpacing: 3 }}>
          X-RAY · EXPLODED ×0.5
        </div>
        <div style={{ position: "absolute", right: 56, bottom: 44, display: "flex", color: "#71717a", fontSize: 16 }}>
          buildyourownactuator.vercel.app
        </div>
      </div>
    ),
    size,
  );
}
