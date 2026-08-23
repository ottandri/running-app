// Runnies — parametric SVG item icons. Training Shard (universal, common)
// and Evolution Core (category-colored, rare) — same visual philosophy as
// creature-art.js. viewBox 0 0 100 100.

(function (global) {

  function coreColorVar(category) {
    var cat = global.RunnyData.CATEGORIES[category];
    var fallback = { easy: '#1F7A6C', quality: '#C93B1D', long: '#A6740F', strength: '#6D4C9E' }[category] || '#8C897F';
    return cat ? 'var(' + cat.colorVar + ', ' + fallback + ')' : fallback;
  }

  function renderTrainingShardSVG(size) {
    size = size || 80;
    return '<svg viewBox="0 0 100 100" width="' + size + '" height="' + size + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Training Shard">' +
      '<polygon points="50,12 74,32 66,80 34,80 26,32" fill="#D8CBAE" stroke="#B8A87E" stroke-width="1.5"/>' +
      '<polygon points="50,12 74,32 50,44 26,32" fill="#EDE3C8"/>' +
      '<polygon points="50,44 74,32 66,80 50,70" fill="#C7B991" opacity="0.8"/>' +
      '<polygon points="50,44 26,32 34,80 50,70" fill="#DCCFAC" opacity="0.9"/>' +
      '</svg>';
  }

  function renderEvolutionCoreSVG(category, size) {
    size = size || 80;
    var color = coreColorVar(category);
    var filterId = 'core-glow-' + category + '-' + Math.floor(Math.random() * 100000);
    return '<svg viewBox="0 0 100 100" width="' + size + '" height="' + size + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Evolution Core">' +
      '<filter id="' + filterId + '" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<g filter="url(#' + filterId + ')">' +
      '<circle cx="50" cy="50" r="34" fill="' + color + '" opacity="0.9"/>' +
      '<circle cx="50" cy="50" r="34" fill="none" stroke="' + color + '" stroke-width="3" stroke-opacity="0.5"/>' +
      '<circle cx="42" cy="40" r="9" fill="#FFFFFF" opacity="0.35"/>' +
      '</g>' +
      '</svg>';
  }

  // A species egg — how new Runnies are collected (see game-engine.js
  // applyEggDrop). Recolored per category like Evolution Cores, so the
  // player can tell at a glance roughly which specialty an egg belongs to.
  function renderSpeciesEggSVG(category, size) {
    size = size || 72;
    var color = coreColorVar(category);
    return '<svg viewBox="0 0 100 100" width="' + size + '" height="' + size + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Species egg">' +
      '<ellipse cx="50" cy="56" rx="28" ry="34" fill="' + color + '" opacity="0.85"/>' +
      '<ellipse cx="50" cy="56" rx="28" ry="34" fill="none" stroke="' + color + '" stroke-width="2" stroke-opacity="0.5"/>' +
      '<circle cx="40" cy="42" r="3.5" fill="#FFFFFF" opacity="0.4"/>' +
      '<circle cx="58" cy="60" r="3" fill="#FFFFFF" opacity="0.3"/>' +
      '<circle cx="46" cy="70" r="2.5" fill="#FFFFFF" opacity="0.3"/>' +
      '</svg>';
  }

  // Race trophies (Finishron only) — 4 tiers, 5-for-1 cascade up to a
  // permanent Star (see game-engine.js processRaceCompletion).
  var TROPHY_TIER_COLORS = { bronze: '#B0703A', silver: '#B8BEC7', gold: '#D9A441', platinum: '#B7A8E8' };
  function renderTrophySVG(tier, size) {
    size = size || 56;
    var color = TROPHY_TIER_COLORS[tier] || TROPHY_TIER_COLORS.bronze;
    return '<svg viewBox="0 0 100 100" width="' + size + '" height="' + size + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + tier + ' trophy">' +
      '<path d="M32 30 H68 V48 C68 62 60 70 50 70 C40 70 32 62 32 48 Z" fill="' + color + '"/>' +
      '<path d="M32 34 C22 34 20 46 30 50" fill="none" stroke="' + color + '" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M68 34 C78 34 80 46 70 50" fill="none" stroke="' + color + '" stroke-width="4" stroke-linecap="round"/>' +
      '<rect x="45" y="70" width="10" height="10" fill="' + color + '"/>' +
      '<rect x="36" y="80" width="28" height="7" rx="2" fill="' + color + '"/>' +
      '</svg>';
  }

  // Not a Runny — a mascot icon shown on the weekly Recovery Bonus reveal
  // card (see README "Recovery bonus"). Deliberately outside the animal
  // roster/category-color system, since recovery is cross-cutting.
  function renderSlothMascotSVG(size) {
    size = size || 72;
    return '<svg viewBox="0 0 100 100" width="' + size + '" height="' + size + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Recovery sloth">' +
      '<ellipse cx="50" cy="62" rx="26" ry="22" fill="#9B8B75"/>' +
      '<circle cx="50" cy="38" r="18" fill="#B8A78C"/>' +
      '<ellipse cx="50" cy="32" rx="10" ry="6" fill="#D9CCB0" opacity="0.6"/>' +
      '<path d="M 40 36 Q 44 40, 40 44" stroke="#5B4E3A" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
      '<path d="M 60 36 Q 56 40, 60 44" stroke="#5B4E3A" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
      '<path d="M 45 50 Q 50 54, 55 50" stroke="#5B4E3A" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<path d="M 28 60 Q 14 66, 16 80" stroke="#9B8B75" stroke-width="10" fill="none" stroke-linecap="round"/>' +
      '<path d="M 72 60 Q 86 66, 84 80" stroke="#9B8B75" stroke-width="10" fill="none" stroke-linecap="round"/>' +
      '</svg>';
  }

  global.ItemArt = { renderTrainingShardSVG: renderTrainingShardSVG, renderEvolutionCoreSVG: renderEvolutionCoreSVG, renderSpeciesEggSVG: renderSpeciesEggSVG, renderSlothMascotSVG: renderSlothMascotSVG, renderTrophySVG: renderTrophySVG };
})(window);
