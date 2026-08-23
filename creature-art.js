// Runnies — parametric SVG renderer. One base silhouette per species-family,
// tinted with the species' category color (real site CSS variables), with
// stage overlays adding a feature per evolution. All shapes are original,
// simple geometric primitives — no bespoke per-stage artwork to maintain.
//
// Phase 2: shape families are animal-inspired per Andri's art direction —
// tortoise, hummingbird, hare, feline (cheetah), leopard, deer, bull,
// gorilla, plus the legendary medallion (deliberately non-animal). viewBox
// is 0 0 140 140.

(function (global) {

  function colorVarFor(category) {
    var cat = global.RunnyData.CATEGORIES[category];
    var fallback = { easy: '#1F7A6C', quality: '#C93B1D', long: '#A6740F', strength: '#6D4C9E', race: '#D9A441' }[category] || '#8C897F';
    return 'var(' + cat.colorVar + ', ' + fallback + ')';
  }

  function eyes(cx, cy, spacing) {
    return '<circle cx="' + (cx - spacing) + '" cy="' + cy + '" r="3.2" fill="#1C1B19" opacity="0.85"/>' +
           '<circle cx="' + (cx + spacing) + '" cy="' + cy + '" r="3.2" fill="#1C1B19" opacity="0.85"/>';
  }

  function sparkle(cx, cy, r) {
    return '<path d="M ' + cx + ' ' + (cy - r) + ' L ' + (cx + r * 0.25) + ' ' + (cy - r * 0.25) +
           ' L ' + (cx + r) + ' ' + cy + ' L ' + (cx + r * 0.25) + ' ' + (cy + r * 0.25) +
           ' L ' + cx + ' ' + (cy + r) + ' L ' + (cx - r * 0.25) + ' ' + (cy + r * 0.25) +
           ' L ' + (cx - r) + ' ' + cy + ' L ' + (cx - r * 0.25) + ' ' + (cy - r * 0.25) + ' Z" fill="#F2E6C4" opacity="0.9"/>';
  }

  function glowFilterDef(filterId) {
    return '<filter id="' + filterId + '" x="-60%" y="-60%" width="220%" height="220%">' +
           '<feGaussianBlur stdDeviation="4.5" result="blur"/>' +
           '<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>' +
           '</filter>';
  }

  // Each family fn: (color, stageIndex, filterId) -> inner SVG markup (no outer <svg>).
  var FAMILIES = {

    // --- Easy / Steady ---
    tortoise: function (color, stage, filterId) {
      var s = '';
      if (stage >= 2) s += glowFilterDef(filterId);
      var g = stage >= 2 ? ' filter="url(#' + filterId + ')"' : '';
      s += '<g' + g + '>';
      s += '<path d="M 30 95 A 40 34 0 0 1 110 95 Z" fill="' + color + '"/>';
      if (stage >= 1) {
        s += '<path d="M 45 95 A 25 22 0 0 1 70 76" fill="none" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="2.5"/>';
        s += '<path d="M 70 76 A 25 22 0 0 1 95 95" fill="none" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="2.5"/>';
      }
      s += '<circle cx="70" cy="99" r="10" fill="' + color + '"/>' + eyes(70, 98, 6);
      s += '<circle cx="42" cy="103" r="6" fill="' + color + '"/><circle cx="98" cy="103" r="6" fill="' + color + '"/>';
      if (stage >= 2) s += '<ellipse cx="20" cy="108" rx="12" ry="4" fill="' + color + '" opacity="0.3"/>';
      s += '</g>';
      return s;
    },
    hummingbird: function (color, stage, filterId) {
      var s = '';
      if (stage >= 2) s += glowFilterDef(filterId);
      var g = stage >= 2 ? ' filter="url(#' + filterId + ')"' : '';
      s += '<g' + g + '>';
      s += '<ellipse cx="68" cy="84" rx="18" ry="14" fill="' + color + '"/>';
      s += '<circle cx="88" cy="72" r="10" fill="' + color + '"/>';
      s += '<path d="M 97 72 L 114 69 L 97 76 Z" fill="' + color + '" opacity="0.9"/>';
      s += '<ellipse cx="56" cy="72" rx="22" ry="9" fill="' + color + '" opacity="0.5" transform="rotate(-18 56 72)"/>';
      if (stage >= 1) s += '<ellipse cx="50" cy="64" rx="20" ry="7" fill="#FFFFFF" opacity="0.25" transform="rotate(-30 50 64)"/>';
      s += '<path d="M 54 92 L 38 102 L 57 98 Z" fill="' + color + '" opacity="0.85"/>';
      s += eyes(88, 70, 4);
      if (stage >= 2) s += sparkle(112, 48, 6) + sparkle(42, 110, 5);
      s += '</g>';
      return s;
    },

    // --- Quality ---
    hare: function (color, stage, filterId) {
      var s = '';
      if (stage >= 2) s += glowFilterDef(filterId);
      var g = stage >= 2 ? ' filter="url(#' + filterId + ')"' : '';
      s += '<g' + g + '>';
      s += '<ellipse cx="72" cy="90" rx="26" ry="20" fill="' + color + '"/>';
      s += '<circle cx="58" cy="62" r="14" fill="' + color + '"/>' + eyes(58, 60, 5);
      s += '<ellipse cx="49" cy="36" rx="6" ry="18" fill="' + color + '" transform="rotate(-12 49 36)"/>';
      s += '<ellipse cx="67" cy="36" rx="6" ry="18" fill="' + color + '" transform="rotate(10 67 36)"/>';
      s += '<ellipse cx="94" cy="100" rx="13" ry="9" fill="' + color + '" opacity="0.85"/>';
      if (stage >= 1) s += '<path d="M 104 72 L 118 61 M 104 80 L 120 74" stroke="' + color + '" stroke-width="3" stroke-linecap="round" opacity="0.55"/>';
      if (stage >= 2) s += sparkle(118, 45, 6) + sparkle(30, 105, 5);
      s += '</g>';
      return s;
    },
    feline: function (color, stage, filterId) {
      var s = '';
      if (stage >= 2) s += glowFilterDef(filterId);
      var g = stage >= 2 ? ' filter="url(#' + filterId + ')"' : '';
      s += '<g' + g + '>';
      s += '<line x1="52" y1="98" x2="48" y2="114" stroke="' + color + '" stroke-width="5" stroke-linecap="round"/>';
      s += '<line x1="66" y1="100" x2="63" y2="116" stroke="' + color + '" stroke-width="5" stroke-linecap="round"/>';
      s += '<line x1="82" y1="98" x2="86" y2="114" stroke="' + color + '" stroke-width="5" stroke-linecap="round"/>';
      s += '<line x1="94" y1="94" x2="99" y2="110" stroke="' + color + '" stroke-width="5" stroke-linecap="round"/>';
      s += '<ellipse cx="70" cy="88" rx="34" ry="16" fill="' + color + '"/>';
      s += '<circle cx="100" cy="80" r="12" fill="' + color + '"/>' + eyes(100, 78, 5);
      s += '<path d="M 38 90 Q 18 94, 13 78" stroke="' + color + '" stroke-width="5" fill="none" stroke-linecap="round"/>';
      s += '<circle cx="58" cy="83" r="3" fill="#1C1B19" opacity="0.25"/><circle cx="73" cy="93" r="3" fill="#1C1B19" opacity="0.25"/><circle cx="83" cy="81" r="2.5" fill="#1C1B19" opacity="0.25"/>';
      if (stage >= 1) s += '<path d="M 18 68 L 6 64 M 23 78 L 8 78" stroke="' + color + '" stroke-width="3" stroke-linecap="round" opacity="0.5"/>';
      if (stage >= 2) s += sparkle(20, 55, 6) + sparkle(118, 50, 5);
      s += '</g>';
      return s;
    },

    // --- Long Run ---
    leopard: function (color, stage, filterId) {
      var s = '';
      if (stage >= 2) s += glowFilterDef(filterId);
      var g = stage >= 2 ? ' filter="url(#' + filterId + ')"' : '';
      s += '<g' + g + '>';
      s += '<line x1="50" y1="104" x2="45" y2="118" stroke="' + color + '" stroke-width="5" stroke-linecap="round"/>';
      s += '<line x1="64" y1="106" x2="60" y2="120" stroke="' + color + '" stroke-width="5" stroke-linecap="round"/>';
      s += '<line x1="82" y1="104" x2="87" y2="118" stroke="' + color + '" stroke-width="5" stroke-linecap="round"/>';
      s += '<line x1="96" y1="100" x2="102" y2="114" stroke="' + color + '" stroke-width="5" stroke-linecap="round"/>';
      s += '<ellipse cx="70" cy="94" rx="36" ry="14" fill="' + color + '"/>';
      s += '<circle cx="104" cy="86" r="11" fill="' + color + '"/>' + eyes(104, 84, 5);
      s += '<path d="M 34 96 Q 10 102, 6 84 Q 4 78, 12 78" stroke="' + color + '" stroke-width="5" fill="none" stroke-linecap="round"/>';
      s += '<circle cx="56" cy="88" r="4" fill="none" stroke="#1C1B19" stroke-opacity="0.3" stroke-width="1.6"/>';
      s += '<circle cx="71" cy="96" r="4" fill="none" stroke="#1C1B19" stroke-opacity="0.3" stroke-width="1.6"/>';
      s += '<circle cx="86" cy="86" r="3.5" fill="none" stroke="#1C1B19" stroke-opacity="0.3" stroke-width="1.6"/>';
      if (stage >= 1) s += '<ellipse cx="70" cy="94" rx="38" ry="15" fill="none" stroke="' + color + '" stroke-opacity="0.25" stroke-width="2"/>';
      if (stage >= 2) s += sparkle(120, 55, 6) + sparkle(18, 62, 5);
      s += '</g>';
      return s;
    },
    deer: function (color, stage, filterId) {
      var s = '';
      if (stage >= 2) s += glowFilterDef(filterId);
      var g = stage >= 2 ? ' filter="url(#' + filterId + ')"' : '';
      s += '<g' + g + '>';
      s += '<ellipse cx="72" cy="80" rx="30" ry="18" fill="' + color + '"/>';
      s += '<line x1="55" y1="95" x2="50" y2="115" stroke="' + color + '" stroke-width="6" stroke-linecap="round"/>';
      s += '<line x1="68" y1="97" x2="65" y2="118" stroke="' + color + '" stroke-width="6" stroke-linecap="round"/>';
      s += '<line x1="82" y1="97" x2="86" y2="118" stroke="' + color + '" stroke-width="6" stroke-linecap="round"/>';
      s += '<line x1="92" y1="93" x2="98" y2="112" stroke="' + color + '" stroke-width="6" stroke-linecap="round"/>';
      s += '<circle cx="45" cy="68" r="13" fill="' + color + '"/>' + eyes(45, 66, 5);
      if (stage >= 1) {
        s += '<line x1="40" y1="56" x2="34" y2="42" stroke="' + color + '" stroke-width="2.5"/><line x1="34" y1="42" x2="28" y2="46" stroke="' + color + '" stroke-width="2.5"/>';
        s += '<line x1="50" y1="56" x2="52" y2="41" stroke="' + color + '" stroke-width="2.5"/><line x1="52" y1="41" x2="58" y2="44" stroke="' + color + '" stroke-width="2.5"/>';
      }
      if (stage >= 2) s += '<ellipse cx="102" cy="115" rx="10" ry="3.5" fill="' + color + '" opacity="0.3"/>';
      s += '</g>';
      return s;
    },

    // --- Strength ---
    bull: function (color, stage, filterId) {
      var s = '';
      if (stage >= 2) s += glowFilterDef(filterId);
      var g = stage >= 2 ? ' filter="url(#' + filterId + ')"' : '';
      s += '<g' + g + '>';
      s += '<rect x="40" y="102" width="11" height="24" rx="4" fill="' + color + '"/><rect x="85" y="102" width="11" height="24" rx="4" fill="' + color + '"/>';
      s += '<ellipse cx="68" cy="86" rx="34" ry="20" fill="' + color + '"/>';
      s += '<circle cx="68" cy="60" r="16" fill="' + color + '"/>' + eyes(68, 58, 7);
      s += '<path d="M 56 48 Q 44 40, 40 28" stroke="' + color + '" stroke-width="5" fill="none" stroke-linecap="round"/>';
      s += '<path d="M 80 48 Q 92 40, 96 28" stroke="' + color + '" stroke-width="5" fill="none" stroke-linecap="round"/>';
      s += '<ellipse cx="68" cy="68" rx="8" ry="5" fill="#FFFFFF" opacity="0.25"/>';
      if (stage >= 1) s += '<ellipse cx="68" cy="90" rx="20" ry="12" fill="#FFFFFF" opacity="0.15"/>';
      if (stage >= 2) s += '<path d="M 55 82 L 68 97 L 80 80" stroke="#F2E6C4" stroke-opacity="0.6" stroke-width="2.5" fill="none"/>';
      s += '</g>';
      return s;
    },
    gorilla: function (color, stage, filterId) {
      var s = '';
      if (stage >= 2) s += glowFilterDef(filterId);
      var g = stage >= 2 ? ' filter="url(#' + filterId + ')"' : '';
      s += '<g' + g + '>';
      s += '<ellipse cx="70" cy="90" rx="32" ry="26" fill="' + color + '"/>';
      s += '<circle cx="70" cy="55" r="15" fill="' + color + '"/>' + eyes(70, 54, 6);
      s += '<path d="M 63 46 Q 70 42, 77 46" stroke="#1C1B19" stroke-opacity="0.25" stroke-width="2" fill="none"/>';
      s += '<path d="M 40 72 Q 30 100, 36 122" stroke="' + color + '" stroke-width="12" fill="none" stroke-linecap="round"/>';
      s += '<path d="M 100 72 Q 110 100, 104 122" stroke="' + color + '" stroke-width="12" fill="none" stroke-linecap="round"/>';
      if (stage >= 1) s += '<ellipse cx="70" cy="88" rx="18" ry="10" fill="#FFFFFF" opacity="0.15"/>';
      if (stage >= 2) s += sparkle(114, 50, 6) + sparkle(26, 50, 5);
      s += '</g>';
      return s;
    },

    // --- Race (legendary, non-animal on purpose) ---
    legend: function (color, stage, filterId) {
      var s = glowFilterDef(filterId);
      s += '<g filter="url(#' + filterId + ')">';
      s += '<polygon points="55,95 45,125 70,112 95,125 85,95" fill="' + color + '" opacity="0.85"/>';
      s += '<circle cx="70" cy="72" r="34" fill="' + color + '"/>';
      s += '<circle cx="70" cy="72" r="26" fill="none" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="2"/>';
      s += '<line x1="70" y1="72" x2="70" y2="54" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>';
      s += '<line x1="70" y1="72" x2="84" y2="80" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>';
      s += sparkle(96, 44, 7) + sparkle(44, 48, 6);
      s += '</g>';
      return s;
    }
  };

  var filterCounter = 0;

  // Returns a full <svg>...</svg> string sized to fill its container.
  // Shiny is purely cosmetic (see game-engine.js unlockShiny) — same family
  // renderer, just fed an alternate gradient instead of the category color,
  // plus a permanent sparkle overlay. No stat/mechanical effect.
  function renderRunnySVG(runnyId, stageIndex, options) {
    var runny = global.RunnyData.getRunny(runnyId);
    if (!runny) return '';
    var shiny = !!(options && options.shiny);
    filterCounter++;
    var filterId = 'runny-glow-' + runnyId + '-' + filterCounter;
    var color = shiny ? ('url(#shiny-grad-' + filterId + ')') : colorVarFor(runny.category);
    var family = FAMILIES[runny.shapeFamily] || FAMILIES.tortoise;
    var inner = family(color, stageIndex, filterId);
    if (shiny) {
      inner = '<defs><linearGradient id="shiny-grad-' + filterId + '" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0%" stop-color="#FFE9A8"/><stop offset="45%" stop-color="#F4C9E0"/><stop offset="100%" stop-color="#B9E3FF"/>' +
        '</linearGradient></defs>' + inner +
        sparkle(18, 18, 5) + sparkle(122, 24, 4) + sparkle(116, 116, 5) + sparkle(14, 112, 4);
    }
    var size = (options && options.size) || 140;
    return '<svg viewBox="0 0 140 140" width="' + size + '" height="' + size + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + runny.stages[stageIndex].name + (shiny ? ' (Shiny)' : '') + '">' + inner + '</svg>';
  }

  global.RunnyArt = { renderRunnySVG: renderRunnySVG, colorVarFor: colorVarFor };
})(window);
