# BYOA — Build Your Own Actuators

**Live: [buildyourownactuator.vercel.app](https://buildyourownactuator.vercel.app)**

An interactive **3D playground for learning how robot actuators work**. Assemble a motor and a
transmission, click any part to learn its anatomy, pull the machine apart with an explode slider,
and watch real engineering numbers respond — in plain language first, datasheet language second.

![Next.js 16](https://img.shields.io/badge/Next.js-16-black) ![React 19](https://img.shields.io/badge/React-19-blue) ![three.js](https://img.shields.io/badge/three.js-r185-white)

## What you can do

- **Anatomy mode** — every part of the 3D machine is clickable: rotor magnets, stator windings,
  encoder disc, sun/planet/ring gears, flexspline, cycloid disc, worm, lead-screw nut… Each click
  flies the camera in and explains what the part is, what it does, and *what to watch* in the
  animation.
- **Explode & X-ray** — open the actuator up like an anatomy diagram; ghost the housings to see inside.
- **Build your own** — pick a motor (brushed / BLDC / stepper), then stack transmission stages:
  spur, planetary, harmonic (strain-wave), cycloidal, worm, timing belt, lead screw, ball screw.
  Gears are real involute profiles, extruded to 3D, and mesh exactly — the whole chain is
  phase-locked to one clock.
- **Live physics** — output torque, speed, power, efficiency, backlash, reflected inertia and
  backdrivability computed from the standard DC-motor equations (with a drive current limit, like a
  real FOC controller). Beginners get it "in plain terms" (*can hold ~4.7 kg at the end of a 10 cm
  arm*); the Engineer view has the full torque–speed curve.
- **Real product looks** — every example wears its recognizable exterior: the gold Mini-Cheetah QDD
  pancake, a Dynamixel-style case with a spinning output horn, an industrial harmonic joint module,
  a square NEMA-17 body, and the black Damiao joint-motor cans that **OpenArm** (Enactic's
  open-source 7-DoF humanoid arm) is built from — shoulder (DM-J8009P, 9:1), elbow (DM-J4340,
  ~40:1) and wrist (DM-J4310, 10:1), with specs matched to the real hardware.
- **Academy** — a 13-lesson guided course across 4 modules (Basics → Gearing → Feel & Control →
  Real Design). Each lesson teaches in plain words, then hands you something to DO in the real app
  (load an example, run a challenge, open the Lab); progress persists.
- **Motion Lab** — swing a loaded joint to a target angle and watch it move on an animated arm +
  angle-vs-time plot: settling time, overshoot, peak speed, and a reflected-vs-payload inertia
  breakdown that shows *why* high ratios feel sluggish. Integrates the real torque–speed curve,
  gravity, and reflected inertia.
- **Stress test** — push a design until it fails: hold-margin safety factor, peak-vs-continuous
  thermal duty, stepper step-loss risk, and backlash → tip position error in mm.
- **Design challenges** — eight real engineering briefs ("build a cat leg: ≥15 N·m, backdrivable,
  ratio ≤10:1"), graded live against your design as you build, with hints and a lesson on
  completion; progress persists.
- **Load test** — set a payload and arm length and see instantly whether *your* actuator holds it,
  with what margin, and how fast it can still move; every edit also flashes a delta badge showing
  exactly what it changed.
- **Guided tour that drives the app** — the onboarding doesn't tell you what buttons do, it
  *presses them*: it opens the real Examples menu, loads OpenArm's shoulder, X-rays the case,
  clicks the rotor, explodes the machine and opens the gear palette — with a click-through
  spotlight so you can poke the highlighted control yourself mid-step.
- **Learn** — a searchable glossary of ~28 actuator concepts with contextual "?" tooltips, plus a
  dedicated `/learn/<topic>` page for every concept: a zero-jargon explanation, the precise
  version, and curated videos / articles / newsletters to go deeper.
- **Ask AI about any part** — every anatomy card has Ask Claude / Ask ChatGPT buttons that open the
  assistant with a ready-made prompt containing *your* design's live numbers, plus a link to
  `/ai/context.md` — the app's entire knowledge base as one markdown file for AIs to read.
- **Small-screen friendly** — zoom / pan / re-frame buttons on the canvas and collapsible side
  panels for a full-bleed 3D view.
- **Share** — designs persist locally and encode into a ~100-character URL (compact codec, no
  shortener backend needed); shared links get their own OG card showing the actuator as a
  50%-exploded schematic with its computed specs.

## Run it

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

## How it's put together

```
src/
  lib/
    types.ts         # ActuatorDesign: Motor + Stage[] — the single source of truth
    physics.ts       # DC-motor model, drivetrain compounding, derived metrics
    gearGeometry.ts  # involute gear profile generator (2D points + SVG paths)
    catalog.ts       # stage/motor type metadata + teaching copy
    anatomy.ts       # per-part explanations for the 3D anatomy mode
    concepts.ts      # glossary content
    presets.ts       # real-world example designs
  store/             # zustand stores: design, scene (selection/explode/x-ray), ui
  components/
    three/           # r3f scene: geometry builders, assemblies, kinematic chain
    panels/          # motor editor, transmission stack, specs, anatomy card, toolbar
    viz/             # 2D torque–speed chart (SVG)
```

Two ideas make the 3D scene tick:

1. **Everything is a linear function of one clock.** Each stage maps input→output angle as
   `θout = A·θin + B`, so composed stages stay perfectly phase-locked and gear teeth never
   interpenetrate, no matter how long the chain gets.
2. **The chain is recursive.** Each stage renders its parts in a local frame and nests the rest of
   the chain in a transformed group — so offset stages (spur/belt) and 90°-turn stages (worm)
   compose for free.

Numbers are first-order engineering estimates for learning, not datasheet specs.
