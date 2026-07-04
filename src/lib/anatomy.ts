// ---------------------------------------------------------------------------
// Anatomy registry — one entry per clickable 3D part.
// This powers "click a part, learn what it is": plain-language role, story,
// and a "watch" hint telling the learner what to look for in the animation.
// ---------------------------------------------------------------------------

export interface PartInfo {
  /** Display name. */
  name: string;
  /** One-line role — what job this part does. */
  role: string;
  /** Friendly explanation for a beginner. */
  story: string;
  /** What to watch in the animation. */
  watch?: string;
  /** Related glossary concept ids. */
  concepts?: string[];
}

/** Keyed by the last segment of a part key like `stage-3/sun` → `sun`. */
export const PART_INFO: Record<string, PartInfo> = {
  // ---- motor ---------------------------------------------------------------
  housing: {
    name: "Motor Housing",
    role: "The metal shell that holds everything together.",
    story:
      "The housing keeps the stator fixed, protects the insides, and drains heat away from the windings. " +
      "When people say 'the motor', they're pointing at this can — but the interesting parts are inside it.",
    watch: "It never moves — everything inside reacts against it.",
    concepts: ["motor"],
  },
  stator: {
    name: "Stator (coils)",
    role: "The ring of copper electromagnets that pushes the rotor around.",
    story:
      "The stator is the part that doesn't spin ('stator' = stationary). Its copper coils switch on and off in " +
      "sequence, dragging the rotor's magnets around like an invisible hand. In a brushless motor, a controller does " +
      "this switching electronically thousands of times a second.",
    watch: "The rotor chases the stator's rotating magnetic field.",
    concepts: ["bldc", "motor"],
  },
  rotor: {
    name: "Rotor (magnets)",
    role: "The spinning core carrying permanent magnets.",
    story:
      "The rotor is the moving heart of the motor. Its permanent magnets (alternating north/south — the red and blue " +
      "shells) are pulled around by the stator's electromagnets. Everything the actuator does starts with this part " +
      "spinning fast and weak.",
    watch: "It's the fastest-spinning part of the whole machine.",
    concepts: ["motor", "kv-kt", "torque-speed-curve"],
  },
  shaft: {
    name: "Motor Shaft",
    role: "Carries the rotor's spin out of the motor.",
    story:
      "A hardened steel pin locked to the rotor. It pokes out of the housing to hand the motion to whatever comes next " +
      "— here, the first gear of the transmission.",
    watch: "It spins at exactly the rotor's speed.",
    concepts: ["motor"],
  },
  encoder: {
    name: "Encoder",
    role: "Tells the controller the exact shaft angle.",
    story:
      "The little striped disc at the back is the motor's eyes. A sensor counts its ticks as it spins, so the " +
      "controller always knows where the shaft is and how fast it's turning. Without it, precise position control is " +
      "guesswork.",
    watch: "It spins with the rotor — the stripes are what get counted.",
    concepts: ["encoder", "backlash"],
  },
  flange: {
    name: "Mounting Flange",
    role: "The face that bolts the motor to the machine.",
    story:
      "The flange is the precision-machined face with bolt holes that fixes the motor to the gearbox or the robot's " +
      "frame. Torque pushes back on the motor as hard as the motor pushes forward — the flange takes that reaction.",
    concepts: ["actuator"],
  },

  // ---- planetary -----------------------------------------------------------
  sun: {
    name: "Sun Gear",
    role: "The input at the centre — the motor drives this.",
    story:
      "Named for its place in the middle, the sun gear takes the motor's fast spin and shares it out to the planets " +
      "around it. Small sun + big ring = big reduction.",
    watch: "Fastest gear in the stage — the planets roll around it.",
    concepts: ["gear-ratio", "involute"],
  },
  planet: {
    name: "Planet Gear",
    role: "Rolls between sun and ring, sharing the load.",
    story:
      "Each planet meshes with the sun on the inside and the ring on the outside, so the force is split across all of " +
      "them at once. That load-sharing is why a small planetary gearbox can carry so much torque.",
    watch: "It spins on its own axis while orbiting the sun — like the Moon.",
    concepts: ["gear-ratio", "efficiency"],
  },
  carrier: {
    name: "Planet Carrier",
    role: "The frame holding the planets — and the output.",
    story:
      "The carrier is the plate the planets are pinned to. As the planets orbit, they drag the carrier around slowly " +
      "and strongly — this is the stage's output shaft.",
    watch: "It turns at the slow output speed — compare it with the sun.",
    concepts: ["gear-ratio", "torque"],
  },
  ring: {
    name: "Ring Gear",
    role: "The internal-toothed ring the planets roll inside.",
    story:
      "The ring gear is held still by the gearbox housing. With the ring fixed, the planets have no choice but to " +
      "walk around inside it, carrying the carrier with them. Ratio = 1 + ring teeth ÷ sun teeth.",
    watch: "It never moves — it's the wall the planets push against.",
    concepts: ["gear-ratio"],
  },

  // ---- spur / belt ----------------------------------------------------------
  pinion: {
    name: "Pinion (driving gear)",
    role: "The small input gear.",
    story:
      "The smaller of a gear pair is called the pinion. Because it's small, it must turn many times to roll the big " +
      "gear around once — that's the whole trick of reduction: trade turns for twist.",
    watch: "Count its turns per one turn of the big gear — that's the ratio.",
    concepts: ["gear-ratio", "involute"],
  },
  gear: {
    name: "Driven Gear",
    role: "The big output gear — slower, stronger.",
    story:
      "The big wheel of the pair. Every tooth of the pinion that passes pushes it forward one tooth, so with 3× the " +
      "teeth it turns 3× slower — but with 3× the torque (minus a little friction).",
    watch: "It turns opposite to the pinion, slower, with more force.",
    concepts: ["gear-ratio", "torque"],
  },
  "pulley-in": {
    name: "Drive Pulley",
    role: "The toothed input wheel the belt wraps.",
    story:
      "The motor-side pulley. Its teeth grip matching teeth on the belt so nothing slips. Belts let you put the motor " +
      "somewhere else entirely — off a moving arm, for example — and still deliver power.",
    concepts: ["gear-ratio"],
  },
  "pulley-out": {
    name: "Driven Pulley",
    role: "The output wheel — turns with the belt.",
    story:
      "The far pulley. Make it bigger than the drive pulley and you get a reduction, exactly like gear teeth: ratio = " +
      "tooth count ratio.",
    concepts: ["gear-ratio"],
  },
  belt: {
    name: "Timing Belt",
    role: "The toothed rubber loop that carries the power.",
    story:
      "A reinforced rubber band with teeth. It's quiet, cheap, and forgiving of misalignment — but it can stretch a " +
      "touch under load, which shows up as springiness at the output.",
    watch: "Both pulleys turn the same direction — unlike meshing gears.",
    concepts: ["backlash"],
  },

  // ---- worm ------------------------------------------------------------------
  worm: {
    name: "Worm (screw)",
    role: "The spinning screw that drives the wheel.",
    story:
      "One full turn of the worm advances the wheel by just one tooth (per thread start). That's how a single stage " +
      "gets a 40:1 ratio. The sliding contact wastes energy as heat, but it also means the wheel usually can't turn " +
      "the worm back — it self-locks.",
    watch: "It spins fast while the wheel below creeps.",
    concepts: ["worm", "self-locking"],
  },
  wheel: {
    name: "Worm Wheel",
    role: "The gear the worm slowly walks around.",
    story:
      "The worm wheel's teeth are shaped to wrap the worm's thread. It outputs slow, strong rotation at 90° to the " +
      "input — handy when you need to turn a corner in the mechanism.",
    watch: "Its axis is at a right angle to the worm's.",
    concepts: ["worm", "gear-ratio"],
  },

  // ---- harmonic ---------------------------------------------------------------
  wavegen: {
    name: "Wave Generator",
    role: "The elliptical cam — the fast input.",
    story:
      "An oval cam on a ball bearing. As it spins it flexes the cup around it into an ellipse, pressing the cup's " +
      "teeth into the outer ring at the two bulge points. It's the only fast-moving part of a harmonic drive.",
    watch: "The bulge travels around quickly — that's the wave.",
    concepts: ["harmonic-drive"],
  },
  flexspline: {
    name: "Flexspline",
    role: "The flexible cup — the slow output.",
    story:
      "A thin steel cup with slightly fewer teeth than the ring outside it. Each pass of the wave makes it fall behind " +
      "by a couple of teeth, so the cup itself creeps around slowly — a 100:1 reduction in one part, with no backlash.",
    watch: "Follow the marker dot: the bulge is fast, the cup is slow.",
    concepts: ["harmonic-drive", "backlash"],
  },
  circspline: {
    name: "Circular Spline",
    role: "The rigid outer ring — held still.",
    story:
      "A stiff steel ring with internal teeth, fixed to the housing. The flexing cup walks its teeth around inside " +
      "it. Its two extra teeth are the entire secret of the huge ratio.",
    concepts: ["harmonic-drive"],
  },

  // ---- cycloidal ----------------------------------------------------------------
  cam: {
    name: "Eccentric Cam",
    role: "The off-centre input that wobbles the disc.",
    story:
      "A round cam mounted off-centre on the input shaft. Spinning it doesn't rotate the disc directly — it makes the " +
      "disc wobble in a tight circle, rolling its lobes against the pins around it.",
    watch: "Watch the disc's centre trace a tiny circle.",
    concepts: ["gear-ratio"],
  },
  disc: {
    name: "Cycloid Disc",
    role: "The lobed wheel that rolls inside the pin ring.",
    story:
      "The disc has one lobe fewer than there are pins outside it, so each wobble makes it fall back by one lobe — " +
      "that's the reduction. Many lobes share the load at once, which is why cycloidal drives shrug off shock loads " +
      "that would chip gear teeth.",
    watch: "It slowly rotates backwards while wobbling forwards.",
    concepts: ["gear-ratio", "backlash"],
  },
  pins: {
    name: "Pin Ring",
    role: "The circle of rollers the disc rolls against.",
    story:
      "Hardened pins fixed to the housing. The disc's lobes roll over them like a wheel over cobblestones — rolling " +
      "contact, not sliding, so wear and backlash stay low.",
    concepts: ["backlash"],
  },
  outdisc: {
    name: "Output Plate",
    role: "Picks up the disc's slow rotation.",
    story:
      "Pins from the output plate pass through oversized holes in the cycloid disc. The holes let the wobble through " +
      "but pass the slow rotation on — so the output turns smoothly while the disc dances.",
    watch: "It turns steadily even though the disc wobbles.",
    concepts: ["gear-ratio"],
  },

  // ---- screws --------------------------------------------------------------------
  screw: {
    name: "Screw Shaft",
    role: "The threaded rod the motor spins.",
    story:
      "The screw converts every turn into a small, precise slide of the nut. The thread pitch ('lead') decides the " +
      "trade: fine thread = huge force, slow travel. Coarse thread = faster, weaker.",
    watch: "Rotation in, straight-line motion out.",
    concepts: ["leadscrew"],
  },
  nut: {
    name: "Nut / Carriage",
    role: "Rides the thread — the linear output.",
    story:
      "The nut can't spin (the machine's rails prevent it), so when the screw turns, the nut has nowhere to go but " +
      "along. This is where rotary becomes linear. Ball-screw nuts roll on tiny balls for near-frictionless travel.",
    watch: "It slides back and forth as the screw spins.",
    concepts: ["leadscrew", "self-locking"],
  },

  // ---- product covers -------------------------------------------------------------
  "cover-qdd-pancake": {
    name: "QDD Pancake Case",
    role: "The signature wide, flat shell of a quasi-direct-drive actuator.",
    story:
      "Why so wide and flat? Motor torque grows with the square of its radius, so a QDD actuator uses the " +
      "biggest-diameter motor that fits and only a whisper of gearing. The gold anodized pancake of MIT's " +
      "Mini Cheetah made this shape famous — the whole leg's 'muscle' in a hockey puck. Toggle X-ray or " +
      "slide Explode to open it.",
    watch: "Use X-ray to see the big rotor and single planetary stage inside.",
    concepts: ["qdd", "backdrivability", "torque"],
  },
  "cover-damiao-pancake": {
    name: "Integrated Joint Motor Case",
    role: "A complete robot joint in one sealed black can.",
    story:
      "This is the housing of an integrated 'joint motor' like the Damiao modules OpenArm is built from: " +
      "motor, planetary reduction, dual position encoders and a CAN-bus driver board all live inside one " +
      "sealed cylinder you bolt straight into the arm. Building robots becomes plugging these together like " +
      "LEGO — one power pair, one data pair, per joint.",
    watch: "X-ray it: motor at the back, planetary up front, encoder behind.",
    concepts: ["actuator", "qdd", "encoder"],
  },
  "cover-smart-servo": {
    name: "Servo Case & Horn",
    role: "The plastic shell and output disc of a hobby smart servo.",
    story:
      "Everything a joint needs in a matchbox: motor, a long gear train, position sensor and control board, " +
      "wrapped in a glass-fibre nylon case. The round disc on the face is the 'horn' — the output you bolt " +
      "the robot's limb to. Daisy-chained data cables made these modules the backbone of hobby and research " +
      "robot arms.",
    watch: "The horn turns ~190× slower than the motor buzzing inside.",
    concepts: ["actuator", "gear-ratio", "encoder"],
  },
  "cover-harmonic-module": {
    name: "Joint Module Housing",
    role: "The machined shell of an industrial rotary joint.",
    story:
      "Industrial arm joints come as sealed cylindrical modules: servo motor at the back, harmonic drive at " +
      "the front, cross-roller output bearing to carry the arm's loads. The precision-machined aluminium " +
      "body is also the structure of the robot — the next arm segment bolts directly onto its face.",
    watch: "X-ray it to see the wave generator flexing the cup inside.",
    concepts: ["harmonic-drive", "backlash"],
  },
  "cover-nema17": {
    name: "NEMA-17 Stepper Body",
    role: "The standard square black can of a stepper motor.",
    story:
      "That square black body is a 'NEMA 17' — a standardized 42 mm frame size, which is why printer parts " +
      "from any maker bolt together. The body is a stack of steel laminations holding the coils; the front " +
      "plate carries the bearing and the four mounting screws every 3D-printer bracket expects.",
    watch: "Steppers move in tiny fixed steps — watch the shaft's ticking rotation.",
    concepts: ["stepper", "motor"],
  },

  // ---- output --------------------------------------------------------------------
  output: {
    name: "Output Flange",
    role: "Where the robot bolts on — the business end.",
    story:
      "Everything upstream — the motor's speed, every stage's ratio and losses — adds up to what this flange can do: " +
      "how hard it can twist, how fast it can turn, and whether you can push it back by hand. This is the number that " +
      "matters to the robot.",
    watch: "Compare its speed with the motor's rotor — that's your total ratio.",
    concepts: ["actuator", "torque", "backdrivability"],
  },
};

/** Look up part info from a full key like `stage-abc/planet` or `motor/rotor`. */
export function partInfoFor(key: string): PartInfo | null {
  const kind = key.split("/").pop() ?? "";
  return PART_INFO[kind] ?? null;
}
