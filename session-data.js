// Runnies — SESSION_ACTUALS and RECOVERY_WEEKLY. Populated by Claude during
// each on-demand data sync (see CLAUDE.md's sync playbook), one SESSION_ACTUALS
// entry per rated session (keyed by the same data-sid used on the plan page's
// tiles) and one RECOVERY_WEEKLY entry per completed week (Monday-start date
// key -> 0-100 recovery score). Starts empty on merge, deliberately — no
// fabricated performance data for real sessions; entries get added here as
// real syncs happen.
//
// Loaded by both this plan page and training_hub.html (shared, not duplicated)
// so the hub's sync-ready badge and rest-day cameo can compute independently
// of whatever state the plan page happens to be in.
//
// Shape reference (see Gamification Sandbox/README.md "Rating formula" and
// "Border cases" for the full field-by-field rationale):
//   SESSION_ACTUALS['w2-quality'] = {
//     date: 'YYYY-MM-DD', category: 'easy'|'quality'|'long'|'strength'|'race',
//     plannedDistanceKm, distanceKm, avgPaceSecPerKm, avgHr,
//     targetHrLow, targetHrHigh, feel, raceTimeTrend: 'improved'|'flat'|'regressed'|null,
//     checked: true,
//     toughWeather?: bool,             // set during a sync via historical weather lookup
//     isExtra?: bool,                  // unplanned session, no corresponding plan tile
//     isRace?: bool, raceDistanceKm?, goalAchieved?, isNewPB?   // race entries only
//   };
//   RECOVERY_WEEKLY['YYYY-MM-DD' (Monday)] = 0-100;

var SESSION_ACTUALS = {};
var RECOVERY_WEEKLY = {};
