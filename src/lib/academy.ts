// ---------------------------------------------------------------------------
// The Academy — a sequenced course that turns the app's scattered features
// (builder, challenges, learn pages, Test Lab) into one guided path from
// "what's an actuator" to "design a real robot joint". Each lesson teaches,
// then hands you a concrete thing to DO in the real app.
// ---------------------------------------------------------------------------

export type LessonAction =
  | { kind: "load"; code: string; label: string }
  | { kind: "lab"; tab: "motion" | "stress"; label: string }
  | { kind: "challenge"; id: string; label: string }
  | { kind: "glossary"; conceptId: string; label: string }
  | { kind: "learn"; slug: string; label: string };

export interface Lesson {
  id: string;
  title: string;
  /** 2–3 short teaching paragraphs. */
  body: string[];
  /** The one thing to remember. */
  takeaway: string;
  /** Optional hands-on action in the real app. */
  action?: LessonAction;
  /** If set, the lesson auto-completes when this challenge is solved. */
  practiceChallenge?: string;
}

export interface Module {
  id: string;
  title: string;
  blurb: string;
  lessons: Lesson[];
}

// shared-design codes (v2 share codec) used to stage examples
const QDD = "2~t1_24_100_0.1_0.8_40_45_500~p_12_24_3_0.95~c0~nMini-Cheetah%20QDD";
const HARMONIC = "2~t1_48_60_0.3_0.5_15_80_800~h_100_0.8~c2~nHarmonic%20Joint";
const SIMPLE = "2~t1_24_190_0.15_0.6_20_30_300~nBare%20Motor";

