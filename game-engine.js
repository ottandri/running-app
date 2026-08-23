// Runnies — game engine. Pure logic, no DOM access anywhere in this file, so
// it can be dropped into the real site's pages later unchanged. Depends only
// on RunnyData (creatures-data.js) for roster/evolution-gate lookups. Also
// runs under plain Node (see the module.exports guard at the bottom) so the
// balancing simulation (balance-sim.js) can exercise the real formulas.
//
// gameState shape (this whole object is what gets stored under the
// 'plan-gamification' Firebase key via PlanSync):
// {
//   owned: { [runnyId]: { level, xp, stageIndex, shiny?: bool } },
//   activeRunnyId: 'terrakit',
//   activeRunnyHistory: [{ runnyId, activeFrom: 'YYYY-MM-DD' }, ...],   // ascending by date
//   inventory: { trainingShard: 0, evolutionCores: { easy: 0, quality: 0, long: 0, strength: 0 },
//                eggs: { [speciesId]: 0..2 },   // never reaches 3 — hatches immediately, see applyEggDrop
//                trophies: { bronze: 0, silver: 0, gold: 0, platinum: 0 } },
//   pityCounter: 0,        // Evolution Core pity
//   eggPityCounter: 0,     // separate pity counter for species eggs
//   processedSessionIds: ['w1-easy1', ...],
//   sessionScores: { [sid]: 0-100 },   // for showing the game score back on the plan tile
//   xpEarnersThisWeek: { 'YYYY-MM-DD' (week-start Monday): ['terrakit', ...] },
//   lastRecoveryWeekClaimed: 'YYYY-MM-DD' | null,
//   currentStreakWeeks: 0,
//   lastStreakWeekChecked: 'YYYY-MM-DD' | null
// }

