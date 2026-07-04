import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import { decodeDesign } from "@/lib/shareCodec";
import { computeDrive, fmt, ratioLabel } from "@/lib/physics";

/**
 * Shared links (?d=…) get their own card: title = the design's name,
 * description = its computed specs, image = /og?d=… — the design drawn as a
 * 50%-exploded schematic.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}): Promise<Metadata> {
  const { d } = await searchParams;
  if (!d) return {};
  const design = decodeDesign(d);
  if (!design) return {};
  const drive = computeDrive(design);
  const description = drive.isLinear
    ? `${fmt(drive.linear?.stallForce ?? 0, 0)} N max force · ${fmt(drive.linear?.noLoadSpeed ?? 0, 0)} mm/s · ${ratioLabel(drive.totalRatio)} — a robot actuator built in BYOA. Open it in 3D and click every part.`
    : `${fmt(drive.stallTorque, 1)} N·m stall · ${fmt(drive.noLoadSpeed, 0)} rpm · ${ratioLabel(drive.totalRatio)} — a robot actuator built in BYOA. Open it in 3D and click every part.`;
  const image = `/og?d=${encodeURIComponent(d)}`;
  return {
    title: design.name,
    description,
    openGraph: { title: design.name, description, images: [image] },
    twitter: { card: "summary_large_image", title: design.name, description, images: [image] },
  };
}

export default function Home() {
  return <AppShell />;
}
