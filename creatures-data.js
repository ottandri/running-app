// Runnies — the collectible-creature roster for the training-plan gamification
// feature. Pure data, no DOM/logic here (see game-engine.js for logic, and
// creature-art.js for how each entry gets rendered as an SVG).
//
// Naming: the creatures as a group are "Runnies"; one individual is a "Runny".
//
// Phase 2: each species' silhouette evokes a real-world animal matching its
// training specialty (Andri's art direction, see README "Art direction").
// The Race/legendary line deliberately stays outside this animal roster —
// an abstract medal/clock motif, to keep its "outside of category" mystique.
//
// Every color below reuses the REAL site's existing CSS custom properties
// (--c-easy / --c-quality / --c-long / --c-strength, defined identically in
// training_hub.html and lausanne_hm_training_plan.html) so Runnies fit the
// site's design system natively rather than introducing a new palette.
//
// All names, motifs, and art are original — no resemblance to any
// copyrighted character is intended.
//
// Stages are 0-indexed internally (0 = Stage 1 / base form, 1 = Stage 2,
// 2 = Stage 3) but always displayed as "Stage N of 3" (1-indexed) in the UI.

(function (global) {

  var CATEGORIES = {
    easy:     { label: 'Easy / Steady',        colorVar: '--c-easy' },
    quality:  { label: 'Quality (Threshold+Interval)', colorVar: '--c-quality' },
    long:     { label: 'Long Run',             colorVar: '--c-long' },
    strength: { label: 'Strength',             colorVar: '--c-strength' },
    race:     { label: 'Race (legendary)',     colorVar: '--race-gold' }
  };

  // Evolution gates shared by every non-legendary line for v1 simplicity
  // (tunable later): stage-1->2 needs level 10 + 1 matching Evolution Core,
  // stage-2->3 needs level 22 + 2 matching Evolution Cores. Reaching the
  // level does NOT auto-evolve or cap leveling — see game-engine.js.
  var STANDARD_EVOLUTION_GATES = [
    null,
    { level: 10, evolutionCores: 1 },
    { level: 22, evolutionCores: 2 }
  ];

  var RUNNIES = [
    // --- Easy / Steady ---
    {
      id: 'terrakit', category: 'easy', shapeFamily: 'tortoise',
      stages: [
        { name: 'Terrakit',   flavor: 'A small tortoise, unbothered by the clock. Rolls along at whatever pace feels easy.' },
        { name: 'Steadyshell', flavor: 'A sturdier shell now — comfortable holding a steady rhythm for as long as it takes.' },
        { name: 'Terrapace',  flavor: 'Never fast, never tired. Covers ground at a pace that simply never runs out.' }
      ],
      evolutionGates: STANDARD_EVOLUTION_GATES
    },
    {
      id: 'hummlet', category: 'easy', shapeFamily: 'hummingbird',
      stages: [
        { name: 'Hummlet',    flavor: 'A tiny hummingbird, light as an easy breath. Barely seems to try at all.' },
        { name: 'Zephyrwing', flavor: 'Wings quicker now — glides through easy miles without spending much effort.' },
        { name: 'Auralume',   flavor: 'Trails soft light for kilometers, calm and unbothered no matter the distance.' }
      ],
      evolutionGates: STANDARD_EVOLUTION_GATES
    },
    // --- Quality (Threshold+Interval) ---
    {
      id: 'hopspark', category: 'quality', shapeFamily: 'hare',
      stages: [
        { name: 'Hopspark',  flavor: 'A jittery little hare, always ready to burst into a sprint. Can’t sit still.' },
        { name: 'Boltrunner', flavor: 'Real interval legs now — sharp, quick, precise bursts on command.' },
        { name: 'Fulgurex',  flavor: 'A living lightning-bolt of a hare. Built entirely out of surges.' }
      ],
      evolutionGates: STANDARD_EVOLUTION_GATES
    },
    {
      id: 'emberkit', category: 'quality', shapeFamily: 'feline',
      stages: [
        { name: 'Emberkit',  flavor: 'A small, quick cat that flares up during threshold work.' },
        { name: 'Fangflare', flavor: 'Faster now, and holds that blistering pace longer than it used to.' },
        { name: 'Infernyx',  flavor: 'A blur of heat and speed — built for sustained, hard efforts.' }
      ],
      evolutionGates: STANDARD_EVOLUTION_GATES
    },
    // --- Long Run ---
    {
      id: 'lopekit', category: 'long', shapeFamily: 'leopard',
      stages: [
        { name: 'Lopekit',    flavor: 'Lean and restless, always eyeing the horizon for how far it could go.' },
        { name: 'Prowlrunner', flavor: 'A sharper, sleeker lope now — efficient enough to hold deep into a long run.' },
        { name: 'Farstrider', flavor: 'Thin, sharp, and tireless. Distance is where this one truly lives.' }
      ],
      evolutionGates: STANDARD_EVOLUTION_GATES
    },
    {
      id: 'fawnling', category: 'long', shapeFamily: 'deer',
      stages: [
        { name: 'Fawnling',   flavor: 'Wobbly-legged, but curious about how far it can go.' },
        { name: 'Duskrunner', flavor: 'Long, even strides — built for the back half of a long run.' },
        { name: 'Sunstride',  flavor: 'Each stride leaves a faint glow. Distance is where it lives.' }
      ],
      evolutionGates: STANDARD_EVOLUTION_GATES
    },
    // --- Strength ---
    {
      id: 'stampkit', category: 'strength', shapeFamily: 'bull',
      stages: [
        { name: 'Stampkit',  flavor: 'A stout, stubborn young bull. Loves a good set of reps.' },
        { name: 'Ironhorn',  flavor: 'Broader now, with real weight behind every push.' },
        { name: 'Titanhorn', flavor: 'Crystal veins glow faintly beneath a frame built from real accumulated strength.' }
      ],
      evolutionGates: STANDARD_EVOLUTION_GATES
    },
    {
      id: 'knucklub', category: 'strength', shapeFamily: 'gorilla',
      stages: [
        { name: 'Knucklub', flavor: 'Compact and playful, always looking for something heavy to push against.' },
        { name: 'Ironback', flavor: 'Broader shoulders, deliberate power — explosive strength on demand.' },
        { name: 'Dynamane', flavor: 'Crackles with stored power between every strength session.' }
      ],
      evolutionGates: STANDARD_EVOLUTION_GATES
    },
    // --- Race (legendary) ---
    {
      id: 'finishron', category: 'race', shapeFamily: 'legend',
      legendary: true,
      // Single-stage legendary: only obtainable by completing an actual
      // tracked race (a tile-race session). Re-glows (visual flourish only,
      // no further evolution in v1) on each subsequent new personal best.
      // Deliberately abstract (medal/clock), not part of the animal roster.
      stages: [
        { name: 'Finishron', flavor: 'Appears the moment you cross a finish line. Glows brighter with every new PB.' }
      ],
      evolutionGates: [null]
    }
  ];

  function getRunny(id) {
    for (var i = 0; i < RUNNIES.length; i++) if (RUNNIES[i].id === id) return RUNNIES[i];
    return null;
  }

  function runniesByCategory(category) {
    return RUNNIES.filter(function (r) { return r.category === category; });
  }

  global.RunnyData = {
    CATEGORIES: CATEGORIES,
    RUNNIES: RUNNIES,
    STANDARD_EVOLUTION_GATES: STANDARD_EVOLUTION_GATES,
    getRunny: getRunny,
    runniesByCategory: runniesByCategory
  };
})(typeof window !== 'undefined' ? window : global);

// Node-runnable for balance-sim.js — browser usage is unaffected.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = (typeof window !== 'undefined' ? window : global).RunnyData;
}
