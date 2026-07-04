// ---------------------------------------------------------------------------
// AI integration.
//
// Two pieces:
//  1. buildContextMarkdown() — the app's whole knowledge base (parts, stage
//     types, motors, concepts) as one markdown document, served at
//     /ai/context.md so an AI assistant can read the same material the app
//     teaches from.
//  2. buildAiPrompt() — a ready-to-send prompt for Claude/ChatGPT about the
//     part the user clicked, INCLUDING their live design's numbers, so the AI
//     explains *their* machine rather than generic theory. The knowledge is
//     summarized inline (works even when the app runs on localhost, where an
//     AI can't fetch links) and the context.md URL is attached for when it can.
// ---------------------------------------------------------------------------

import { PART_INFO, partInfoFor } from "./anatomy";
import { CONCEPTS } from "./concepts";
import { MOTOR_TYPES, STAGE_TYPES, STAGE_ORDER } from "./catalog";
import { computeDrive, fmt, ratioLabel, stageRatio } from "./physics";
import type { ActuatorDesign } from "./types";

// ---- /ai/context.md ---------------------------------------------------------

export function buildContextMarkdown(): string {
  const lines: string[] = [
    "# BYOA — Build Your Own Actuators: Knowledge Base",
    "",
    "BYOA (byoa.app) is an interactive 3D playground for learning how robot actuators work.",
    "An actuator = a motor (power) + a transmission (gear stages that trade speed for torque)",
    "+ feedback (encoder). This document is the app's full teaching content, provided so an AI",
    "assistant can explain any part, stage type, or concept to a learner.",
    "",
    "## Motor types",
    "",
  ];
  for (const m of Object.values(MOTOR_TYPES)) {
    lines.push(`### ${m.label}`, "", m.description, "", `- Strengths: ${m.pros.join("; ")}`, `- Trade-offs: ${m.cons.join("; ")}`, `- Used in: ${m.usedIn}`, "");
  }

  lines.push("## Transmission stage types", "");
  for (const t of STAGE_ORDER) {
    const s = STAGE_TYPES[t];
    lines.push(
      `### ${s.label}`,
      "",
      s.description,
      "",
      `- Typical single-stage ratio: ${s.ratioRange[0]}:1 to ${s.ratioRange[1]}:1`,
      `- Typical efficiency: ${Math.round(s.typicalEfficiency * 100)}%`,
      `- Typical backlash: ~${s.typicalBacklash} arcmin`,
      `- Backdrivable: ${s.backdrivable ? "yes" : "no / self-locking tendency"}`,
      `- Used in: ${s.usedIn}`,
      "",
    );
  }

  lines.push("## Part anatomy (what each clickable 3D part is)", "");
  for (const [kind, p] of Object.entries(PART_INFO)) {
    lines.push(`### ${p.name} (\`${kind}\`)`, "", `Role: ${p.role}`, "", p.story, "");
    if (p.watch) lines.push(`What to watch in the animation: ${p.watch}`, "");
  }

  lines.push("## Concepts glossary", "");
  for (const c of CONCEPTS) {
    lines.push(`### ${c.term}`, "", `${c.short}`, "", c.body, "");
  }

  lines.push(
    "## Physics model used by the app",
    "",
    "- DC/BLDC motor: V = I·R + Kt·ω, τ = Kt·(I − I₀), Kt = 60/(2π·Kv).",
    "- The drive imposes a current limit → flat constant-torque region at low speed, then",
    "  back-EMF-limited droop to the no-load speed (the shape real FOC servo drives produce).",
    "- Gear stages multiply torque by (ratio × efficiency) and divide speed by ratio;",
    "  ratios and efficiencies compound multiplicatively through the stack.",
    "- Reflected inertia at the output = rotor inertia × ratio².",
    "- Lead/ball screws: F = 2π·η·τ / lead; linear speed = rev/s × lead.",
    "- Numbers are first-order engineering estimates for learning, not datasheet values.",
    "",
  );
  return lines.join("\n");
}

// ---- per-click prompt ---------------------------------------------------------

function designSummary(design: ActuatorDesign): string {
  const drive = computeDrive(design);
  const m = design.motor;
  const stages =
    design.stages.length === 0
      ? "  (direct drive — no gearing)"
      : design.stages
          .map((s, i) => {
            const info = STAGE_TYPES[s.type];
            const geo =
              s.type === "planetary"
                ? ` (sun ${s.sunTeeth}T, ${s.planetCount} planets ${s.planetTeeth}T)`
                : s.teethIn
                  ? ` (${s.teethIn}T → ${s.teethOut}T)`
                  : info.linear
                    ? ` (lead ${s.lead} mm/rev)`
                    : "";
            return `  ${i + 1}. ${info.label} ${info.linear ? "" : ratioLabel(stageRatio(s))}${geo}, η=${s.efficiency}`;
          })
          .join("\n");
  const out = drive.isLinear
    ? `max force ${fmt(drive.linear?.stallForce ?? 0, 0)} N, max speed ${fmt(drive.linear?.noLoadSpeed ?? 0, 0)} mm/s`
    : `stall torque ${fmt(drive.stallTorque, 1)} N·m, no-load speed ${fmt(drive.noLoadSpeed, 0)} rpm`;
  return [
    `Design "${design.name}":`,
    `- Motor: ${MOTOR_TYPES[m.type].label}, ${m.voltage} V, Kv ${m.kv} rpm/V, current limit ${m.currentLimit} A`,
    `- Stages:\n${stages}`,
    `- Totals: ratio ${ratioLabel(drive.totalRatio)}, ${out}, drivetrain efficiency ${fmt(drive.totalEfficiency * 100, 0)}%, backdrivability: ${drive.backdrive}`,
  ].join("\n");
}

export function buildAiPrompt(design: ActuatorDesign, partKey: string | null): string {
  const summary = designSummary(design);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://byoa.app";

  let focus = "the whole actuator";
  let partBlock = "";
  if (partKey) {
    const info = partInfoFor(partKey);
    if (info) {
      focus = info.name;
      partBlock = `\nThe part I clicked: ${info.name} — ${info.role}\nApp's note about it: ${info.story}\n`;
    } else if (partKey === "motor") {
      focus = `the ${MOTOR_TYPES[design.motor.type].label} motor`;
    } else if (partKey.startsWith("stage-")) {
      const st = design.stages.find((s) => s.id === partKey.slice(6));
      if (st) focus = `the ${STAGE_TYPES[st.type].label} stage`;
    }
  }

  return [
    `I'm learning robotics with BYOA (an interactive 3D robot-actuator builder). I just clicked on ${focus} in my current design and want to understand it deeply.`,
    "",
    summary,
    partBlock,
    `Full knowledge base (markdown, fetch if you're able): ${origin}/ai/context.md`,
    "",
    "Please: (1) explain what this part/stage does in THIS specific actuator and how it shapes the numbers above, (2) give one vivid real-world analogy, (3) point out one trade-off the designer accepted, and (4) finish with a single short question to check my understanding. Keep it under ~300 words and beginner-friendly.",
  ].join("\n");
}

export function claudeUrl(prompt: string): string {
  return `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
}

export function chatgptUrl(prompt: string): string {
  return `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;
}
