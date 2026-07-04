// ---------------------------------------------------------------------------
// Concept glossary — the "teach me everything" layer. Short, plain-language
// entries for every idea the tool touches, linkable from tooltips and the
// Learn panel.
// ---------------------------------------------------------------------------

export interface Concept {
  id: string;
  term: string;
  short: string;
  body: string;
  /** Related concept ids. */
  see?: string[];
  category: "motor" | "gearing" | "specs" | "control";
}

export const CONCEPTS: Concept[] = [
  {
    id: "actuator",
    term: "Actuator",
    category: "specs",
    short: "The 'muscle' of a robot — turns energy into controlled motion.",
    body:
      "An actuator is the complete unit that produces motion: a power source (usually a motor), a " +
      "transmission that trades speed for torque, and typically a sensor for feedback. When people say a " +
      "robot has 'six actuators', they mean six of these motion-producing joints. BYOA lets you build one " +
      "from its parts and see how each choice ripples through to the output.",
    see: ["motor", "transmission", "torque", "encoder"],
  },
  {
    id: "torque",
    term: "Torque",
    category: "specs",
    short: "Rotational force — how hard the shaft can twist. Measured in N·m.",
    body:
      "Torque is twisting effort. One newton-metre (N·m) is the torque from a 1 N force on a 1 m lever arm. " +
      "A robot joint needs enough torque to hold and move the limb beyond it against gravity and payload. " +
      "Gearing multiplies a motor's modest torque into the large torque a joint needs — at the cost of speed.",
    see: ["speed", "gear-ratio", "power"],
  },
  {
    id: "speed",
    term: "Speed (RPM)",
    category: "specs",
    short: "How fast the shaft rotates, in revolutions per minute.",
    body:
      "Motors love to spin fast — thousands of RPM — but produce little torque there. Robot joints want the " +
      "opposite: slow, strong motion. A gearbox divides speed by its ratio while multiplying torque by (almost) " +
      "the same factor, converting a fast, weak motor into a slow, strong actuator.",
    see: ["torque", "gear-ratio", "no-load-speed"],
  },
  {
    id: "power",
    term: "Power",
    category: "specs",
    short: "Torque × speed. Gearing can't create it — only trade its parts.",
    body:
      "Mechanical power (watts) is torque times angular speed. This is the key insight of transmissions: a " +
      "gearbox conserves power (minus losses), so if it multiplies torque 10×, it divides speed ~10×. Peak " +
      "power happens near the middle of the torque–speed curve, not at stall or top speed.",
    see: ["torque", "speed", "efficiency"],
  },
  {
    id: "gear-ratio",
    term: "Gear Ratio",
    category: "gearing",
    short: "How much a stage divides speed and multiplies torque.",
    body:
      "A ratio of 10:1 means the input turns 10 times for one output turn: output torque is ~10× higher and " +
      "output speed 10× lower. For a plain gear pair the ratio is just the tooth-count ratio (driven ÷ driving). " +
      "Stack stages and the ratios multiply: a 5:1 then a 4:1 gives 20:1 overall.",
    see: ["torque", "speed", "backlash", "efficiency"],
  },
  {
    id: "involute",
    term: "Involute Profile",
    category: "gearing",
    short: "The curved tooth shape that makes gears run smoothly.",
    body:
      "Gear teeth aren't triangles — their flanks follow an 'involute', the curve traced by unwinding a string " +
      "from a base circle. This shape keeps the speed ratio perfectly constant as teeth roll through mesh, and " +
      "it still works if the centre distance is slightly off. Nearly every gear you'll ever see uses it.",
    see: ["gear-ratio", "pressure-angle", "module"],
  },
  {
    id: "module",
    term: "Module",
    category: "gearing",
    short: "Tooth size. Pitch diameter = module × number of teeth.",
    body:
      "Module (mm) sets how big each tooth is. Two gears must share the same module to mesh. A bigger module " +
      "means fewer, chunkier, stronger teeth; a smaller module means many fine teeth for smoother, quieter motion. " +
      "It's the metric cousin of 'diametral pitch'.",
    see: ["involute", "pressure-angle"],
  },
  {
    id: "pressure-angle",
    term: "Pressure Angle",
    category: "gearing",
    short: "The angle at which teeth push on each other, usually 20°.",
    body:
      "The pressure angle sets the slope of the tooth flanks and the direction of the force between meshing " +
      "teeth. 20° is the modern standard: a good balance of strength and smoothness. Higher angles give stronger, " +
      "stubbier teeth but more radial load on the bearings.",
    see: ["involute", "module"],
  },
  {
    id: "backlash",
    term: "Backlash",
    category: "gearing",
    short: "The tiny 'slop' before motion reverses direction.",
    body:
      "Backlash is the small gap between meshing teeth — reverse direction and the input moves a hair before the " +
      "output responds. It's measured in arc-minutes. It matters enormously for precise positioning: harmonic and " +
      "cycloidal drives are prized for near-zero backlash, while long spur trains accumulate it stage by stage.",
    see: ["gear-ratio", "harmonic-drive", "encoder"],
  },
  {
    id: "backdrivability",
    term: "Backdrivability",
    category: "control",
    short: "Can you move the output by hand and feel it at the motor?",
    body:
      "A backdrivable actuator lets torque flow backwards: push the joint and the motor spins. This makes a robot " +
      "'feel' forces and stay safe around people — the basis of force control and compliant legs. High ratios and " +
      "friction (worm, harmonic, lead screws) kill backdrivability; low-ratio quasi-direct drives preserve it.",
    see: ["gear-ratio", "self-locking", "reflected-inertia", "qdd"],
  },
  {
    id: "self-locking",
    term: "Self-Locking",
    category: "control",
    short: "The output physically cannot drive the input — it holds by itself.",
    body:
      "When thread friction exceeds the lead angle (typical of worm drives and lead screws), the output simply " +
      "can't turn the input. The joint holds a load with the power off and no brake — great for lifts and camera " +
      "mounts. The flip side: zero backdrivability and wasted energy as heat.",
    see: ["backdrivability", "worm", "leadscrew"],
  },
  {
    id: "efficiency",
    term: "Efficiency",
    category: "specs",
    short: "Fraction of input power that reaches the output; the rest is heat.",
    body:
      "Every mesh loses a little power to friction. Spur and planetary gears are ~95–97% efficient; harmonic ~80%; " +
      "worm and lead screws can be 40–60%. Efficiencies multiply through a stack, so a long gear train quietly bleeds " +
      "torque and runs hot.",
    see: ["power", "self-locking", "gear-ratio"],
  },
  {
    id: "qdd",
    term: "Quasi-Direct-Drive (QDD)",
    category: "control",
    short: "A strong motor + tiny gearing for transparent, fast joints.",
    body:
      "Instead of a big reduction, a QDD uses a large low-Kv motor with just a small (≈6–10:1) gearbox. The result " +
      "is highly backdrivable and can control torque directly through motor current — ideal for dynamic legged robots " +
      "that must sense the ground and survive impacts.",
    see: ["backdrivability", "bldc", "gear-ratio"],
  },
  {
    id: "no-load-speed",
    term: "No-Load Speed",
    category: "motor",
    short: "Top speed with nothing to push against.",
    body:
      "With no load, a motor speeds up until its back-EMF nearly cancels the supply voltage; there it spins freely " +
      "producing (almost) no torque. It's one anchor of the torque–speed line — the other is stall torque at zero speed.",
    see: ["stall-torque", "back-emf", "torque-speed-curve"],
  },
  {
    id: "stall-torque",
    term: "Stall Torque",
    category: "motor",
    short: "Maximum torque, produced at zero speed — and lots of heat.",
    body:
      "At stall the shaft isn't moving, so all electrical power becomes heat. Torque is highest here but can't be " +
      "held long. Real drives impose a current limit that caps stall torque well below the theoretical V/R value, " +
      "which is why BYOA models a current limit.",
    see: ["no-load-speed", "current-limit", "torque-speed-curve"],
  },
  {
    id: "current-limit",
    term: "Current Limit",
    category: "motor",
    short: "The drive caps current to protect the motor — capping low-speed torque.",
    body:
      "A motor's winding resistance is tiny, so full voltage at stall would push a huge, destructive current. The " +
      "controller limits it, which flattens the top of the torque–speed curve into a 'constant-torque' region. Above a " +
      "corner speed, back-EMF takes over and torque droops toward the no-load speed.",
    see: ["stall-torque", "torque-speed-curve", "back-emf"],
  },
  {
    id: "back-emf",
    term: "Back-EMF",
    category: "motor",
    short: "The voltage a spinning motor generates that opposes its supply.",
    body:
      "A motor is also a generator: as it spins it produces a voltage (back-EMF) proportional to speed that fights the " +
      "supply. This is why current — and thus torque — falls as speed rises, and why the torque–speed line slopes down. " +
      "The proportionality constant is Kv's reciprocal, Kt.",
    see: ["kv-kt", "no-load-speed", "torque-speed-curve"],
  },
  {
    id: "kv-kt",
    term: "Kv and Kt",
    category: "motor",
    short: "Twin constants: speed-per-volt and torque-per-amp. Kt = 9.55 / Kv.",
    body:
      "Kv (rpm per volt) tells you how fast a motor spins per volt; Kt (N·m per amp) how much torque it makes per amp. " +
      "They're two views of the same magnetics and are reciprocals: Kt = 60 / (2π·Kv). A low-Kv motor is a torque motor; " +
      "a high-Kv motor is a speed motor.",
    see: ["torque", "speed", "bldc"],
  },
  {
    id: "torque-speed-curve",
    term: "Torque–Speed Curve",
    category: "motor",
    short: "The map of what a motor can do at every speed.",
    body:
      "Plot torque (vertical) against speed (horizontal) and you get a motor's signature line: high torque at low speed, " +
      "zero torque at top speed. Power (their product) peaks in the middle. Gearing stretches this curve — taller in torque, " +
      "shorter in speed. Everything an actuator can do lives under this curve.",
    see: ["stall-torque", "no-load-speed", "power"],
  },
  {
    id: "reflected-inertia",
    term: "Reflected Inertia",
    category: "control",
    short: "Gearing makes the motor's spinning mass feel ratio² heavier at the output.",
    body:
      "A gearbox multiplies the motor's rotor inertia by the square of the ratio as seen from the output. A 100:1 drive " +
      "makes a light rotor feel 10,000× more sluggish at the joint — great for holding still, terrible for quick, compliant " +
      "reactions. It's a hidden reason low-ratio QDD actuators feel so responsive.",
    see: ["gear-ratio", "backdrivability", "qdd"],
  },
  {
    id: "encoder",
    term: "Encoder",
    category: "control",
    short: "The sensor that tells the controller where the shaft actually is.",
    body:
      "Closed-loop actuators need feedback: an encoder reports shaft angle (and thus speed) so the controller can hit a " +
      "target precisely. Placed on the motor it's high-resolution but sees backlash; placed on the output it's truer but " +
      "coarser. Steppers can skip it by moving in known steps — until they lose one.",
    see: ["backlash", "actuator", "stepper"],
  },
  {
    id: "motor",
    term: "Motor",
    category: "motor",
    short: "Converts electrical energy into rotation.",
    body:
      "The prime mover. Brushed DC motors are simple and cheap; brushless (BLDC) motors are efficient and powerful but need " +
      "electronic control; steppers move in precise open-loop increments. The motor sets the raw speed and torque that the " +
      "transmission then reshapes.",
    see: ["bldc", "torque-speed-curve", "kv-kt"],
  },
  {
    id: "bldc",
    term: "Brushless DC (BLDC)",
    category: "motor",
    short: "Efficient, powerful, electronically commutated motor.",
    body:
      "BLDC motors put the magnets on the rotor and switch the stator coils electronically, so there are no brushes to wear. " +
      "They dominate robotics for their efficiency, power density and precise control via field-oriented control (FOC). Low-Kv " +
      "'torque' BLDCs enable quasi-direct-drive joints.",
    see: ["motor", "qdd", "kv-kt"],
  },
  {
    id: "transmission",
    term: "Transmission",
    category: "gearing",
    short: "The gear stages between motor and output that shape its character.",
    body:
      "The transmission is where you trade the motor's fast-and-weak output for the slow-and-strong (or linear) motion a " +
      "mechanism needs. Your choice of gear type and ratio decides backlash, efficiency, backdrivability, size and cost — " +
      "which is the whole game BYOA is about.",
    see: ["gear-ratio", "backlash", "efficiency", "actuator"],
  },
  {
    id: "harmonic-drive",
    term: "Harmonic Drive",
    category: "gearing",
    short: "Strain-wave gearing: very high ratio, near-zero backlash.",
    body:
      "A harmonic drive flexes a thin toothed cup with an elliptical wave generator so it meshes a rigid ring at two points. " +
      "The few-tooth difference yields 30–320:1 in one compact, zero-backlash stage — the reason it rules precision robot arms, " +
      "despite ~80% efficiency and poor backdrivability.",
    see: ["backlash", "gear-ratio", "backdrivability"],
  },
  {
    id: "worm",
    term: "Worm Drive",
    category: "gearing",
    short: "A screw driving a wheel — high ratio, often self-locking.",
    body:
      "A worm (screw) meshes a gear wheel at 90°, giving a big ratio in one stage. Sliding contact makes it inefficient and " +
      "usually self-locking, so it holds loads without power. Common in winches, gates and pan/tilt heads.",
    see: ["self-locking", "gear-ratio", "efficiency"],
  },
  {
    id: "leadscrew",
    term: "Lead Screw",
    category: "gearing",
    short: "Turns rotation into linear force via a threaded nut.",
    body:
      "A lead screw drives a nut along its threads, converting spin into a strong, slow linear push. 'Lead' is travel per turn: " +
      "smaller lead means more force, less speed. Sliding friction makes it inefficient but self-locking — it holds position with " +
      "the power off.",
    see: ["self-locking", "efficiency", "backdrivability"],
  },
  {
    id: "stepper",
    term: "Stepper Motor",
    category: "motor",
    short: "Moves in fixed steps for precise open-loop positioning.",
    body:
      "A stepper's many poles let it move one fixed increment per pulse (often 1.8°), so it can position accurately without an " +
      "encoder. It has strong holding torque but its torque falls off quickly with speed, and it silently loses steps if pushed " +
      "past its limit.",
    see: ["encoder", "torque-speed-curve", "motor"],
  },
];

export const CONCEPTS_BY_ID: Record<string, Concept> = Object.fromEntries(
  CONCEPTS.map((c) => [c.id, c]),
);