export const MODULES: Module[] = [
  {
    id: "basics",
    title: "1 · The Basics",
    blurb: "What an actuator is and the two numbers that define it.",
    lessons: [
      {
        id: "what",
        title: "What is an actuator?",
        body: [
          "Every robot is a skeleton moved by muscles. Those muscles are actuators — and each one is just two ingredients: a motor that makes spinning, and a transmission (gears) that reshapes it.",
          "When someone says a robot has 'six actuators', they mean six of these motion-makers, one per joint. Learn how one works and you understand the moving half of all robotics.",
        ],
        takeaway: "Actuator = motor (power) + transmission (gears) + a sensor for feedback.",
        action: { kind: "load", code: SIMPLE, label: "Load a bare motor" },
      },
      {
        id: "torque-speed",
        title: "Torque and speed pull opposite ways",
        body: [
          "Torque is twisting strength — how much weight a joint can hold out in front of itself. Speed is how fast it turns. Motors are always fast-and-weak.",
          "The whole game of an actuator is trading the motor's useless speed for the strength a joint actually needs. You can't have both — spend one to buy the other.",
        ],
        takeaway: "A gearbox is a currency exchange: trade speed for torque, or torque for speed.",
        action: { kind: "learn", slug: "torque", label: "Read: Torque" },
      },
      {
        id: "curve",
        title: "The torque–speed curve",
        body: [
          "Every motor fits in one picture: a line from 'strongest but standing still' down to 'fastest but pushing nothing'. Everything it can do lives under that line.",
          "Open the Engineer view in the specs panel to see it. Gearing stretches this curve taller (more torque) and narrower (less speed).",
        ],
        takeaway: "Peak power sits in the middle of the curve — not at stall, not at top speed.",
        action: { kind: "learn", slug: "torque-speed-curve", label: "Read: Torque–speed curve" },
      },
    ],
  },
  {
    id: "gearing",
    title: "2 · Gearing",
    blurb: "How gears trade speed for strength — and the price you pay.",
    lessons: [
      {
        id: "why-gear",
        title: "Why gear down?",
        body: [
          "A motor spins fast and weak. A robot elbow wants slow and strong. Gears bridge that gap: a 10-tooth gear driving a 40-tooth gear turns 4× slower but pushes ~4× harder.",
          "Time to try it — build an actuator that makes at least 5 N·m. You'll feel torque climb as you raise the ratio.",
        ],
        takeaway: "Reduction ratio divides speed and multiplies torque by (almost) the same factor.",
        action: { kind: "challenge", id: "first-torque", label: "Do the challenge: First muscle" },
        practiceChallenge: "first-torque",
      },
      {
        id: "stacking",
        title: "Stacking ratios & losing energy",
        body: [
          "Chain gear stages and their ratios multiply: 5:1 then 4:1 gives 20:1. That's how a soda-can motor ends up lifting a robot's whole body.",
          "But every mesh loses a little to friction, and efficiencies multiply too — three 95% stages keep only ~86%. Long gear trains quietly bleed torque and run hot.",
        ],
        takeaway: "Ratios multiply through a stack — and so do losses.",
        action: { kind: "load", code: HARMONIC, label: "Load a 100:1 harmonic joint" },
      },
      {
        id: "types",
        title: "A zoo of gears",
        body: [
          "Spur, planetary, harmonic, cycloidal, worm, belt, screws — each trades ratio, size, efficiency, backlash and feel differently. There's no best, only best-for-the-job.",
          "The harmonic drive you just loaded gets 100:1 with near-zero slop in one thin stage — magic for precise arms, but it's only ~80% efficient and hard to backdrive.",
        ],
        takeaway: "Picking a gear type is choosing which trade-off you can live with.",
        action: { kind: "glossary", conceptId: "harmonic-drive", label: "Explore gear types" },
      },
    ],
  },
  {
    id: "feel",
    title: "3 · Feel & Control",
    blurb: "The properties that decide how a robot moves and feels.",
    lessons: [
      {
        id: "backdrive",
        title: "Backdrivability — can you push it back?",
        body: [
          "Push a robot arm. Does it give way, or is it rigid? That's backdrivability — whether motion flows backwards into the motor. It decides if a robot can feel the world and stay safe near people.",
          "High ratios kill it. Build a 'cat leg' — strong but soft — by keeping the ratio low and getting torque from the motor instead.",
        ],
        takeaway: "Low ratio + high efficiency = backdrivable. It's the heart of quasi-direct drive.",
        action: { kind: "challenge", id: "cat-leg", label: "Do the challenge: Build a cat leg" },
        practiceChallenge: "cat-leg",
      },
      {
        id: "backlash",
        title: "Backlash — the hidden wobble",
        body: [
          "Reverse a gearbox and there's a hair of free play before anything moves. That's backlash, and it wrecks precise positioning. Every spur/planetary stage adds more.",
          "Build a surgeon's wrist: 20 N·m with under 2 arc-minutes of slop. You'll discover why one special gear type rules precision robotics.",
        ],
        takeaway: "Backlash accumulates stage by stage — harmonic & cycloidal drives all but eliminate it.",
        action: { kind: "challenge", id: "surgeon", label: "Do the challenge: Surgeon's wrist" },
        practiceChallenge: "surgeon",
      },
      {
        id: "inertia",
        title: "Reflected inertia — watch it move",
        body: [
          "Gearing multiplies the motor's spinning mass by the ratio squared. A 100:1 drive makes a light rotor feel 10,000× more sluggish at the joint.",
          "Open Motion Lab and swing a load. Then load a low-ratio design vs a high-ratio one and watch how differently they move — same torque, wildly different feel.",
        ],
        takeaway: "Reflected inertia = motor inertia × ratio². It's why fast robots keep ratios small.",
        action: { kind: "lab", tab: "motion", label: "Open Motion Lab" },
      },
    ],
  },
  {
    id: "real",
    title: "4 · Real Design",
    blurb: "Heat, limits, and building something real.",
    lessons: [
      {
        id: "limits",
        title: "Where designs break",
        body: [
          "A spec sheet shows peak numbers. Real motors overheat if you hold peak torque too long, steppers silently skip steps when overloaded, and backlash becomes millimetres of error at the arm tip.",
          "Open the Stress test and push your design until something goes red. Knowing the limits is what separates a build that works from one that smokes.",
        ],
        takeaway: "Peak torque is a burst rating; continuous is what you can hold all day.",
        action: { kind: "lab", tab: "stress", label: "Open Stress test" },
      },
      {
        id: "efficiency",
        title: "Efficiency & heat",
        body: [
          "Every watt lost to friction becomes heat, and battery robots pay for it twice — in runtime and in cooling. Stacking efficient stages beats one lossy shortcut.",
          "Hit 40:1 while keeping 85%+ efficiency. You'll see why engineers avoid worms and long spur trains when watts matter.",
        ],
        takeaway: "Efficiency compounds — a few good stages beat one greedy one.",
        action: { kind: "challenge", id: "efficiency-run", label: "Do the challenge: The efficiency run" },
        practiceChallenge: "efficiency-run",
      },
      {
        id: "real-robots",
        title: "How real robots do it",
        body: [
          "MIT's Mini Cheetah backflips on quasi-direct-drive legs. Industrial arms hit sub-millimetre precision with harmonic drives. OpenArm balances both across its joints. Each is a deliberate point on the trade-off map you now understand.",
          "Load the Mini-Cheetah leg, then the harmonic joint, and compare their specs. Same job — 'move a robot limb' — solved two opposite ways.",
        ],
        takeaway: "There's no universal best actuator — only the right trade-off for the task.",
        action: { kind: "load", code: QDD, label: "Load the Mini-Cheetah leg" },
      },
      {
        id: "graduate",
        title: "Now build your own",
        body: [
          "You know the whole chain: motor character, gear ratios and types, backdrivability, backlash, reflected inertia, efficiency and thermal limits. That's the real design vocabulary.",
          "Close this, clear the design, and build an actuator for a job you invent — a gripper finger, a camera gimbal, a door. Then load an example and see how the pros did it.",
        ],
        takeaway: "You can now read any actuator as a set of trade-offs — and make your own.",
        action: { kind: "challenge", id: "power-off-hold", label: "Try: Hold with the power off" },
        practiceChallenge: "power-off-hold",
      },
    ],
  },
];

export const ALL_LESSONS: Lesson[] = MODULES.flatMap((m) => m.lessons);
