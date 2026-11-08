// Runnies — SESSION_ACTUALS and RECOVERY_WEEKLY for the Zurich Marathon plan.
// Populated by Claude during each on-demand data sync (see CLAUDE.md's sync
// playbook), one SESSION_ACTUALS entry per rated session (keyed by the same
// data-sid used on zurich_marathon_training_plan.html's tiles, all prefixed
// "zm-" to stay distinct from the Lausanne plan's sids in the shared
// plan-progress/plan-gamification Firebase state) and one RECOVERY_WEEKLY
// entry per completed week (Monday-start date key -> 0-100 recovery score).
// Starts empty, deliberately — no fabricated performance data for real
// sessions; entries get added here as real syncs happen.
//
// Loaded by zurich_marathon_training_plan.html only (training_hub.html reads
// its own hub-level fields from the shared Firebase state, not this file).
//
// Shape reference — identical to session-data.js (the Lausanne plan's file);
// see that file's header comment or Gamification Sandbox/README.md for the
// full field-by-field rationale. Example once populated:
//   SESSION_ACTUALS['zm-w1-easy1'] = {
//     date: 'YYYY-MM-DD', category: 'easy'|'quality'|'long'|'strength'|'race',
//     plannedDistanceKm, distanceKm, avgPaceSecPerKm, avgHr,
//     targetHrLow, targetHrHigh, feel, raceTimeTrend: 'improved'|'flat'|'regressed'|null,
//     checked: true,
//     toughWeather?: bool, isExtra?: bool,
//     isRace?: bool, raceDistanceKm?, goalAchieved?, isNewPB?
//   };
//   RECOVERY_WEEKLY['YYYY-MM-DD' (Monday)] = 0-100;

var SESSION_ACTUALS = {};
var RECOVERY_WEEKLY = {};
