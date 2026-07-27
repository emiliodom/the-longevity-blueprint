/**
 * blockStyleConfig.js — single tunable surface for how training blocks look
 * and behave in the Week Builder: style (color/icon), position (palette
 * order, card sizing/spacing), collision (SortableJS swap feel), and
 * animation (drag timing, ghost opacity).
 *
 * Retune any of that by editing the plain data below — never weekBuilder.js
 * or style.css. Adding a new block category (see lib/templates.js on the
 * server) only needs an entry in BLOCK_CATEGORY_STYLE to render correctly
 * everywhere: palette, board card, and drag ghost.
 *
 * Wrapped in an IIFE — see weekBuilder.js's header comment for why: plain
 * <script> tags share one global scope, so the consts below must not leak
 * globally themselves — only the final `window.BlockStyleConfig` is the
 * intentional, deliberate global.
 */
(function () {

// Palette/board order is the object's key order. `accent` drives the
// left-border color via a CSS custom property (--block-accent) — see
// .block-card / .palette-item in style.css — so no per-category CSS rule
// is needed when a new sport is added here.
const BLOCK_CATEGORY_STYLE = {
  run:          { label: '🏃 Running',        accent: '#38bdf8', fallbackIcon: '🏃' },
  trail:        { label: '⛰️ Trail Running',   accent: '#65a30d', fallbackIcon: '⛰️' },
  weights:      { label: '💪 Weight Training', accent: '#a78bfa', fallbackIcon: '💪' },
  calisthenics: { label: '🤺 Calisthenics',    accent: '#f472b6', fallbackIcon: '🤺' },
  cycling:      { label: '🚴 Cycling',         accent: '#fb923c', fallbackIcon: '🚴' },
  swimming:     { label: '🏊 Swimming',        accent: '#22d3ee', fallbackIcon: '🏊' },
  boxing:       { label: '🥊 Boxing',          accent: '#f87171', fallbackIcon: '🥊' },
  stretch:      { label: '🤸 Stretching',      accent: '#34d399', fallbackIcon: '🤸' }
};

// Badge shown per sub-item inside an expanded compound block (weekBuilder.js)
// and per queue step in the timer (blockTimerWidget.js/sprintTimer.js) — the
// structural distinction from exercises.js's `mode` field, not a sport icon.
const MODE_STYLE = {
  interval: { icon: '⚡', label: 'Interval' },
  steady:   { icon: '➡️', label: 'Steady' },
  strength: { icon: '🏋️', label: 'Strength' },
  mobility: { icon: '🧘', label: 'Mobility' }
};

// Card "position" tunables — sizing/spacing for every block card in a day column.
const BLOCK_CARD_LAYOUT = {
  minHeightPx:    44,
  borderRadiusPx: 10,
  paddingPx:      8
};

// Drag-and-drop feel, passed straight into every SortableJS instance in
// weekBuilder.js. "Collision" tuning lives here: swapThreshold/invertSwap
// govern how close a dragged block must get to another before they swap —
// see https://github.com/SortableJS/Sortable#options for the full list.
const BLOCK_DRAG_CONFIG = {
  animationMs:    150,
  swapThreshold:  1,
  invertSwap:     false,
  ghostOpacity:   0.4,
  // Pointer-based dragging instead of native HTML5 DnD — avoids native DnD's
  // inconsistent drag-image rendering and friction with fixed/sticky
  // ancestors (this layout has both), and works uniformly across mouse and touch.
  forceFallback:  true,
  // A touch-scroll gesture starts with the exact same touchstart/touchmove
  // as a drag — without a delay, swiping to scroll past a block on mobile
  // could get misread as picking it up and dropping it on another day.
  // delayOnTouchOnly keeps mouse/desktop dragging instant (no delay there).
  touchDelayMs:          150,
  touchStartThresholdPx: 5
};

function categoryStyle(category) {
  return BLOCK_CATEGORY_STYLE[category] || { label: category, accent: '#94a3b8', fallbackIcon: '•' };
}

function modeStyle(mode) {
  return MODE_STYLE[mode] || { icon: '•', label: mode || 'Unknown' };
}

function cardInlineStyle(category) {
  return {
    '--block-accent': categoryStyle(category).accent,
    minHeight:    `${BLOCK_CARD_LAYOUT.minHeightPx}px`,
    borderRadius: `${BLOCK_CARD_LAYOUT.borderRadiusPx}px`,
    padding:      `${BLOCK_CARD_LAYOUT.paddingPx}px`
  };
}

function sortableOptions(extra = {}) {
  return {
    animation:            BLOCK_DRAG_CONFIG.animationMs,
    swapThreshold:        BLOCK_DRAG_CONFIG.swapThreshold,
    invertSwap:           BLOCK_DRAG_CONFIG.invertSwap,
    forceFallback:        BLOCK_DRAG_CONFIG.forceFallback,
    delay:                BLOCK_DRAG_CONFIG.touchDelayMs,
    delayOnTouchOnly:     true,
    touchStartThreshold:  BLOCK_DRAG_CONFIG.touchStartThresholdPx,
    ghostClass:           'block-ghost',
    ...extra,
    // Elements matching `filter` are excluded from initiating a drag —
    // merged (not overwritten) with any selector a caller passed in `extra`
    // (e.g. category headers), so the ⓘ info buttons are always excluded
    // everywhere a tap should reach its click handler instead of being
    // captured as a drag/touch gesture. preventOnFilter:false is required
    // for that — otherwise Sortable still calls preventDefault() on the
    // filtered element's initiating touch, which can suppress the
    // browser's synthesized click on mobile.
    filter:          ['.palette-item-info', '.block-card-action-btn', '.block-card-expand-btn', '.subblock-panel', '.inline-timer', extra.filter].filter(Boolean).join(', '),
    preventOnFilter: false
  };
}

// Ghost opacity is applied via plain CSS (.block-ghost in style.css) reading
// this custom property — SortableJS owns the ghost element directly, so
// there's no Vue-bound element to attach an inline style to.
document.documentElement.style.setProperty('--block-ghost-opacity', BLOCK_DRAG_CONFIG.ghostOpacity);

window.BlockStyleConfig = { BLOCK_CATEGORY_STYLE, MODE_STYLE, BLOCK_CARD_LAYOUT, BLOCK_DRAG_CONFIG, categoryStyle, modeStyle, cardInlineStyle, sortableOptions };

})();
