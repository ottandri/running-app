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

var SESSION_ACTUALS = {
  'w1-easy1': { date: '2026-08-10', category: 'easy', plannedDistanceKm: 12, distanceKm: 12.0, avgPaceSecPerKm: 366, avgHr: 137, targetHrLow: 138, targetHrHigh: 152, feel: 100, raceTimeTrend: null, checked: true },
  'w1-quality': { date: '2026-08-12', category: 'quality', plannedDistanceKm: 10, distanceKm: 8.6, avgPaceSecPerKm: 318, avgHr: 154, targetHrLow: 160, targetHrHigh: 185, feel: 75, raceTimeTrend: null, checked: true },
  'w1-easy2': { date: '2026-08-14', category: 'easy', plannedDistanceKm: 12, distanceKm: 12.0, avgPaceSecPerKm: 310, avgHr: 154, targetHrLow: 152, targetHrHigh: 169, feel: 100, raceTimeTrend: null, checked: true, toughWeather: true },
  'w1-long': { date: '2026-08-16', category: 'long', plannedDistanceKm: 14, distanceKm: 15.2, avgPaceSecPerKm: 398, avgHr: 145, targetHrLow: 138, targetHrHigh: 152, feel: 100, raceTimeTrend: null, checked: true },
  'w2-easy1': { date: '2026-08-17', category: 'easy', plannedDistanceKm: 13, distanceKm: 13.0, avgPaceSecPerKm: 323, avgHr: 148, targetHrLow: 138, targetHrHigh: 152, feel: 100, raceTimeTrend: null, checked: true },
  'w2-quality': { date: '2026-08-18', category: 'quality', plannedDistanceKm: 12, distanceKm: 8.2, avgPaceSecPerKm: 369, avgHr: 143, targetHrLow: 165, targetHrHigh: 188, feel: 25, raceTimeTrend: null, checked: true, toughWeather: true },
  'w2-easy2': { date: '2026-08-20', category: 'easy', plannedDistanceKm: 13, distanceKm: 13.0, avgPaceSecPerKm: 291, avgHr: 162, targetHrLow: 152, targetHrHigh: 169, feel: 100, raceTimeTrend: null, checked: true },
  'w2-long': { date: '2026-08-22', category: 'long', plannedDistanceKm: 16, distanceKm: 16.0, avgPaceSecPerKm: 321, avgHr: 141, targetHrLow: 138, targetHrHigh: 152, feel: 100, raceTimeTrend: null, checked: true },
  'extra-2026-08-23': { date: '2026-08-23', category: 'easy', distanceKm: 6.8, avgPaceSecPerKm: 420, avgHr: 130, targetHrLow: 138, targetHrHigh: 152, feel: 100, raceTimeTrend: null, checked: true, isExtra: true },
  'w3-easy1': { date: '2026-08-24', category: 'easy', plannedDistanceKm: 14, distanceKm: 14.1, avgPaceSecPerKm: 324, avgHr: 149, targetHrLow: 138, targetHrHigh: 152, feel: 100, raceTimeTrend: null, checked: true }
};

var RECOVERY_WEEKLY = {
  '2026-08-10': 73,
  '2026-08-17': 50
};
