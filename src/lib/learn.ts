// ---------------------------------------------------------------------------
// Deep-dive learning pages: a zero-jargon explanation ("plain") plus curated
// outside resources for every glossary concept. Rendered at /learn/[slug].
// Resource links are either verified directly or point at stable references
// (Wikipedia) and honest YouTube searches.
// ---------------------------------------------------------------------------

export interface LearnResource {
  label: string;
  source: string;
  type: "video" | "article" | "wiki" | "newsletter" | "search";
  url: string;
}

export interface LearnEntry {
  /** 2–4 short paragraphs, no jargon at all. */
  plain: string[];
  resources: LearnResource[];
}

const yt = (q: string): LearnResource => ({
  label: `More videos: “${q}”`,
  source: "YouTube search",
  type: "search",
  url: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
});
const wiki = (title: string, label?: string): LearnResource => ({
  label: label ?? title.replace(/_/g, " "),
  source: "Wikipedia",
  type: "wiki",
  url: `https://en.wikipedia.org/wiki/${title}`,
});

export const LEARN: Record<string, LearnEntry> = {
  actuator: {
    plain: [
      "Think of a robot as a body. The computer is the brain, the sensors are the eyes — and the actuators are the muscles. An actuator is the complete package that actually moves a joint: a motor to make spinning motion, a set of gears to turn that fast weak spin into slow strong motion, and a sensor so the robot knows where the joint is.",
      "Every robot you've ever seen — a factory arm, a warehouse dog, a humanoid — is really just a skeleton with a handful of these muscle-packages bolted between its bones. Learn how one works and you understand the moving half of all robotics.",
    ],
    resources: [
      { label: "Why focus on the QDD actuator?", source: "BON Systems newsletter", type: "newsletter", url: "https://en.bonsystems.com/newsletter/qdd-actuator/" },
      wiki("Actuator"),
      yt("robot actuator explained"),
    ],
  },
  torque: {
    plain: [
      "Torque is twisting strength. When you open a stubborn jar lid, wring out a towel, or pedal a bike uphill, you're producing torque. For a robot arm, torque decides how much weight it can hold out in front of itself without collapsing.",
      "One thing that surprises everyone: distance matters as much as force. Holding a 1 kg bag close to your chest is easy; holding it at arm's length makes your shoulder burn. Same bag — but at arm's length, your shoulder needs far more twisting strength. That's why robot joints near the shoulder need the biggest actuators.",
    ],
    resources: [wiki("Torque"), yt("torque explained simply")],
  },
  speed: {
    plain: [
      "Motors love to spin fast — often ten thousand turns every minute. But a robot's elbow only ever needs to swing around about once per second. So almost every robot joint needs its motion slowed way, way down.",
      "The magic is that slowing motion down with gears isn't a loss — every bit of speed you give up comes back as extra strength. A robot joint is a deliberate trade: sports-car speed exchanged for weight-lifter strength.",
    ],
    resources: [wiki("Angular_velocity", "Rotational speed"), yt("gear reduction speed torque tradeoff")],
  },
  power: {
    plain: [
      "Power is how much work gets done per second — strength and speed multiplied together. A drill that spins fast but stalls the moment it touches wood is weak; so is one that pushes hard but crawls. Useful machines need the combination.",
      "Here's the golden rule of gearboxes: they cannot create power. They only re-shape it — like exchanging a hundred one-dollar bills for a single hundred. Ten times more strength always costs you ten times less speed (plus a small fee lost as heat).",
    ],
    resources: [wiki("Power_(physics)", "Power (physics)"), yt("mechanical power torque speed explained")],
  },
  "gear-ratio": {
    plain: [
      "Put a small wheel against a big wheel and spin the small one. The big wheel turns slower — but with more twist. Count the teeth and you know exactly how much: a 10-tooth gear driving a 40-tooth gear means the big one turns 4 times slower and pushes about 4 times harder. That '4:1' is the gear ratio.",
      "Chain several of these pairs together and the effect multiplies fast: 4:1 then 5:1 makes 20:1. That's how a motor the size of a soda can, spinning like crazy, ends up lifting a robot's whole body in slow motion.",
    ],
    resources: [
      { label: "Understanding planetary gear sets", source: "Learn Engineering (YouTube)", type: "video", url: "https://www.youtube.com/watch?v=ARd-Om2VyiE" },
      wiki("Gear_train", "Gear train"),
      yt("gear ratio explained animation"),
    ],
  },
  involute: {
    plain: [
      "Gear teeth aren't just any bump shape — they have a very particular curve, discovered centuries ago. Imagine unwinding a string from a spool and tracing the path of its end: that graceful curve is exactly the shape of a gear tooth's face.",
      "Why bother? Because with this shape, two gears push on each other perfectly smoothly — no speeding up and slowing down as each tooth takes over from the last, no shuddering. Nearly every gear on Earth, from wristwatches to wind turbines, uses this same curve.",
    ],
    resources: [wiki("Involute_gear", "Involute gear"), yt("involute gear profile explained")],
  },
  module: {
    plain: [
      "Module is simply tooth size. Big module = few chunky teeth, like a farm tractor gear. Small module = many fine teeth, like inside a wristwatch. Chunky teeth are stronger; fine teeth run smoother and quieter.",
      "The one rule that matters: two gears can only mesh if their teeth are the same size. It's like zippers — the halves must match.",
    ],
    resources: [wiki("Gear#Module", "Gear module"), yt("gear module explained")],
  },
  "pressure-angle": {
    plain: [
      "When one gear tooth pushes on another, it pushes at a slight angle — like pushing a swing at a slant instead of straight on. That slant angle is standardized (almost always 20 degrees) so gears from different makers work together.",
      "A steeper slant makes stubbier, stronger teeth but pushes the gear shafts apart harder, working the bearings more. Twenty degrees is the sweet spot the world settled on.",
    ],
    resources: [wiki("Pressure_angle", "Pressure angle"), yt("gear pressure angle explained")],
  },
  backlash: {
    plain: [
      "Grab a door handle and wiggle it without turning it — feel that tiny free play before anything happens? Gears have the same thing: a hair of space between teeth so they don't jam. That slop is called backlash.",
      "For a drill it doesn't matter. For a surgical robot or a robot arm placing chips on a circuit board, that tiny wiggle is the difference between landing on the target and missing it. Whole categories of fancy gearboxes exist mainly to get rid of it.",
    ],
    resources: [wiki("Backlash_(engineering)", "Backlash (engineering)"), yt("gear backlash explained")],
  },
  backdrivability: {
    plain: [
      "Push a robot's arm with your hand. Does it give way politely, or is it rigid like a locked door? That's backdrivability: whether motion can flow backwards, from the world into the motor.",
      "It decides a robot's personality. A backdrivable leg can feel the ground and soften each footfall like a cat. A non-backdrivable arm holds its position like a vice but can't feel you bump into it — which is exactly why the robots that work beside humans are built to give way.",
    ],
    resources: [
      { label: "Why focus on the QDD actuator?", source: "BON Systems newsletter", type: "newsletter", url: "https://en.bonsystems.com/newsletter/qdd-actuator/" },
      yt("backdrivable robot actuator compliant"),
    ],
  },
  "self-locking": {
    plain: [
      "Some mechanisms simply cannot be driven backwards. A car jack is the everyday example: winding the handle lifts the car, but the car's whole weight pressing down can't spin the handle back. The friction inside works like a one-way valve for motion.",
      "That's a superpower for holding things: a lift, a clamp, a camera mount stays put with the power off, no brakes needed. The price is wasted energy — all that helpful friction turns into heat while moving.",
    ],
    resources: [wiki("Worm_drive", "Worm drive"), wiki("Leadscrew"), yt("self locking mechanism worm gear")],
  },
  efficiency: {
    plain: [
      "Feed a gearbox 100 units of effort and you never get 100 out — some is always stolen by friction and leaves as heat. Efficiency is just the percentage that survives the trip.",
      "Simple gears keep about 97 in every 100. Some clever high-ratio designs keep only 60 or 70. It compounds too: three stages that each keep 90% deliver only about 73% overall. That missing energy is why gearboxes get warm — and why battery-powered robots care deeply about it.",
    ],
    resources: [wiki("Mechanical_efficiency", "Mechanical efficiency"), yt("gearbox efficiency explained")],
  },
  qdd: {
    plain: [
      "For decades, robot joints used small motors with huge gear reductions — strong, but numb and fragile, like walking in ski boots. The quasi-direct-drive idea flips it: use a big, wide motor that's strong on its own, and add only a whisper of gearing.",
      "The result feels alive. The joint can sense the ground through its own motor, absorb impacts, and react in milliseconds. This one idea is what let robot dogs and humanoids stop tip-toeing and start running, jumping — and backflipping.",
    ],
    resources: [
      { label: "MIT's Mini Cheetah does a backflip", source: "MIT News", type: "article", url: "https://news.mit.edu/2019/mit-mini-cheetah-first-four-legged-robot-do-backflip-0304" },
      { label: "Why focus on the QDD actuator?", source: "BON Systems newsletter", type: "newsletter", url: "https://en.bonsystems.com/newsletter/qdd-actuator/" },
      { label: "A budget quasi-direct-drive motor", source: "Hackaday", type: "article", url: "https://hackaday.com/2025/07/14/a-budget-quasi-direct-drive-motor-inpired-by-mits-mini-cheetah/" },
    ],
  },
  "no-load-speed": {
    plain: [
      "Lift a bike's back wheel off the ground and pedal: with nothing to push against, the wheel spins at its absolute maximum. That's no-load speed — a motor's top speed when it has nothing to do.",
      "It's the ceiling, not the reality. The moment real work arrives, speed drops below it. Datasheets quote it because it's one of the two anchor points that define everything a motor can do (the other is its strength at zero speed).",
    ],
    resources: [wiki("DC_motor", "DC motor"), yt("motor no load speed explained")],
  },
  "stall-torque": {
    plain: [
      "Push against a wall as hard as you can. You're producing maximum force and zero movement — and getting tired fast. A motor pressed until it stops turning is doing the same thing: maximum twist, zero motion, everything turning into heat.",
      "That maximum is stall torque. Motors can only hold it for moments before overheating, which is why real robot drives deliberately cap the current — trading a little peak strength for not catching fire.",
    ],
    resources: [wiki("Stall_torque", "Stall torque"), yt("motor stall torque explained")],
  },
  "current-limit": {
    plain: [
      "An electric motor will happily drink enough current to destroy itself — its wires barely resist the flow. So every serious motor controller stands guard like a circuit breaker, capping how much current gets through.",
      "That cap directly caps strength, because current is what makes twist. On a graph of what the motor can do, the limit shows up as a flat ceiling at low speeds. Raise the limit and you get more muscle — and more heat to manage.",
    ],
    resources: [wiki("Motor_controller", "Motor controller"), yt("FOC current limit motor control")],
  },
  "back-emf": {
    plain: [
      "Here's a lovely secret: a motor and a generator are the same machine. The moment a motor spins, it also generates its own electricity — pushing back against the battery that drives it.",
      "The faster it spins, the harder it pushes back, until the pushback nearly cancels the supply and the motor simply can't go faster. That invisible pushback is why every motor has a top speed, and why strength fades as speed climbs.",
    ],
    resources: [wiki("Counter-electromotive_force", "Back-EMF"), yt("back emf explained motor")],
  },
  "kv-kt": {
    plain: [
      "Every motor has a personality number. One way to read it: how many turns per minute it gives you for each volt. Drone racers know it as 'Kv' — a 2000Kv motor is a screamer; a 100Kv motor is a slow, muscular ox.",
      "The beautiful part: the same number, flipped upside down, tells you how much twist you get per unit of current. Speed-per-volt and strength-per-amp are two sides of one coin — you literally cannot have both. Choosing a motor starts with choosing this number.",
    ],
    resources: [wiki("Motor_constants", "Motor constants"), yt("motor kv rating explained")],
  },
  "torque-speed-curve": {
    plain: [
      "Every motor can be summed up in one picture: a line from 'strongest but standing still' down to 'fastest but pushing nothing'. Everything the motor will ever do lives somewhere on that line.",
      "Engineers read it like a menu. Need to lift this load at that speed? Find the point; if it's under the line, the motor can do it. Gearing stretches the picture — taller (stronger) and narrower (slower) — which is the whole game of actuator design in a single image.",
    ],
    resources: [wiki("Torque_curve", "Torque curve"), yt("torque speed curve dc motor explained")],
  },
  "reflected-inertia": {
    plain: [
      "Spin a bike wheel and try to stop it with your palm — that reluctance to change motion is inertia. Now the strange part: gears act like a magnifying glass for it. Gear a motor down 10:1 and the world doesn't feel the rotor's sluggishness 10 times more — it feels it 100 times more. The magnification is the ratio squared.",
      "A 100:1 gearbox makes a featherweight rotor feel ten thousand times more stubborn at the joint. That's why heavily-geared robots move like they're underwater, and why fast, reactive robots keep their gear ratios tiny.",
    ],
    resources: [wiki("Moment_of_inertia", "Moment of inertia"), yt("reflected inertia gear ratio robot")],
  },
  encoder: {
    plain: [
      "Close your eyes and touch your nose — you can, because your body senses where your arm is without looking. Robots get that sense from encoders: little striped discs that spin with the motor while a sensor counts stripes flying past.",
      "Counting stripes tells the robot exactly where the joint is and how fast it's moving, thousands of times a second. Without it, a robot is throwing darts blindfolded.",
    ],
    resources: [wiki("Rotary_encoder", "Rotary encoder"), yt("rotary encoder how it works")],
  },
  motor: {
    plain: [
      "An electric motor is a magnet trick, repeated very fast. Electricity flowing through a coil makes it magnetic; magnets pull and push on each other; switch the coils on and off in a circle and the middle part chases the magnetism round and round forever.",
      "That's genuinely the whole secret — everything else is refinement: better magnets, smarter switching, less friction. From a phone's vibration buzzer to a train, it's the same trick at different sizes.",
    ],
    resources: [wiki("Electric_motor", "Electric motor"), yt("how electric motors work animation")],
  },
  bldc: {
    plain: [
      "Old-style motors use little carbon blocks that physically rub a spinning contact to route electricity — simple, but they wear out like pencil erasers. The brushless motor's trick: let a computer chip do the switching electronically. Nothing rubs, nothing wears.",
      "The payoff is huge: more power from less weight, barely any heat wasted, and precise control good enough to balance a robot on one leg. Drones, electric cars, and every modern robot run on them.",
    ],
    resources: [
      { label: "What is a brushless motor and how it works", source: "YouTube", type: "video", url: "https://www.youtube.com/watch?v=VaWGJVHiJC8" },
      wiki("Brushless_DC_electric_motor", "Brushless DC motor"),
    ],
  },
  transmission: {
    plain: [
      "Between the motor and the joint sits the transmission — the gear stack that reshapes motion like a currency exchange. Fast-and-weak in, slow-and-strong out.",
      "Choosing it is the designer's biggest decision, because every option is a bargain with a catch: simple gears are efficient but bulky in ratio; exotic ones pack huge ratios into pancakes but steal efficiency or feel. There is no free lunch — only trade-offs picked to suit the job.",
    ],
    resources: [wiki("Transmission_(mechanical_device)", "Transmission (mechanics)"), yt("robot gearbox types comparison")],
  },
  "harmonic-drive": {
    plain: [
      "This one sounds impossible: a gearbox whose main part works by flexing. A thin steel cup — flexible, like a tin can wall — gets squeezed into a slight oval and rolled inside a rigid ring. Because the cup has a couple fewer teeth than the ring, each squeeze-lap makes it creep round by just those few teeth.",
      "One spin in, a hundredth of a spin out, from a part thinner than a hockey puck — with essentially zero wiggle. It was invented for aerospace, went to the Moon on the lunar rover, and lives today in nearly every factory robot arm's wrist.",
    ],
    resources: [
      { label: "Strain wave gear: functional principle", source: "Harmonic Drive SE (YouTube)", type: "video", url: "https://www.youtube.com/watch?v=bzRh672peNk" },
      { label: "What is a strain wave gear?", source: "How To Mechatronics", type: "article", url: "https://howtomechatronics.com/how-it-works/what-is-strain-wave-gear-harmonic-drive-a-perfect-gear-set-for-robotics-applications/" },
      wiki("Strain_wave_gearing", "Strain wave gearing"),
    ],
  },
  worm: {
    plain: [
      "Picture a screw lying against a gear wheel, thread engaged with teeth. Spin the screw once and the wheel advances by just one tooth. Forty teeth on the wheel? You've built a 40:1 slowdown from two parts.",
      "The screw shape adds a bonus: the wheel usually can't turn the screw back, so whatever it's holding stays held, power or not. Gates, winches, and guitar tuning pegs all rely on it — your guitar stays in tune because of a tiny worm drive.",
    ],
    resources: [
      wiki("Worm_drive", "Worm drive"),
      yt("worm gear how it works"),
    ],
  },
  leadscrew: {
    plain: [
      "A lead screw turns spinning into sliding — it's a long bolt with a nut that can't rotate, so each turn of the screw pushes the nut smoothly along. It's how a 3D printer's bed inches upward and how a vice squeezes.",
      "Fine threads give enormous pushing force at snail speed; coarse threads move faster but push softer. And like the worm drive, friction usually makes it hold position for free when the power's off.",
    ],
    resources: [
      wiki("Leadscrew"),
      wiki("Ball_screw", "Ball screw"),
      yt("lead screw vs ball screw explained"),
    ],
  },
  stepper: {
    plain: [
      "Most motors flow; a stepper ticks. Each electrical pulse nudges it exactly one small step — commonly 1/200th of a full turn. Send 200 pulses, get exactly one revolution. Counting pulses tells you exactly where it's pointing, no sensor required.",
      "That's why 3D printers can draw the same shape ten thousand times. The catch: overload it and it silently skips steps — and everything after that is drawn shifted, which every 3D-printing hobbyist eventually meets as the dreaded 'layer shift'.",
    ],
    resources: [wiki("Stepper_motor", "Stepper motor"), yt("stepper motor how it works animation")],
  },
};

/** Cycloidal isn't a glossary concept id, but stage pages may link it later. */
export const LEARN_EXTRAS: Record<string, LearnEntry> = {
  cycloidal: {
    plain: [
      "Take a wavy-edged disc, slightly off-center, and roll it around inside a ring of pins — like swirling a coin inside a cup. The disc has one wave fewer than there are pins, so each swirl leaves it rotated back by one wave. Many swirls, huge slowdown.",
      "Because whole lobes roll against pins (instead of little gear teeth taking the hits), it shrugs off shocks that would snap ordinary teeth. Heavy factory robots put these in their hips.",
    ],
    resources: [
      { label: "Cycloidal drive: design, 3D print & test", source: "How To Mechatronics (YouTube)", type: "video", url: "https://www.youtube.com/watch?v=OsS9-FzKN6s" },
      { label: "How does a cycloidal drive work?", source: "tec-science", type: "article", url: "https://www.tec-science.com/mechanical-power-transmission/planetary-gear/how-does-a-cycloidal-gear-drive-work/" },
      wiki("Cycloidal_drive", "Cycloidal drive"),
    ],
  },
};