(function (global) {

  // ---- Tunable constants (starting points, see README "Progression model") ----
  var LEVEL_MULT_PER_LEVEL = 0.04;      // +4% multiplier per level, uncapped
  var STAGE_MULT_PER_STAGE = 0.25;      // +25pp per evolution stage
  var XP_BASE = 60;
  var XP_GROWTH = 1.11;                 // ~11%/level XP requirement growth
  var CATEGORY_MATCH_MULTIPLIER = 1.5;  // reused for both the XP bonus and the drop-probability bonus
  var TRAINING_SHARD_CHANCE = 0.20;
  // Base chance nudged down from 0.04 -> 0.03: duplicate eggs (see below) are
  // a second, supplementary path to Evolution Cores, so this compensates to
  // keep the overall Core economy from ballooning once both paths are live.
  var EVOLUTION_CORE_BASE_CHANCE = 0.03;
  var EVOLUTION_CORE_PITY_INCREMENT = 0.03;
  var EVOLUTION_CORE_PITY_CAP_COUNT = 24;   // guaranteed drop by this many consecutive misses
  var MIN_SCORE_FOR_ITEM_ELIGIBILITY = 50;
  var RECOVERY_BONUS_XP_PER_POINT = 3;      // bonusPool = recoveryScore(0-100) * this

  // ---- Species eggs (how new Runnies are collected) ----
  var EGG_BASE_CHANCE = 0.10;
  var EGG_PITY_INCREMENT = 0.025;
  var EGG_PITY_CAP_COUNT = 30;              // guaranteed egg by this many consecutive misses
  var EGGS_NEEDED_TO_HATCH = 3;
  var DUPLICATE_EGG_XP_BONUS = 40;          // flat XP if the egg's species is already owned
  var DUPLICATE_EGG_CORE_CHANCE = 0.30;     // duplicate eggs: 30% -> Evolution Core, 70% -> XP bonus
  var HARD_SESSION_EGG_BONUS = 0.03;        // +3pp egg chance when the session itself is quality/long

  // ---- Manual Evolution Core -> XP conversion (player's choice, any time) ----
  var CORE_TO_XP_FRACTION = 0.5;

  // ---- Mileage micro-bonus & weather Grit Bonus (Phase 3.5) ----
  var MILEAGE_BONUS_PER_KM = 0.004;   // +0.4%/km
  var MILEAGE_BONUS_CAP = 0.15;       // capped at +15% (~37km+)
  var WEATHER_GRIT_BONUS = 0.05;      // +5% when actual.toughWeather is true

  // ---- Race trophies (Finishron) ----
  var RACE_TROPHY_TABLE = [
    { maxKm: 7, count: 1 },    // ~5K
    { maxKm: 12, count: 2 },   // ~10K
    { maxKm: 25, count: 3 },   // ~Half
    { maxKm: Infinity, count: 5 } // Full+
  ];
  var TROPHY_TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum'];
  var TROPHIES_PER_TIER_UP = 5;
  var STAR_TEAM_POWER_BONUS = 100;

  // ---- Training Shard's dual purpose (Phase 3.5) ----
  var SHINY_UNLOCK_COST = 10;
  var SHARD_EXCHANGE_COST = 5;

  // ---- XP / level math ----
  function xpToNext(level) {
    return Math.round(XP_BASE * Math.pow(XP_GROWTH, level - 1));
  }
  function levelMultiplier(level) {
    return 1 + LEVEL_MULT_PER_LEVEL * (level - 1);
  }
  function stageMultiplier(stageIndex) {
    return 1 + STAGE_MULT_PER_STAGE * stageIndex;
  }
  function totalMultiplier(level, stageIndex) {
    return levelMultiplier(level) * stageMultiplier(stageIndex);
  }
  function mileageMultiplierFor(distanceKm) {
    if (typeof distanceKm !== 'number' || distanceKm <= 0) return 1;
    return 1 + Math.min(MILEAGE_BONUS_CAP, distanceKm * MILEAGE_BONUS_PER_KM);
  }
  function weatherMultiplierFor(toughWeather) {
    return toughWeather ? (1 + WEATHER_GRIT_BONUS) : 1;
  }

  // Mutates `owned` ({level, xp}) in place, applying xpGained and rolling
  // over into level-ups as needed. Returns the list of levels newly reached.
  function applyXp(owned, xpGained) {
    owned.xp += xpGained;
    var levelsReached = [];
    var need = xpToNext(owned.level);
    while (owned.xp >= need) {
      owned.xp -= need;
      owned.level += 1;
      levelsReached.push(owned.level);
      need = xpToNext(owned.level);
    }
    return levelsReached;
  }

  // ---- Session rating (0-100) ----
  // actual: { distanceKm, plannedDistanceKm, avgPaceSecPerKm, avgHr,
  //           targetHrLow, targetHrHigh, feel, raceTimeTrend, checked }
  function computeSessionRating(actual) {
    var breakdown = {};

    // Completion & adherence (40 pts)
    if (!actual.checked) {
      breakdown.completion = 0;
    } else if (actual.isExtra) {
      // Extra/unplanned session (see README "Extra sessions") — there's no
      // planned target to have hit or missed, so full completion credit by
      // default; the "no matching bonus" rule is applied separately, in
      // processSync, not here.
      breakdown.completion = 40;
    } else if (actual.plannedDistanceKm > 0 && typeof actual.distanceKm === 'number') {
      var deviation = Math.abs(actual.distanceKm / actual.plannedDistanceKm - 1);
      // Full credit within +/-10% deviation, linearly down to 0 by +/-40%.
      var frac = deviation <= 0.10 ? 1 : Math.max(0, 1 - (deviation - 0.10) / 0.30);
      breakdown.completion = Math.round(40 * frac);
    } else {
      breakdown.completion = 30; // checked, no distance data — reasonable partial credit
    }

    // Execution accuracy (30 pts)
    if (typeof actual.avgHr === 'number' && typeof actual.targetHrLow === 'number' && typeof actual.targetHrHigh === 'number') {
      var zoneWidth = Math.max(1, actual.targetHrHigh - actual.targetHrLow);
      var outside = 0;
      if (actual.avgHr < actual.targetHrLow) outside = actual.targetHrLow - actual.avgHr;
      else if (actual.avgHr > actual.targetHrHigh) outside = actual.avgHr - actual.targetHrHigh;
      var ratio = outside / zoneWidth;
      breakdown.execution = Math.max(0, Math.round(30 * Math.max(0, 1 - ratio)));
    } else {
      breakdown.execution = 20; // no HR data — neutral partial credit
    }

    // Progress/improvement (20 pts) — never negative
    if (actual.raceTimeTrend === 'improved') breakdown.progress = 20;
    else if (actual.raceTimeTrend === 'flat') breakdown.progress = 10;
    else if (actual.raceTimeTrend === 'regressed') breakdown.progress = 0;
    else breakdown.progress = 10; // no data — neutral partial credit

    // Effort alignment (10 pts) — lenient
    if (typeof actual.feel === 'number') {
      breakdown.effort = (actual.feel >= 30 && actual.feel <= 95) ? 10 : 6;
    } else {
      breakdown.effort = 8;
    }

    var score = breakdown.completion + breakdown.execution + breakdown.progress + breakdown.effort;
    return { score: score, breakdown: breakdown };
  }

  function categoryMatchMultiplier(runnyCategory, sessionCategory) {
    return runnyCategory === sessionCategory ? CATEGORY_MATCH_MULTIPLIER : 1.0;
  }

  function xpAwarded(baseScore, catMatch, level, stageIndex, distanceKm, toughWeather) {
    return Math.round(
      baseScore * catMatch * levelMultiplier(level) * stageMultiplier(stageIndex) *
      mileageMultiplierFor(distanceKm) * weatherMultiplierFor(toughWeather)
    );
  }

  // ---- Item drops (pity-timer), now with the category-match probability boost ----
  // Returns { trainingShard: bool, evolutionCore: bool, newPityCounter }
  function rollItemDrop(pityCounter, eligible, categoryMatch) {
    if (!eligible) return { trainingShard: false, evolutionCore: false, newPityCounter: pityCounter };
    var boost = categoryMatch ? CATEGORY_MATCH_MULTIPLIER : 1;
    var trainingShard = Math.random() < Math.min(1, TRAINING_SHARD_CHANCE * boost);
    var coreChance = Math.min(1, (EVOLUTION_CORE_BASE_CHANCE + EVOLUTION_CORE_PITY_INCREMENT * pityCounter) * boost);
    // Pity guarantees a drop by EVOLUTION_CORE_PITY_CAP_COUNT consecutive misses.
    var guaranteed = pityCounter >= EVOLUTION_CORE_PITY_CAP_COUNT;
    var evolutionCore = guaranteed || Math.random() < coreChance;
    var newPityCounter = evolutionCore ? 0 : pityCounter + 1;
    return { trainingShard: trainingShard, evolutionCore: evolutionCore, newPityCounter: newPityCounter };
  }

  // ---- Species eggs (collecting new Runnies) ----
  // Independent pity counter from Evolution Cores. Also boosted by category
  // match (probability only — identity stays uniform-random, see below) and
  // by a small flat bump on quality/long sessions specifically (harder
  // sessions, independent of which Runny is active).
  function rollEggDrop(pityCounter, eligible, categoryMatch, sessionCategory) {
    if (!eligible) return { egg: false, newPityCounter: pityCounter };
    var hardBonus = (sessionCategory === 'quality' || sessionCategory === 'long') ? HARD_SESSION_EGG_BONUS : 0;
    var boost = categoryMatch ? CATEGORY_MATCH_MULTIPLIER : 1;
    var chance = Math.min(1, (EGG_BASE_CHANCE + EGG_PITY_INCREMENT * pityCounter + hardBonus) * boost);
    var guaranteed = pityCounter >= EGG_PITY_CAP_COUNT;
    var egg = guaranteed || Math.random() < chance;
    return { egg: egg, newPityCounter: egg ? 0 : pityCounter + 1 };
  }

  // Egg identity is uniform-random across all non-legendary species —
  // deliberately NOT weighted toward the active Runny's category (unlike
  // Evolution Cores), so eggs feel like a wildcard/discovery mechanic. The
  // legendary Finishron is never obtainable this way (race-only, see roster).
  function pickRandomCollectibleSpecies() {
    var pool = global.RunnyData.RUNNIES.filter(function (r) { return !r.legendary; });
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Mutates gameState for one egg drop. If the rolled species isn't owned
  // yet, adds progress toward hatching it (auto-hatches at EGGS_NEEDED_TO_HATCH,
  // never stockpiles beyond that). If it's already owned, converts the
  // "duplicate" instead of wasting it: 30% a random-category Evolution Core,
  // 70% a flat XP bonus applied directly to that species (even if it's not
  // currently active — a small reason to still care about it).
  function applyEggDrop(gameState) {
    var species = pickRandomCollectibleSpecies();
    gameState.inventory.eggs = gameState.inventory.eggs || {};
    if (gameState.owned[species.id]) {
      if (Math.random() < DUPLICATE_EGG_CORE_CHANCE) {
        var categories = Object.keys(global.RunnyData.CATEGORIES).filter(function (c) { return c !== 'race'; });
        var cat = categories[Math.floor(Math.random() * categories.length)];
        gameState.inventory.evolutionCores[cat] = (gameState.inventory.evolutionCores[cat] || 0) + 1;
        return { type: 'duplicate-core', speciesId: species.id, category: cat };
      }
      applyXp(gameState.owned[species.id], DUPLICATE_EGG_XP_BONUS);
      return { type: 'duplicate-xp', speciesId: species.id, amount: DUPLICATE_EGG_XP_BONUS };
    }
    gameState.inventory.eggs[species.id] = (gameState.inventory.eggs[species.id] || 0) + 1;
    if (gameState.inventory.eggs[species.id] >= EGGS_NEEDED_TO_HATCH) {
      gameState.inventory.eggs[species.id] = 0;
      collectRunny(gameState, species.id);
      return { type: 'hatched', speciesId: species.id };
    }
    return { type: 'egg-progress', speciesId: species.id, have: gameState.inventory.eggs[species.id] };
  }

  // ---- Evolution ----
  // runny: the RunnyData species entry. stageIndex: current (0-based).
  function checkEvolutionEligible(runny, stageIndex, level, coresOwned) {
    var gate = runny.evolutionGates[stageIndex + 1];
    if (!gate) return { eligible: false, hasNextStage: false };
    var levelOk = level >= gate.level;
    var itemOk = coresOwned >= gate.evolutionCores;
    return {
      eligible: levelOk && itemOk,
      hasNextStage: true,
      levelOk: levelOk,
      itemOk: itemOk,
      levelNeeded: gate.level,
      coresNeeded: gate.evolutionCores,
      coresOwned: coresOwned
    };
  }

  // Mutates gameState: consumes cores, advances stage. Returns true on success.
  function evolveRunny(gameState, runnyId) {
    var runny = global.RunnyData.getRunny(runnyId);
    var owned = gameState.owned[runnyId];
    if (!runny || !owned) return false;
    var coresOwned = (gameState.inventory.evolutionCores[runny.category] || 0);
    var check = checkEvolutionEligible(runny, owned.stageIndex, owned.level, coresOwned);
    if (!check.eligible) return false;
    gameState.inventory.evolutionCores[runny.category] = coresOwned - check.coresNeeded;
    owned.stageIndex += 1;
    return true;
  }

  // Converts 1 Evolution Core (of the Runny's own category) directly into
  // XP for that Runny — available at any time, independent of stage (this
  // is what keeps Cores from becoming dead weight once a Runny is fully
  // evolved). Player's choice: bank Cores for a future evolution, or cash
  // one in now. Returns { ok:true, xpGain, levelsReached } or { ok:false }.
  function convertCoreToXp(gameState, runnyId) {
    var runny = global.RunnyData.getRunny(runnyId);
    var owned = gameState.owned[runnyId];
    if (!runny || !owned) return { ok: false };
    var coresOwned = gameState.inventory.evolutionCores[runny.category] || 0;
    if (coresOwned < 1) return { ok: false };
    gameState.inventory.evolutionCores[runny.category] = coresOwned - 1;
    var xpGain = Math.round(xpToNext(owned.level) * CORE_TO_XP_FRACTION);
    var levelsReached = applyXp(owned, xpGain);
    return { ok: true, xpGain: xpGain, levelsReached: levelsReached };
  }

  // ---- Training Shard's dual purpose ----
  // Cosmetic only — no stat/mechanical effect. One-time per Runny.
  function unlockShiny(gameState, runnyId) {
    var owned = gameState.owned[runnyId];
    if (!owned) return { ok: false, reason: 'not-owned' };
    if (owned.shiny) return { ok: false, reason: 'already-shiny' };
    if ((gameState.inventory.trainingShard || 0) < SHINY_UNLOCK_COST) return { ok: false, reason: 'insufficient-shards' };
    gameState.inventory.trainingShard -= SHINY_UNLOCK_COST;
    owned.shiny = true;
    return { ok: true };
  }

  // Deterministic, no RNG — the "find the missing piece" lever. type:
  // 'core' (choice = any category) or 'egg' (choice = a NOT-yet-owned
  // species id only). Never touches pityCounter/eggPityCounter — this path
  // is entirely separate from the organic drop/pity system.
  function exchangeShardsForChoice(gameState, type, choice) {
    if ((gameState.inventory.trainingShard || 0) < SHARD_EXCHANGE_COST) {
      return { ok: false, reason: 'insufficient-shards' };
    }
    if (type === 'core') {
      if (!global.RunnyData.CATEGORIES[choice] || choice === 'race') return { ok: false, reason: 'invalid-category' };
      gameState.inventory.trainingShard -= SHARD_EXCHANGE_COST;
      gameState.inventory.evolutionCores[choice] = (gameState.inventory.evolutionCores[choice] || 0) + 1;
      return { ok: true, type: 'core', category: choice };
    }
    if (type === 'egg') {
      if (gameState.owned[choice]) return { ok: false, reason: 'already-owned' };
      var species = global.RunnyData.getRunny(choice);
      if (!species || species.legendary) return { ok: false, reason: 'invalid-species' };
      gameState.inventory.trainingShard -= SHARD_EXCHANGE_COST;
      gameState.inventory.eggs = gameState.inventory.eggs || {};
      gameState.inventory.eggs[choice] = (gameState.inventory.eggs[choice] || 0) + 1;
      if (gameState.inventory.eggs[choice] >= EGGS_NEEDED_TO_HATCH) {
        gameState.inventory.eggs[choice] = 0;
        collectRunny(gameState, choice);
        return { ok: true, type: 'egg', speciesId: choice, hatched: true };
      }
      return { ok: true, type: 'egg', speciesId: choice, hatched: false, have: gameState.inventory.eggs[choice] };
    }
    return { ok: false, reason: 'invalid-type' };
  }

  // ---- Race trophies (Finishron) ----
  function trophyCountForDistance(raceDistanceKm, goalAchieved) {
    var base = 1;
    for (var i = 0; i < RACE_TROPHY_TABLE.length; i++) {
      if (raceDistanceKm <= RACE_TROPHY_TABLE[i].maxKm) { base = RACE_TROPHY_TABLE[i].count; break; }
    }
    return goalAchieved ? base * 2 : base;
  }

  // Mutates gameState: collects Finishron if this is the first race, awards
  // trophies, cascades 5-for-1 up the tiers, and grants a one-time permanent
  // Star at 5 platinum (further platinum trophies after that just keep
  // counting — no second star, not designed for repeats).
  function processRaceCompletion(gameState, actual) {
    collectRunny(gameState, 'finishron');
    gameState.inventory.trophies = gameState.inventory.trophies || { bronze: 0, silver: 0, gold: 0, platinum: 0 };
    var count = trophyCountForDistance(actual.raceDistanceKm, !!actual.goalAchieved);
    gameState.inventory.trophies.bronze += count;

    var tiersGained = [];
    for (var i = 0; i < TROPHY_TIER_ORDER.length - 1; i++) {
      var cur = TROPHY_TIER_ORDER[i], next = TROPHY_TIER_ORDER[i + 1];
      while (gameState.inventory.trophies[cur] >= TROPHIES_PER_TIER_UP) {
        gameState.inventory.trophies[cur] -= TROPHIES_PER_TIER_UP;
        gameState.inventory.trophies[next] += 1;
        tiersGained.push(next);
      }
    }

    var gotStar = false;
    if (!gameState.owned.finishron.hasStar && gameState.inventory.trophies.platinum >= TROPHIES_PER_TIER_UP) {
      gameState.inventory.trophies.platinum -= TROPHIES_PER_TIER_UP;
      gameState.owned.finishron.hasStar = true;
      gotStar = true;
    }

    return { trophiesAwarded: count, tiersGained: tiersGained, gotStar: gotStar };
  }

  // ---- Active Runny selection & history ----
  function setActiveRunny(gameState, runnyId, dateStr) {
    gameState.activeRunnyId = runnyId;
    gameState.activeRunnyHistory = gameState.activeRunnyHistory || [];
    var last = gameState.activeRunnyHistory[gameState.activeRunnyHistory.length - 1];
    if (!last || last.runnyId !== runnyId) {
      gameState.activeRunnyHistory.push({ runnyId: runnyId, activeFrom: dateStr });
    }
  }

  // Who was active on a given date (history is ascending by activeFrom).
  function activeRunnyAt(history, dateStr) {
    if (!history || !history.length) return null;
    var found = null;
    for (var i = 0; i < history.length; i++) {
      if (history[i].activeFrom <= dateStr) found = history[i].runnyId;
      else break;
    }
    return found;
  }

  // ---- Weekly recovery bonus ----
  // Monday-start week key ('YYYY-MM-DD') for a given date string.
  function weekStartFor(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    var day = d.getDay(); // 0=Sun..6=Sat
    var diffToMonday = (day === 0 ? -6 : 1 - day);
    d.setDate(d.getDate() + diffToMonday);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function weeklyRecoveryBonusXp(recoveryScore0to100) {
    return Math.round(recoveryScore0to100 * RECOVERY_BONUS_XP_PER_POINT);
  }

  // ---- Non-punitive streak (consecutive weeks meeting the planned session count) ----
  // weeklyCompletion: { [weekKey]: { planned, completed } } — computed by the
  // calling page from its own session/tile data; the engine doesn't need to
  // know about tiles. Called alongside processSync from the Sync button.
  // Missing a week just resets the streak to 0 — no other penalty.
  function updateStreak(gameState, weeklyCompletion, todayDateStr) {
    gameState.currentStreakWeeks = gameState.currentStreakWeeks || 0;
    var weekKeys = Object.keys(weeklyCompletion || {}).sort();
    var changed = [];
    weekKeys.forEach(function (weekKey) {
      if (gameState.lastStreakWeekChecked && weekKey <= gameState.lastStreakWeekChecked) return;
      var w = weeklyCompletion[weekKey];
      if (w.planned > 0 && w.completed >= w.planned) {
        gameState.currentStreakWeeks += 1;
        changed.push({ weekKey: weekKey, kept: true });
      } else {
        gameState.currentStreakWeeks = 0;
        changed.push({ weekKey: weekKey, kept: false });
      }
      gameState.lastStreakWeekChecked = weekKey;
    });
    return changed;
  }

  // ---- Team Power (hub/farm aggregate stat) ----
  function runnyPower(owned) {
    return Math.round(owned.level * totalMultiplier(owned.level, owned.stageIndex));
  }
  function teamPower(gameState) {
    var total = 0;
    Object.keys(gameState.owned || {}).forEach(function (id) {
      total += runnyPower(gameState.owned[id]);
    });
    if (gameState.owned.finishron && gameState.owned.finishron.hasStar) {
      total += STAR_TEAM_POWER_BONUS;
    }
    return total;
  }

  // ---- Default state helpers ----
  function blankGameState() {
    return {
      owned: {},
      activeRunnyId: null,
      activeRunnyHistory: [],
      inventory: {
        trainingShard: 0,
        evolutionCores: { easy: 0, quality: 0, long: 0, strength: 0 },
        eggs: {},
        trophies: { bronze: 0, silver: 0, gold: 0, platinum: 0 }
      },
      pityCounter: 0,
      eggPityCounter: 0,
      processedSessionIds: [],
      sessionScores: {},
      xpEarnersThisWeek: {},
      lastRecoveryWeekClaimed: null,
      currentStreakWeeks: 0,
      lastStreakWeekChecked: null
    };
  }

  function collectRunny(gameState, runnyId) {
    if (!gameState.owned[runnyId]) {
      gameState.owned[runnyId] = { level: 1, xp: 0, stageIndex: 0 };
    }
  }

  // ---- Main orchestrator — what the Sync button calls ----
  // sessionActuals: { [sid]: { date, category, plannedDistanceKm, distanceKm,
  //                             avgPaceSecPerKm, avgHr, targetHrLow, targetHrHigh,
  //                             feel, raceTimeTrend, checked, toughWeather?,
  //                             isRace?, raceDistanceKm?, goalAchieved?, isNewPB? } }
  // recoveryWeekly: { [weekStartDate]: recoveryScore0to100 }
  // Mutates gameState in place. Returns a results summary for the reveal UI.
  function processSync(gameState, sessionActuals, recoveryWeekly) {
    var results = { ratedSessions: [], levelUps: [], itemDrops: [], eggEvents: [], raceEvents: [], evolutionReady: [], recoveryBonuses: [] };
    gameState.eggPityCounter = gameState.eggPityCounter || 0;
    gameState.inventory.eggs = gameState.inventory.eggs || {};
    gameState.inventory.trophies = gameState.inventory.trophies || { bronze: 0, silver: 0, gold: 0, platinum: 0 };
    gameState.sessionScores = gameState.sessionScores || {};

    Object.keys(sessionActuals).forEach(function (sid) {
      if (gameState.processedSessionIds.indexOf(sid) !== -1) return;
      var actual = sessionActuals[sid];
      var activeId = activeRunnyAt(gameState.activeRunnyHistory, actual.date);
      if (!activeId || !gameState.owned[activeId]) return; // nothing active yet at that date — leave pending

      var runny = global.RunnyData.getRunny(activeId);
      var owned = gameState.owned[activeId];
      var rating = computeSessionRating(actual);
      // Extra/unplanned sessions never get the matching bonus (XP or drop
      // probability) — there's no prescribed session to have "matched," and
      // this keeps spamming extra sessions from becoming a bonus-farming
      // exploit. Still rated, still earns baseline XP/items, per README.
      var isMatch = !actual.isExtra && runny.category === actual.category;
      var catMatch = actual.isExtra ? 1.0 : categoryMatchMultiplier(runny.category, actual.category);
      var xp = xpAwarded(rating.score, catMatch, owned.level, owned.stageIndex, actual.distanceKm, actual.toughWeather);
      var beforeLevel = owned.level;
      applyXp(owned, xp);

      if (owned.level > beforeLevel) {
        results.levelUps.push({ sid: sid, runnyId: activeId, from: beforeLevel, to: owned.level });
      }

      var eligible = rating.score >= MIN_SCORE_FOR_ITEM_ELIGIBILITY;
      var drop = rollItemDrop(gameState.pityCounter, eligible, isMatch);
      gameState.pityCounter = drop.newPityCounter;
      if (drop.trainingShard) gameState.inventory.trainingShard += 1;
      if (drop.evolutionCore) {
        gameState.inventory.evolutionCores[runny.category] = (gameState.inventory.evolutionCores[runny.category] || 0) + 1;
      }
      results.itemDrops.push({ sid: sid, trainingShard: drop.trainingShard, evolutionCore: drop.evolutionCore ? runny.category : null });

      var eggRoll = rollEggDrop(gameState.eggPityCounter, eligible, isMatch, actual.category);
      gameState.eggPityCounter = eggRoll.newPityCounter;
      if (eggRoll.egg) {
        var eggResult = applyEggDrop(gameState);
        eggResult.sid = sid;
        results.eggEvents.push(eggResult);
      }

      if (actual.isRace) {
        var raceResult = processRaceCompletion(gameState, actual);
        raceResult.sid = sid;
        raceResult.isNewPB = !!actual.isNewPB;
        results.raceEvents.push(raceResult);
      }

      var weekKey = weekStartFor(actual.date);
      gameState.xpEarnersThisWeek[weekKey] = gameState.xpEarnersThisWeek[weekKey] || [];
      if (gameState.xpEarnersThisWeek[weekKey].indexOf(activeId) === -1) {
        gameState.xpEarnersThisWeek[weekKey].push(activeId);
      }

      gameState.processedSessionIds.push(sid);
      gameState.sessionScores[sid] = rating.score;
      results.ratedSessions.push({ sid: sid, score: rating.score, breakdown: rating.breakdown, xp: xp, runnyId: activeId });

      var coresOwned = gameState.inventory.evolutionCores[runny.category] || 0;
      var elig = checkEvolutionEligible(runny, owned.stageIndex, owned.level, coresOwned);
      if (elig.eligible && results.evolutionReady.indexOf(activeId) === -1) {
        results.evolutionReady.push(activeId);
      }
    });

    // Recovery-bonus check — runs every call, independent of session processing above.
    var weekKeys = Object.keys(recoveryWeekly || {}).sort();
    weekKeys.forEach(function (weekKey) {
      if (gameState.lastRecoveryWeekClaimed && weekKey <= gameState.lastRecoveryWeekClaimed) return;
      var earners = gameState.xpEarnersThisWeek[weekKey] || [];
      if (earners.length > 0) {
        var bonus = weeklyRecoveryBonusXp(recoveryWeekly[weekKey]);
        var share = bonus / earners.length;
        earners.forEach(function (rid) {
          var o = gameState.owned[rid];
          if (o) applyXp(o, share);
        });
        results.recoveryBonuses.push({ weekKey: weekKey, bonus: bonus, earners: earners.slice() });
      }
      gameState.lastRecoveryWeekClaimed = weekKey;
    });

    return results;
  }

  global.GameEngine = {
    // constants (exposed for the UI/tuning, not meant to be mutated at runtime)
    CATEGORY_MATCH_MULTIPLIER: CATEGORY_MATCH_MULTIPLIER,
    MIN_SCORE_FOR_ITEM_ELIGIBILITY: MIN_SCORE_FOR_ITEM_ELIGIBILITY,
    EGGS_NEEDED_TO_HATCH: EGGS_NEEDED_TO_HATCH,
    SHINY_UNLOCK_COST: SHINY_UNLOCK_COST,
    SHARD_EXCHANGE_COST: SHARD_EXCHANGE_COST,
    TROPHY_TIER_ORDER: TROPHY_TIER_ORDER,
    TROPHIES_PER_TIER_UP: TROPHIES_PER_TIER_UP,
    // core math
    xpToNext: xpToNext,
    levelMultiplier: levelMultiplier,
    stageMultiplier: stageMultiplier,
    totalMultiplier: totalMultiplier,
    mileageMultiplierFor: mileageMultiplierFor,
    weatherMultiplierFor: weatherMultiplierFor,
    applyXp: applyXp,
    computeSessionRating: computeSessionRating,
    categoryMatchMultiplier: categoryMatchMultiplier,
    xpAwarded: xpAwarded,
    // items & evolution
    rollItemDrop: rollItemDrop,
    checkEvolutionEligible: checkEvolutionEligible,
    evolveRunny: evolveRunny,
    convertCoreToXp: convertCoreToXp,
    unlockShiny: unlockShiny,
    exchangeShardsForChoice: exchangeShardsForChoice,
    // species eggs
    rollEggDrop: rollEggDrop,
    pickRandomCollectibleSpecies: pickRandomCollectibleSpecies,
    applyEggDrop: applyEggDrop,
    // race trophies
    trophyCountForDistance: trophyCountForDistance,
    processRaceCompletion: processRaceCompletion,
    // active Runny
    setActiveRunny: setActiveRunny,
    activeRunnyAt: activeRunnyAt,
    // recovery & streak
    weekStartFor: weekStartFor,
    weeklyRecoveryBonusXp: weeklyRecoveryBonusXp,
    updateStreak: updateStreak,
    // aggregate
    runnyPower: runnyPower,
    teamPower: teamPower,
    // state helpers
    blankGameState: blankGameState,
    collectRunny: collectRunny,
    // orchestrator
    processSync: processSync
  };
})(typeof window !== 'undefined' ? window : global);

// Node-runnable for balance-sim.js — browser usage (the `window` branch
// above) is completely unaffected by this.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = (typeof window !== 'undefined' ? window : global).GameEngine;
}
