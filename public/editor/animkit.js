/*!
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      AnimKit.js  v1.0.0                                  ║
 * ║            Complete Web Animation Library — Zero Dependencies             ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  SECTION 1  CSS KEYFRAMES     (injected into <head> automatically)        ║
 * ║  SECTION 2  CORE UTILITIES    (_el, _els, _merge, _cssAnim)               ║
 * ║  SECTION 3  ENTRANCE          fadeIn · slideIn · zoomIn · bounceIn        ║
 * ║                                flipIn · rotateIn · rollIn · backIn        ║
 * ║  SECTION 4  EXIT              fadeOut · slideOut · zoomOut · bounceOut    ║
 * ║  SECTION 5  ATTENTION         pulse · bounce · shake · wobble · flash     ║
 * ║                                rubberBand · jello · tada · heartbeat      ║
 * ║                                swing · spin · ping · breathe · float      ║
 * ║  SECTION 6  SCROLL REVEAL     scrollReveal() — IntersectionObserver       ║
 * ║  SECTION 7  TEXT EFFECTS      typewriter · morphText · splitText          ║
 * ║                                glitch · scramble · countUp · wavyText     ║
 * ║  SECTION 8  INTERACTION       ripple · tilt3D · magnetic · hoverLift      ║
 * ║                                cursorTrail                                 ║
 * ║  SECTION 9  PARALLAX          parallax() — scroll-depth effect            ║
 * ║  SECTION 10 STAGGER           stagger() — sequential element animation    ║
 * ║  SECTION 11 LOADERS           skeleton · progressBar                      ║
 * ║  SECTION 12 PAGE TRANSITION   pageTransition() — in/out overlay           ║
 * ║  SECTION 13 TIMELINE          timeline().animate().wait().run()           ║
 * ║  SECTION 14 UTILITIES         stop · pause · resume · wait · safe         ║
 * ║  SECTION 15 AUTO-INIT         data-anim attributes                        ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  QUICK START                                                              ║
 * ║                                                                            ║
 * ║  <!-- Drop-in script tag -->                                              ║
 * ║  <script src="animkit.js"></script>                                       ║
 * ║  <script>                                                                 ║
 * ║    AnimKit.init();                           // auto-reads data-anim      ║
 * ║    AnimKit.fadeInUp('#hero');                // entrance                  ║
 * ║    AnimKit.scrollReveal('.card');            // scroll trigger            ║
 * ║    AnimKit.typewriter('#title','Hello!');    // typewriter                ║
 * ║    AnimKit.countUp('#stat', { to: 9500 });  // counter                   ║
 * ║    AnimKit.stagger('.items li','fadeInUp'); // stagger list              ║
 * ║    AnimKit.parallax('#bg', { speed:0.4 }); // parallax                  ║
 * ║    AnimKit.ripple('.btn');                   // ripple on click           ║
 * ║    AnimKit.tilt3D('.card');                  // 3-D tilt hover            ║
 * ║    AnimKit.magnetic('.logo');               // magnetic hover            ║
 * ║  </script>                                                                ║
 * ║                                                                            ║
 * ║  HTML DATA ATTRIBUTES                                                     ║
 * ║  <div data-anim="fadeInUp"                                               ║
 * ║       data-anim-trigger="scroll"                                          ║
 * ║       data-anim-delay="200"                                               ║
 * ║       data-anim-duration="700">                                           ║
 * ║                                                                            ║
 * ║  ES MODULE                                                                ║
 * ║  import AnimKit from './animkit.js';                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

(function (root, factory) {
  /* UMD — works as <script>, CommonJS (require), or ES import */
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define(factory);
  } else {
    (typeof globalThis !== 'undefined' ? globalThis : root).AnimKit = factory();
  }
})(this, function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════════════════
   * SECTION 1 — CSS KEYFRAMES
   * All animations are defined as CSS @keyframes and injected once into <head>.
   * This keeps them GPU-composited and avoids layout thrash.
   * ═══════════════════════════════════════════════════════════════════════════ */

  var _CSS = /* css */`

  /* ── Base ─────────────────────────────────────────────────────────────────── */
  .ak-ripple-host { position: relative; overflow: hidden; }
  .ak-ripple-wave {
    position: absolute; border-radius: 50%; pointer-events: none;
    transform: scale(0); animation: ak-ripple-expand 0.65s linear forwards;
    background: rgba(255, 255, 255, 0.35);
  }
  .ak-cursor::after { content: '|'; animation: ak-blink 0.75s step-end infinite; }
  .ak-skeleton-box {
    background: linear-gradient(90deg, #e8eaed 25%, #f5f5f5 50%, #e8eaed 75%);
    background-size: 200% 100%;
    animation: ak-skeleton 1.5s infinite linear;
    border-radius: 4px;
    color: transparent !important;
  }
  .ak-skeleton-box * { visibility: hidden; }

  /* ── ENTRANCE keyframes ────────────────────────────────────────────────────── */

  @keyframes ak-fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes ak-fadeInUp {
    from { opacity: 0; transform: translateY(32px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes ak-fadeInDown {
    from { opacity: 0; transform: translateY(-32px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes ak-fadeInLeft {
    from { opacity: 0; transform: translateX(-40px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes ak-fadeInRight {
    from { opacity: 0; transform: translateX(40px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes ak-zoomIn {
    from { opacity: 0; transform: scale(0.65); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes ak-zoomInUp {
    from { opacity: 0; transform: scale(0.65) translateY(40px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes ak-zoomInDown {
    from { opacity: 0; transform: scale(0.65) translateY(-40px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes ak-bounceIn {
    0%   { opacity: 0; transform: scale(0.3); }
    50%  { opacity: 1; transform: scale(1.08); }
    70%  { transform: scale(0.95); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes ak-bounceInUp {
    0%   { opacity: 0; transform: translateY(60px); }
    60%  { opacity: 1; transform: translateY(-12px); }
    80%  { transform: translateY(5px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes ak-bounceInDown {
    0%   { opacity: 0; transform: translateY(-60px); }
    60%  { opacity: 1; transform: translateY(12px); }
    80%  { transform: translateY(-5px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes ak-bounceInLeft {
    0%   { opacity: 0; transform: translateX(-80px); }
    60%  { opacity: 1; transform: translateX(15px); }
    80%  { transform: translateX(-5px); }
    100% { opacity: 1; transform: translateX(0); }
  }
  @keyframes ak-bounceInRight {
    0%   { opacity: 0; transform: translateX(80px); }
    60%  { opacity: 1; transform: translateX(-15px); }
    80%  { transform: translateX(5px); }
    100% { opacity: 1; transform: translateX(0); }
  }
  @keyframes ak-flipInX {
    from { opacity: 0; transform: perspective(600px) rotateX(-90deg); }
    40%  { transform: perspective(600px) rotateX(20deg); }
    to   { opacity: 1; transform: perspective(600px) rotateX(0deg); }
  }
  @keyframes ak-flipInY {
    from { opacity: 0; transform: perspective(600px) rotateY(-90deg); }
    40%  { transform: perspective(600px) rotateY(20deg); }
    to   { opacity: 1; transform: perspective(600px) rotateY(0deg); }
  }
  @keyframes ak-rotateIn {
    from { opacity: 0; transform: rotate(-200deg); }
    to   { opacity: 1; transform: rotate(0deg); }
  }
  @keyframes ak-rollIn {
    from { opacity: 0; transform: translateX(-100%) rotate(-120deg); }
    to   { opacity: 1; transform: translateX(0) rotate(0deg); }
  }
  @keyframes ak-slideInUp {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
  @keyframes ak-slideInDown {
    from { transform: translateY(-100%); }
    to   { transform: translateY(0); }
  }
  @keyframes ak-slideInLeft {
    from { transform: translateX(-100%); }
    to   { transform: translateX(0); }
  }
  @keyframes ak-slideInRight {
    from { transform: translateX(100%); }
    to   { transform: translateX(0); }
  }
  @keyframes ak-backInDown {
    0%   { opacity: 0; transform: translateY(-220%) scale(0.7); }
    80%  { opacity: 0.7; transform: translateY(0) scale(0.7); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes ak-backInUp {
    0%   { opacity: 0; transform: translateY(220%) scale(0.7); }
    80%  { opacity: 0.7; transform: translateY(0) scale(0.7); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes ak-backInLeft {
    0%   { opacity: 0; transform: translateX(-220%) scale(0.7); }
    80%  { opacity: 0.7; transform: translateX(0) scale(0.7); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes ak-backInRight {
    0%   { opacity: 0; transform: translateX(220%) scale(0.7); }
    80%  { opacity: 0.7; transform: translateX(0) scale(0.7); }
    100% { opacity: 1; transform: scale(1); }
  }

  /* ── EXIT keyframes ───────────────────────────────────────────────────────── */

  @keyframes ak-fadeOut {
    from { opacity: 1; }
    to   { opacity: 0; }
  }
  @keyframes ak-fadeOutUp {
    from { opacity: 1; transform: translateY(0); }
    to   { opacity: 0; transform: translateY(-32px); }
  }
  @keyframes ak-fadeOutDown {
    from { opacity: 1; transform: translateY(0); }
    to   { opacity: 0; transform: translateY(32px); }
  }
  @keyframes ak-fadeOutLeft {
    from { opacity: 1; transform: translateX(0); }
    to   { opacity: 0; transform: translateX(-40px); }
  }
  @keyframes ak-fadeOutRight {
    from { opacity: 1; transform: translateX(0); }
    to   { opacity: 0; transform: translateX(40px); }
  }
  @keyframes ak-zoomOut {
    from { opacity: 1; transform: scale(1); }
    to   { opacity: 0; transform: scale(0.5); }
  }
  @keyframes ak-bounceOut {
    0%   { transform: scale(1); }
    25%  { transform: scale(0.95); }
    50%  { opacity: 1; transform: scale(1.1); }
    100% { opacity: 0; transform: scale(0.3); }
  }
  @keyframes ak-slideOutUp {
    from { transform: translateY(0); }
    to   { transform: translateY(-100%); }
  }
  @keyframes ak-slideOutDown {
    from { transform: translateY(0); }
    to   { transform: translateY(100%); }
  }
  @keyframes ak-slideOutLeft {
    from { transform: translateX(0); }
    to   { transform: translateX(-100%); }
  }
  @keyframes ak-slideOutRight {
    from { transform: translateX(0); }
    to   { transform: translateX(100%); }
  }

  /* ── ATTENTION keyframes ──────────────────────────────────────────────────── */

  @keyframes ak-pulse {
    0%, 100% { transform: scale(1); }
    50%       { transform: scale(1.07); }
  }
  @keyframes ak-bounce {
    0%, 20%, 53%, 80%, 100% { transform: translateY(0); }
    40%, 43%                 { transform: translateY(-22px); }
    70%                      { transform: translateY(-10px); }
    90%                      { transform: translateY(-4px); }
  }
  @keyframes ak-flash {
    0%, 50%, 100% { opacity: 1; }
    25%, 75%      { opacity: 0; }
  }
  @keyframes ak-shake {
    0%, 100%                { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
    20%, 40%, 60%, 80%      { transform: translateX(8px); }
  }
  @keyframes ak-shakeY {
    0%, 100%                { transform: translateY(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateY(-6px); }
    20%, 40%, 60%, 80%      { transform: translateY(6px); }
  }
  @keyframes ak-headShake {
    0%    { transform: translateX(0); }
    6.5%  { transform: translateX(-4px) rotateY(-9deg); }
    18.5% { transform: translateX(3px) rotateY(7deg); }
    31.5% { transform: translateX(-2px) rotateY(-5deg); }
    43.5% { transform: translateX(1px) rotateY(3deg); }
    50%   { transform: translateX(0); }
  }
  @keyframes ak-wobble {
    0%   { transform: translateX(0%); }
    15%  { transform: translateX(-20px) rotate(-5deg); }
    30%  { transform: translateX(15px) rotate(3deg); }
    45%  { transform: translateX(-12px) rotate(-3deg); }
    60%  { transform: translateX(8px) rotate(2deg); }
    75%  { transform: translateX(-5px) rotate(-1deg); }
    100% { transform: translateX(0%); }
  }
  @keyframes ak-rubberBand {
    0%   { transform: scaleX(1); }
    30%  { transform: scaleX(1.25) scaleY(0.75); }
    40%  { transform: scaleX(0.75) scaleY(1.25); }
    50%  { transform: scaleX(1.15) scaleY(0.85); }
    65%  { transform: scaleX(0.95) scaleY(1.05); }
    75%  { transform: scaleX(1.05) scaleY(0.95); }
    100% { transform: scale(1); }
  }
  @keyframes ak-jello {
    0%, 11.1%, 100% { transform: none; }
    22.2%  { transform: skewX(-12.5deg) skewY(-12.5deg); }
    33.3%  { transform: skewX(6.25deg) skewY(6.25deg); }
    44.4%  { transform: skewX(-3.125deg) skewY(-3.125deg); }
    55.5%  { transform: skewX(1.563deg) skewY(1.563deg); }
    66.6%  { transform: skewX(-0.781deg) skewY(-0.781deg); }
    77.7%  { transform: skewX(0.391deg) skewY(0.391deg); }
    88.8%  { transform: skewX(-0.195deg) skewY(-0.195deg); }
  }
  @keyframes ak-tada {
    0%             { transform: scaleX(1); }
    10%, 20%       { transform: scale3d(0.9, 0.9, 0.9) rotate(-3deg); }
    30%, 50%, 70%, 90% { transform: scale3d(1.1, 1.1, 1.1) rotate(3deg); }
    40%, 60%, 80%  { transform: scale3d(1.1, 1.1, 1.1) rotate(-3deg); }
    100%           { transform: scaleX(1); }
  }
  @keyframes ak-swing {
    20%  { transform: rotate(15deg); }
    40%  { transform: rotate(-10deg); }
    60%  { transform: rotate(5deg); }
    80%  { transform: rotate(-5deg); }
    100% { transform: rotate(0deg); }
  }
  @keyframes ak-heartbeat {
    0%  { transform: scale(1); }
    14% { transform: scale(1.3); }
    28% { transform: scale(1); }
    42% { transform: scale(1.3); }
    70% { transform: scale(1); }
  }
  @keyframes ak-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes ak-spinReverse {
    from { transform: rotate(0deg); }
    to   { transform: rotate(-360deg); }
  }
  @keyframes ak-ping {
    0%        { transform: scale(1); opacity: 1; }
    75%, 100% { transform: scale(2.2); opacity: 0; }
  }
  @keyframes ak-breathe {
    0%, 100% { transform: scale(1); opacity: 1; }
    50%       { transform: scale(1.04); opacity: 0.85; }
  }
  @keyframes ak-float {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-14px); }
  }
  @keyframes ak-glowPulse {
    0%, 100% { box-shadow: 0 0 4px currentColor; }
    50%       { box-shadow: 0 0 20px currentColor, 0 0 40px currentColor; }
  }
  @keyframes ak-sway {
    0%, 100% { transform: rotate(-4deg); }
    50%       { transform: rotate(4deg); }
  }
  @keyframes ak-vibrate {
    0%, 100% { transform: translate(0, 0); }
    20%       { transform: translate(-2px, 2px); }
    40%       { transform: translate(2px, -2px); }
    60%       { transform: translate(-2px, -2px); }
    80%       { transform: translate(2px, 2px); }
  }
  @keyframes ak-skew {
    0%, 100% { transform: skewX(0deg); }
    25%       { transform: skewX(5deg); }
    75%       { transform: skewX(-5deg); }
  }

  /* ── UTILITY keyframes ────────────────────────────────────────────────────── */

  @keyframes ak-blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0; }
  }
  @keyframes ak-ripple-expand {
    to { transform: scale(4); opacity: 0; }
  }
  @keyframes ak-skeleton {
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
  }
  @keyframes ak-shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes ak-wipeInLeft {
    from { clip-path: inset(0 100% 0 0); }
    to   { clip-path: inset(0 0% 0 0); }
  }
  @keyframes ak-wipeInRight {
    from { clip-path: inset(0 0 0 100%); }
    to   { clip-path: inset(0 0 0 0%); }
  }
  @keyframes ak-wipeInUp {
    from { clip-path: inset(100% 0 0 0); }
    to   { clip-path: inset(0% 0 0 0); }
  }
  @keyframes ak-wipeInDown {
    from { clip-path: inset(0 0 100% 0); }
    to   { clip-path: inset(0 0 0% 0); }
  }
  @keyframes ak-blurIn {
    from { opacity: 0; filter: blur(16px); transform: scale(1.04); }
    to   { opacity: 1; filter: blur(0px);  transform: scale(1); }
  }
  @keyframes ak-blurOut {
    from { opacity: 1; filter: blur(0px); }
    to   { opacity: 0; filter: blur(16px); transform: scale(1.04); }
  }
  @keyframes ak-dropIn {
    0%   { opacity: 0; transform: translateY(-60px) scaleY(0.8); }
    60%  { opacity: 1; transform: translateY(8px) scaleY(1.02); }
    100% { opacity: 1; transform: translateY(0) scaleY(1); }
  }
  @keyframes ak-expandHorizontal {
    from { transform: scaleX(0); opacity: 0; }
    to   { transform: scaleX(1); opacity: 1; }
  }
  @keyframes ak-expandVertical {
    from { transform: scaleY(0); opacity: 0; }
    to   { transform: scaleY(1); opacity: 1; }
  }

  `;

  /* ─── Inject CSS once into <head> ─────────────────────────────────────────── */
  var _stylesInjected = false;
  function _injectStyles() {
    if (_stylesInjected || typeof document === 'undefined') return;
    var s = document.createElement('style');
    s.id = 'animkit-css';
    s.textContent = _CSS;
    document.head.appendChild(s);
    _stylesInjected = true;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
   * SECTION 2 — CORE UTILITIES
   * ═══════════════════════════════════════════════════════════════════════════ */

  /** Resolve one element from selector string or DOM element */
  function _el(target) {
    if (!target) return null;
    if (typeof target === 'string') return document.querySelector(target);
    return target instanceof Element ? target : null;
  }

  /** Resolve all elements from selector, NodeList, or Array */
  function _els(target) {
    if (!target) return [];
    if (typeof target === 'string') return Array.from(document.querySelectorAll(target));
    if (target instanceof NodeList) return Array.from(target);
    if (Array.isArray(target)) return target;
    if (target instanceof Element) return [target];
    return [];
  }

  /** Shallow merge — opts overrides defaults */
  function _merge(defaults, opts) {
    return Object.assign({}, defaults, opts || {});
  }

  /**
   * Core animation driver — applies a CSS @keyframe animation inline.
   * Returns a Promise that resolves when the animation finishes (or immediately
   * for infinite loops so chaining still works).
   *
   * @param {Element|string} el  - target element
   * @param {string}  name       - keyframe name (e.g. 'ak-fadeInUp')
   * @param {object}  opts
   *   duration    {number}  ms, default 600
   *   delay       {number}  ms, default 0
   *   easing      {string}  CSS easing, default 'ease'
   *   iterations  {number|Infinity}  default 1
   */
  function _cssAnim(el, name, opts) {
    _injectStyles();
    el = _el(el);
    if (!el) return Promise.resolve();
    opts = _merge({ duration: 600, delay: 0, easing: 'ease', iterations: 1 }, opts);

    /* Reset any existing animation first so re-triggering works */
    el.style.animation = 'none';
    void el.offsetWidth; /* force reflow */

    el.style.animationName           = name;
    el.style.animationDuration       = opts.duration + 'ms';
    el.style.animationDelay          = opts.delay + 'ms';
    el.style.animationTimingFunction  = opts.easing;
    el.style.animationFillMode       = 'both';
    el.style.animationIterationCount =
      opts.iterations === Infinity ? 'infinite' : String(opts.iterations);

    /* Infinite loops: resolve immediately so timeline chaining isn't blocked */
    if (opts.iterations === Infinity) return Promise.resolve(el);

    return new Promise(function (resolve) {
      function onEnd(e) {
        if (e.animationName !== name) return;
        el.removeEventListener('animationend', onEnd);
        resolve(el);
      }
      el.addEventListener('animationend', onEnd);
    });
  }

  /* Preset easing strings for convenience */
  var easings = {
    linear:   'linear',
    ease:     'ease',
    easeIn:   'ease-in',
    easeOut:  'ease-out',
    easeInOut:'ease-in-out',
    spring:   'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    bounce:   'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    snappy:   'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    smooth:   'cubic-bezier(0.4, 0, 0.2, 1)',
    sharp:    'cubic-bezier(0.4, 0, 0.6, 1)',
    expo:     'cubic-bezier(0.19, 1, 0.22, 1)',
  };

  /* ═══════════════════════════════════════════════════════════════════════════
   * SECTION 3 — ENTRANCE ANIMATIONS
   * All return a Promise that resolves when the animation completes.
   *
   * Common options: { duration, delay, easing }
   * ═══════════════════════════════════════════════════════════════════════════ */

  function fadeIn(el, opts)        { return _cssAnim(el, 'ak-fadeIn', opts); }
  function fadeInUp(el, opts)      { return _cssAnim(el, 'ak-fadeInUp', opts); }
  function fadeInDown(el, opts)    { return _cssAnim(el, 'ak-fadeInDown', opts); }
  function fadeInLeft(el, opts)    { return _cssAnim(el, 'ak-fadeInLeft', opts); }
  function fadeInRight(el, opts)   { return _cssAnim(el, 'ak-fadeInRight', opts); }
  function zoomIn(el, opts)        { return _cssAnim(el, 'ak-zoomIn', opts); }
  function zoomInUp(el, opts)      { return _cssAnim(el, 'ak-zoomInUp', opts); }
  function zoomInDown(el, opts)    { return _cssAnim(el, 'ak-zoomInDown', opts); }
  function bounceIn(el, opts)      { return _cssAnim(el, 'ak-bounceIn', opts); }
  function bounceInUp(el, opts)    { return _cssAnim(el, 'ak-bounceInUp', opts); }
  function bounceInDown(el, opts)  { return _cssAnim(el, 'ak-bounceInDown', opts); }
  function bounceInLeft(el, opts)  { return _cssAnim(el, 'ak-bounceInLeft', opts); }
  function bounceInRight(el, opts) { return _cssAnim(el, 'ak-bounceInRight', opts); }
  function flipInX(el, opts)       { return _cssAnim(el, 'ak-flipInX', opts); }
  function flipInY(el, opts)       { return _cssAnim(el, 'ak-flipInY', opts); }
  function rotateIn(el, opts)      { return _cssAnim(el, 'ak-rotateIn', opts); }
  function rollIn(el, opts)        { return _cssAnim(el, 'ak-rollIn', opts); }
  function slideInUp(el, opts)     { return _cssAnim(el, 'ak-slideInUp', opts); }
  function slideInDown(el, opts)   { return _cssAnim(el, 'ak-slideInDown', opts); }
  function slideInLeft(el, opts)   { return _cssAnim(el, 'ak-slideInLeft', opts); }
  function slideInRight(el, opts)  { return _cssAnim(el, 'ak-slideInRight', opts); }
  function backInDown(el, opts)    { return _cssAnim(el, 'ak-backInDown', opts); }
  function backInUp(el, opts)      { return _cssAnim(el, 'ak-backInUp', opts); }
  function backInLeft(el, opts)    { return _cssAnim(el, 'ak-backInLeft', opts); }
  function backInRight(el, opts)   { return _cssAnim(el, 'ak-backInRight', opts); }
  function blurIn(el, opts)        { return _cssAnim(el, 'ak-blurIn', opts); }
  function dropIn(el, opts)        { return _cssAnim(el, 'ak-dropIn', opts); }
  function wipeInLeft(el, opts)    { return _cssAnim(el, 'ak-wipeInLeft', opts); }
  function wipeInRight(el, opts)   { return _cssAnim(el, 'ak-wipeInRight', opts); }
  function wipeInUp(el, opts)      { return _cssAnim(el, 'ak-wipeInUp', opts); }
  function wipeInDown(el, opts)    { return _cssAnim(el, 'ak-wipeInDown', opts); }
  function expandH(el, opts)       { return _cssAnim(el, 'ak-expandHorizontal', _merge({ easing: easings.spring }, opts)); }
  function expandV(el, opts)       { return _cssAnim(el, 'ak-expandVertical', _merge({ easing: easings.spring }, opts)); }

  /* ═══════════════════════════════════════════════════════════════════════════
   * SECTION 4 — EXIT ANIMATIONS
   * ═══════════════════════════════════════════════════════════════════════════ */

  function fadeOut(el, opts)       { return _cssAnim(el, 'ak-fadeOut', opts); }
  function fadeOutUp(el, opts)     { return _cssAnim(el, 'ak-fadeOutUp', opts); }
  function fadeOutDown(el, opts)   { return _cssAnim(el, 'ak-fadeOutDown', opts); }
  function fadeOutLeft(el, opts)   { return _cssAnim(el, 'ak-fadeOutLeft', opts); }
  function fadeOutRight(el, opts)  { return _cssAnim(el, 'ak-fadeOutRight', opts); }
  function zoomOut(el, opts)       { return _cssAnim(el, 'ak-zoomOut', opts); }
  function bounceOut(el, opts)     { return _cssAnim(el, 'ak-bounceOut', opts); }
  function slideOutUp(el, opts)    { return _cssAnim(el, 'ak-slideOutUp', opts); }
  function slideOutDown(el, opts)  { return _cssAnim(el, 'ak-slideOutDown', opts); }
  function slideOutLeft(el, opts)  { return _cssAnim(el, 'ak-slideOutLeft', opts); }
  function slideOutRight(el, opts) { return _cssAnim(el, 'ak-slideOutRight', opts); }
  function blurOut(el, opts)       { return _cssAnim(el, 'ak-blurOut', opts); }

  /* ═══════════════════════════════════════════════════════════════════════════
   * SECTION 5 — ATTENTION SEEKERS
   * These loop by default (iterations: 1). Pass { iterations: Infinity } to loop.
   * ═══════════════════════════════════════════════════════════════════════════ */

  function pulse(el, opts)      { return _cssAnim(el, 'ak-pulse',      _merge({ duration: 800 }, opts)); }
  function bounce(el, opts)     { return _cssAnim(el, 'ak-bounce',     _merge({ duration: 900 }, opts)); }
  function flash(el, opts)      { return _cssAnim(el, 'ak-flash',      _merge({ duration: 800 }, opts)); }
  function shake(el, opts)      { return _cssAnim(el, 'ak-shake',      _merge({ duration: 700 }, opts)); }
  function shakeY(el, opts)     { return _cssAnim(el, 'ak-shakeY',     _merge({ duration: 700 }, opts)); }
  function headShake(el, opts)  { return _cssAnim(el, 'ak-headShake',  _merge({ duration: 1000 }, opts)); }
  function wobble(el, opts)     { return _cssAnim(el, 'ak-wobble',     _merge({ duration: 900 }, opts)); }
  function rubberBand(el, opts) { return _cssAnim(el, 'ak-rubberBand', _merge({ duration: 800 }, opts)); }
  function jello(el, opts)      { return _cssAnim(el, 'ak-jello',      _merge({ duration: 900 }, opts)); }
  function tada(el, opts)       { return _cssAnim(el, 'ak-tada',       _merge({ duration: 900 }, opts)); }
  function swing(el, opts)      { return _cssAnim(el, 'ak-swing',      _merge({ duration: 800 }, opts)); }
  function heartbeat(el, opts)  { return _cssAnim(el, 'ak-heartbeat',  _merge({ duration: 1000 }, opts)); }
  function spin(el, opts)       { return _cssAnim(el, 'ak-spin',       _merge({ duration: 800, easing: 'linear' }, opts)); }
  function spinReverse(el, opts){ return _cssAnim(el, 'ak-spinReverse',_merge({ duration: 800, easing: 'linear' }, opts)); }
  function ping(el, opts)       { return _cssAnim(el, 'ak-ping',       _merge({ duration: 900 }, opts)); }
  function breathe(el, opts)    { return _cssAnim(el, 'ak-breathe',    _merge({ duration: 2500, iterations: Infinity, easing: 'ease-in-out' }, opts)); }
  function float(el, opts)      { return _cssAnim(el, 'ak-float',      _merge({ duration: 3000, iterations: Infinity, easing: 'ease-in-out' }, opts)); }
  function glowPulse(el, opts)  { return _cssAnim(el, 'ak-glowPulse',  _merge({ duration: 1500, iterations: Infinity }, opts)); }
  function sway(el, opts)       { return _cssAnim(el, 'ak-sway',       _merge({ duration: 2000, iterations: Infinity, easing: 'ease-in-out' }, opts)); }
  function vibrate(el, opts)    { return _cssAnim(el, 'ak-vibrate',    _merge({ duration: 300 }, opts)); }
  function skewAnim(el, opts)   { return _cssAnim(el, 'ak-skew',       _merge({ duration: 600 }, opts)); }

  /* ═══════════════════════════════════════════════════════════════════════════
   * SECTION 6 — SCROLL REVEAL
   * Uses IntersectionObserver to trigger animations when elements enter viewport.
   *
   * @param {string|NodeList} selector
   * @param {object} opts
   *   animation     {string}   AnimKit animation name (without 'ak-'), e.g. 'fadeInUp'
   *   duration      {number}   ms (default 600)
   *   delay         {number}   base delay ms (default 0)
   *   staggerDelay  {number}   extra ms per element index (default 0)
   *   threshold     {number}   0–1 fraction visible to trigger (default 0.15)
   *   once          {boolean}  animate only on first enter (default true)
   *   rootMargin    {string}   IntersectionObserver rootMargin (default '0px')
   * @returns IntersectionObserver instance (call .disconnect() to stop)
   * ═══════════════════════════════════════════════════════════════════════════ */

  function scrollReveal(selector, opts) {
    _injectStyles();
    opts = _merge({
      animation:    'fadeInUp',
      duration:     600,
      delay:        0,
      staggerDelay: 0,
      easing:       'ease',
      threshold:    0.15,
      once:         true,
      rootMargin:   '0px',
    }, opts);

    var elements = _els(selector);
    elements.forEach(function (el) {
      el.style.opacity = '0';
      el.style.willChange = 'transform, opacity';
    });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el  = entry.target;
        var idx = elements.indexOf(el);
        _cssAnim(el, 'ak-' + opts.animation, {
          duration:   opts.duration,
          delay:      opts.delay + idx * opts.staggerDelay,
          easing:     opts.easing,
        });
        if (opts.once) observer.unobserve(el);
      });
    }, { threshold: opts.threshold, rootMargin: opts.rootMargin });

    elements.forEach(function (el) { observer.observe(el); });
    return observer;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
   * SECTION 7 — TEXT EFFECTS
   * ═══════════════════════════════════════════════════════════════════════════ */

  /**
   * typewriter — types text character by character into an element.
   * @param {Element|string} el
   * @param {string} text   - text to type
   * @param {object} opts
   *   speed       {number}  ms per character (default 50)
   *   delay       {number}  initial delay ms (default 0)
   *   cursor      {boolean} show blinking cursor (default true)
   *   onType      {fn}      called after each character
   * @returns Promise resolves when typing is done
   */
  function typewriter(el, text, opts) {
    el = _el(el); if (!el) return Promise.resolve();
    _injectStyles();
    opts = _merge({ speed: 50, delay: 0, cursor: true }, opts);
    if (opts.cursor) el.classList.add('ak-cursor');
    el.textContent = '';

    return new Promise(function (resolve) {
      var i = 0;
      setTimeout(function () {
        var t = setInterval(function () {
          if (i < text.length) {
            el.textContent += text[i++];
            if (typeof opts.onType === 'function') opts.onType(el.textContent);
          } else {
            clearInterval(t);
            if (!opts.keepCursor) el.classList.remove('ak-cursor');
            resolve(el);
          }
        }, opts.speed);
      }, opts.delay);
    });
  }

  /**
   * morphText — cycles through an array of strings with typing + delete effect.
   * @param {Element|string} el
   * @param {string[]} texts
   * @param {object} opts
   *   speed       {number}  type speed ms (default 60)
   *   deleteSpeed {number}  delete speed ms (default 35)
   *   pause       {number}  pause at end of word ms (default 1800)
   */
  function morphText(el, texts, opts) {
    el = _el(el); if (!el || !texts || !texts.length) return;
    _injectStyles();
    opts = _merge({ speed: 60, deleteSpeed: 35, pause: 1800 }, opts);
    el.classList.add('ak-cursor');

    var textIdx = 0, charIdx = 0, isDeleting = false;
    function tick() {
      var current = texts[textIdx];
      if (isDeleting) {
        el.textContent = current.substring(0, --charIdx);
      } else {
        el.textContent = current.substring(0, ++charIdx);
      }
      var wait = isDeleting ? opts.deleteSpeed : opts.speed;
      if (!isDeleting && charIdx === current.length) {
        wait = opts.pause; isDeleting = true;
      } else if (isDeleting && charIdx === 0) {
        isDeleting = false;
        textIdx = (textIdx + 1) % texts.length;
        wait = 300;
      }
      setTimeout(tick, wait);
    }
    setTimeout(tick, opts.delay || 0);
  }

  /**
   * splitText — splits element text into individual spans and animates each.
   * @param {Element|string} el
   * @param {object} opts
   *   type         {string}  'letters' | 'words' (default 'letters')
   *   animation    {string}  AnimKit animation name (default 'fadeInUp')
   *   duration     {number}  ms (default 400)
   *   staggerDelay {number}  ms between each unit (default 40)
   *   baseDelay    {number}  initial delay ms (default 0)
   */
  function splitText(el, opts) {
    el = _el(el); if (!el) return;
    _injectStyles();
    opts = _merge({
      type: 'letters', animation: 'fadeInUp',
      duration: 400, staggerDelay: 40, baseDelay: 0, easing: 'ease',
    }, opts);

    var text  = el.textContent;
    var units = opts.type === 'words' ? text.split(' ') : text.split('');
    el.innerHTML = '';
    el.style.opacity = '1';

    units.forEach(function (unit, i) {
      var span = document.createElement('span');
      span.textContent = (unit === ' ') ? '\u00A0' : unit;
      span.style.cssText = 'display:inline-block;opacity:0;';
      el.appendChild(span);
      if (opts.type === 'words' && i < units.length - 1) {
        el.appendChild(document.createTextNode('\u00A0'));
      }
      setTimeout(function () {
        _cssAnim(span, 'ak-' + opts.animation, { duration: opts.duration, easing: opts.easing });
      }, opts.baseDelay + i * opts.staggerDelay);
    });
  }

  /**
   * glitch — applies a random character glitch effect that resolves to text.
   * @param {Element|string} el
   * @param {object} opts
   *   duration  {number}  total duration ms (default 900)
   *   chars     {string}  character pool for glitch
   *   repeat    {boolean} loop effect (default false)
   *   pause     {number}  ms between loops (default 2000)
   */
  function glitch(el, opts) {
    el = _el(el); if (!el) return;
    opts = _merge({
      duration: 900,
      chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*<>/?',
      repeat: false, pause: 2000,
    }, opts);
    var original = el.textContent;
    var frame = 0;
    var totalFrames = Math.round(opts.duration / 16);

    function run() {
      var progress = frame / totalFrames;
      el.textContent = original.split('').map(function (ch, i) {
        if (ch === ' ') return ' ';
        if (i < progress * original.length) return ch;
        return opts.chars[Math.floor(Math.random() * opts.chars.length)];
      }).join('');
      frame++;
      if (frame <= totalFrames) {
        requestAnimationFrame(run);
      } else {
        el.textContent = original;
        if (opts.repeat) setTimeout(function () { frame = 0; run(); }, opts.pause);
      }
    }
    requestAnimationFrame(run);
  }

  /**
   * scramble — hacker-style text that resolves from random chars into final string.
   * @param {Element|string} el
   * @param {object} opts
   *   text   {string}   target text (default: el.textContent)
   *   speed  {number}   interval ms (default 40)
   * @returns Promise
   */
  function scramble(el, opts) {
    el = _el(el); if (!el) return Promise.resolve();
    opts = _merge({ text: el.textContent, speed: 40 }, opts);
    var chars  = '!<>-_\\/[]{}—=+*^?#ABCDEF0123456789';
    var target = opts.text;
    var len    = target.length;

    return new Promise(function (resolve) {
      var iteration = 0;
      var t = setInterval(function () {
        el.textContent = target.split('').map(function (ch, i) {
          if (ch === ' ') return ' ';
          if (i < iteration) return ch;
          return chars[Math.floor(Math.random() * chars.length)];
        }).join('');
        if (iteration >= len) { clearInterval(t); resolve(el); }
        iteration += 1 / 3;
      }, opts.speed);
    });
  }

  /**
   * countUp — animates a number from `from` to `to` with easing.
   * @param {Element|string} el
   * @param {object} opts
   *   from      {number}  start value (default 0)
   *   to        {number}  end value (default: el.textContent)
   *   duration  {number}  ms (default 1500)
   *   delay     {number}  ms (default 0)
   *   prefix    {string}  e.g. '$'
   *   suffix    {string}  e.g. '%'
   *   decimals  {number}  decimal places (default 0)
   *   separator {string}  thousands separator (default ',')
   *   easing    {string}  'easeOut' | 'easeInOut' | 'linear'
   * @returns Promise
   */
  function countUp(el, opts) {
    el = _el(el); if (!el) return Promise.resolve();
    opts = _merge({
      from: 0, to: parseFloat(el.textContent) || 100,
      duration: 1500, delay: 0,
      prefix: '', suffix: '', decimals: 0, separator: ',', easing: 'easeOut',
    }, opts);

    var easeFn = {
      linear:   function (t) { return t; },
      easeOut:  function (t) { return t * (2 - t); },
      easeInOut:function (t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; },
      spring:   function (t) { return 1 - Math.pow(1-t, 3); },
    }[opts.easing] || function (t) { return t * (2 - t); };

    return new Promise(function (resolve) {
      setTimeout(function () {
        var start = null;
        var range = opts.to - opts.from;
        function step(ts) {
          if (!start) start = ts;
          var elapsed  = ts - start;
          var progress = Math.min(elapsed / opts.duration, 1);
          var value    = opts.from + range * easeFn(progress);
          var formatted = value.toFixed(opts.decimals)
            .replace(/\B(?=(\d{3})+(?!\d))/g, opts.separator);
          el.textContent = opts.prefix + formatted + opts.suffix;
          if (progress < 1) requestAnimationFrame(step);
          else resolve(el);
        }
        requestAnimationFrame(step);
      }, opts.delay);
    });
  }

  /**
   * wavyText — each letter oscillates like a sine wave continuously.
   * @param {Element|string} el
   * @param {object} opts
   *   amplitude  {number}  px height (default 8)
   *   frequency  {number}  wave density (default 0.5)
   *   speed      {number}  animation speed (default 2)
   *   color      {boolean} also cycle hue (default false)
   * @returns {function} call it to stop the animation
   */
  function wavyText(el, opts) {
    el = _el(el); if (!el) return function () {};
    opts = _merge({ amplitude: 8, frequency: 0.5, speed: 2, color: false }, opts);

    var text  = el.textContent;
    el.innerHTML = text.split('').map(function (ch) {
      return '<span style="display:inline-block">' + (ch === ' ' ? '&nbsp;' : ch) + '</span>';
    }).join('');
    var spans = el.querySelectorAll('span');
    var animId;

    function loop() {
      var t = performance.now() / 1000 * opts.speed;
      spans.forEach(function (span, i) {
        var y = Math.sin(t + i * opts.frequency) * opts.amplitude;
        span.style.transform = 'translateY(' + y + 'px)';
        if (opts.color) {
          span.style.color = 'hsl(' + ((t * 60 + i * 30) % 360) + ',70%,55%)';
        }
      });
      animId = requestAnimationFrame(loop);
    }
    loop();
    return function () { cancelAnimationFrame(animId); };
  }

  /* ═══════════════════════════════════════════════════════════════════════════
   * SECTION 8 — INTERACTION EFFECTS
   * ═══════════════════════════════════════════════════════════════════════════ */

  /**
   * ripple — adds a Material-Design click ripple to elements.
   * @param {string|NodeList} selector
   * @param {object} opts
   *   color     {string}  ripple color (default 'rgba(255,255,255,0.35)')
   *   duration  {number}  ms (default 650)
   */
  function ripple(selector, opts) {
    _injectStyles();
    opts = _merge({ color: 'rgba(255,255,255,0.35)', duration: 650 }, opts);
    _els(selector).forEach(function (el) {
      el.classList.add('ak-ripple-host');
      el.addEventListener('click', function (e) {
        var rect = el.getBoundingClientRect();
        var size = Math.max(rect.width, rect.height) * 2;
        var wave = document.createElement('span');
        wave.className = 'ak-ripple-wave';
        wave.style.cssText = [
          'width:' + size + 'px', 'height:' + size + 'px',
          'left:' + (e.clientX - rect.left - size / 2) + 'px',
          'top:' + (e.clientY - rect.top - size / 2) + 'px',
          'background:' + opts.color,
          'animation-duration:' + opts.duration + 'ms',
        ].join(';');
        el.appendChild(wave);
        setTimeout(function () { wave.remove(); }, opts.duration + 100);
      });
    });
  }

  /**
   * tilt3D — 3-D perspective tilt that follows mouse cursor.
   * @param {string|NodeList} selector
   * @param {object} opts
   *   maxTilt      {number}   max tilt degrees (default 15)
   *   perspective  {number}   CSS perspective px (default 800)
   *   scale        {number}   scale on hover (default 1.04)
   *   speed        {number}   transition ms (default 300)
   *   glare        {boolean}  light glare overlay (default true)
   *   glareOpacity {number}   0–1 (default 0.2)
   */
  function tilt3D(selector, opts) {
    opts = _merge({
      maxTilt: 15, perspective: 800, scale: 1.04,
      speed: 300, glare: true, glareOpacity: 0.2,
    }, opts);

    _els(selector).forEach(function (el) {
      el.style.transition = 'transform ' + opts.speed + 'ms ease, box-shadow ' + opts.speed + 'ms ease';
      el.style.transformStyle = 'preserve-3d';
      el.style.willChange = 'transform';

      var glareEl = null;
      if (opts.glare) {
        if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
        glareEl = document.createElement('div');
        glareEl.style.cssText = [
          'position:absolute', 'inset:0', 'border-radius:inherit', 'pointer-events:none',
          'opacity:0', 'transition:opacity ' + opts.speed + 'ms',
          'background:linear-gradient(135deg,rgba(255,255,255,0) 0%,rgba(255,255,255,' + opts.glareOpacity + ') 100%)',
          'transform:translateZ(1px)',
        ].join(';');
        el.appendChild(glareEl);
      }

      el.addEventListener('mousemove', function (e) {
        var rect = el.getBoundingClientRect();
        var rx = ((e.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * -opts.maxTilt;
        var ry = ((e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * opts.maxTilt;
        el.style.transform = 'perspective(' + opts.perspective + 'px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) scale(' + opts.scale + ')';
        if (glareEl) glareEl.style.opacity = '1';
      });
      el.addEventListener('mouseleave', function () {
        el.style.transform = 'perspective(' + opts.perspective + 'px) rotateX(0) rotateY(0) scale(1)';
        if (glareEl) glareEl.style.opacity = '0';
      });
    });
  }

  /**
   * magnetic — element subtly follows cursor when hovering (magnetic feel).
   * @param {string|NodeList} selector
   * @param {object} opts
   *   strength  {number}  0–1 pull strength (default 0.4)
   *   speed     {number}  return transition ms (default 350)
   */
  function magnetic(selector, opts) {
    opts = _merge({ strength: 0.4, speed: 350 }, opts);
    _els(selector).forEach(function (el) {
      el.style.transition = 'transform ' + opts.speed + 'ms cubic-bezier(0.23,1,0.32,1)';
      el.style.willChange = 'transform';
      if (getComputedStyle(el).display === 'inline') el.style.display = 'inline-block';

      el.addEventListener('mousemove', function (e) {
        var rect = el.getBoundingClientRect();
        var dx = (e.clientX - rect.left - rect.width / 2) * opts.strength;
        var dy = (e.clientY - rect.top - rect.height / 2) * opts.strength;
        el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      });
      el.addEventListener('mouseleave', function () {
        el.style.transform = 'translate(0,0)';
      });
    });
  }

  /**
   * hoverLift — card lifts and casts shadow on hover (common for cards/buttons).
   * @param {string|NodeList} selector
   * @param {object} opts
   *   y       {number}  px to lift (default -8, negative = up)
   *   shadow  {string}  box-shadow on hover
   *   speed   {number}  transition ms (default 250)
   */
  function hoverLift(selector, opts) {
    opts = _merge({
      y: -8, speed: 250,
      shadow: '0 14px 40px rgba(0,0,0,0.18)',
    }, opts);
    _els(selector).forEach(function (el) {
      el.style.transition = 'transform ' + opts.speed + 'ms ease, box-shadow ' + opts.speed + 'ms ease';
      el.addEventListener('mouseenter', function () {
        el.style.transform = 'translateY(' + opts.y + 'px)';
        el.style.boxShadow = opts.shadow;
      });
      el.addEventListener('mouseleave', function () {
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = '';
      });
    });
  }

  /**
   * cursorTrail — creates a soft trail of dots that follow the cursor.
   * @param {object} opts
   *   size    {number}  dot size px (default 10)
   *   color   {string}  dot color (default '#5b6ef5')
   *   count   {number}  number of trail dots (default 8)
   *   blur    {boolean} apply blur to dots (default false)
   * @returns {function} call to remove trail and stop
   */
  function cursorTrail(opts) {
    opts = _merge({ size: 10, color: '#5b6ef5', count: 8, blur: false }, opts);
    var positions = Array.from({ length: opts.count }, function () { return { x: -200, y: -200 }; });
    var mouseX = -200, mouseY = -200;

    var dots = Array.from({ length: opts.count }, function (_, i) {
      var scale   = 1 - i * (0.65 / opts.count);
      var opacity = 1 - i * (0.75 / opts.count);
      var d = document.createElement('div');
      d.style.cssText = [
        'position:fixed', 'pointer-events:none', 'z-index:99999', 'border-radius:50%',
        'width:' + (opts.size * scale) + 'px',
        'height:' + (opts.size * scale) + 'px',
        'background:' + opts.color,
        'opacity:' + opacity,
        'transform:translate(-50%,-50%)',
        opts.blur ? 'filter:blur(2px)' : '',
      ].join(';');
      document.body.appendChild(d);
      return d;
    });

    document.addEventListener('mousemove', function (e) {
      mouseX = e.clientX; mouseY = e.clientY;
    });

    var animId;
    (function loop() {
      positions[0] = { x: mouseX, y: mouseY };
      for (var i = 1; i < opts.count; i++) {
        positions[i] = {
          x: positions[i].x + (positions[i-1].x - positions[i].x) * 0.35,
          y: positions[i].y + (positions[i-1].y - positions[i].y) * 0.35,
        };
      }
      dots.forEach(function (d, i) {
        d.style.left = positions[i].x + 'px';
        d.style.top  = positions[i].y + 'px';
      });
      animId = requestAnimationFrame(loop);
    })();

    return function () {
      cancelAnimationFrame(animId);
      dots.forEach(function (d) { d.remove(); });
    };
  }

  /* ═══════════════════════════════════════════════════════════════════════════
   * SECTION 9 — PARALLAX
   * Moves elements at a different scroll speed to create depth.
   *
   * @param {string|NodeList} selector
   * @param {object} opts
   *   speed      {number}  0 = fixed, 0.5 = half speed, 1 = scroll with page
   *   direction  {string}  'y' | 'x' (default 'y')
   *   clamp      {boolean} limit movement to element height (default false)
   * ═══════════════════════════════════════════════════════════════════════════ */

  function parallax(selector, opts) {
    opts = _merge({ speed: 0.5, direction: 'y', clamp: false }, opts);
    _els(selector).forEach(function (el) {
      el.style.willChange = 'transform';
      function update() {
        var rect    = el.getBoundingClientRect();
        var centerY = window.innerHeight / 2;
        var offset  = (rect.top + rect.height / 2 - centerY) * (1 - opts.speed);
        if (opts.direction === 'x') {
          el.style.transform = 'translateX(' + offset + 'px)';
        } else {
          el.style.transform = 'translateY(' + offset + 'px)';
        }
      }
      window.addEventListener('scroll', update, { passive: true });
      update();
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════════
   * SECTION 10 — STAGGER
   * Animates a list of elements sequentially with configurable delay between each.
   *
   * @param {string|NodeList} selector
   * @param {string} animation   AnimKit animation name (e.g. 'fadeInUp')
   * @param {object} opts
   *   duration      {number}  ms per element (default 500)
   *   staggerDelay  {number}  ms between each element (default 80)
   *   delay         {number}  initial delay ms (default 0)
   *   direction     {string}  'normal'|'reverse'|'random' (default 'normal')
   * @returns Promise — resolves when all animations complete
   * ═══════════════════════════════════════════════════════════════════════════ */

  function stagger(selector, animation, opts) {
    _injectStyles();
    opts = _merge({
      duration: 500, staggerDelay: 80, delay: 0, easing: 'ease', direction: 'normal',
    }, opts);

    var elements = _els(selector);
    if (opts.direction === 'reverse') elements = elements.slice().reverse();
    else if (opts.direction === 'random') elements = elements.slice().sort(function () { return Math.random() - 0.5; });

    elements.forEach(function (el) { el.style.opacity = '0'; });

    var promises = elements.map(function (el, i) {
      return _cssAnim(el, 'ak-' + animation, {
        duration: opts.duration,
        delay:    opts.delay + i * opts.staggerDelay,
        easing:   opts.easing,
      });
    });
    return Promise.all(promises);
  }

  /* ═══════════════════════════════════════════════════════════════════════════
   * SECTION 11 — LOADERS
   * ═══════════════════════════════════════════════════════════════════════════ */

  /**
   * skeleton — replaces element content with a shimmer placeholder.
   * @param {string|NodeList} selector
   * @returns { remove() } call remove() to restore original content
   */
  function skeleton(selector) {
    _injectStyles();
    var elements = _els(selector);
    elements.forEach(function (el) {
      el._akHTML  = el.innerHTML;
      el._akStyle = el.getAttribute('style') || '';
      el.classList.add('ak-skeleton-box');
      el.style.minHeight = el.style.minHeight || el.offsetHeight + 'px';
    });
    return {
      remove: function () {
        elements.forEach(function (el) {
          el.classList.remove('ak-skeleton-box');
          el.innerHTML = el._akHTML || '';
          el.setAttribute('style', el._akStyle);
        });
      }
    };
  }

  /**
   * progressBar — animates a bar from `from`% to `to`% inside an element.
   * @param {Element|string} el   container element
   * @param {object} opts
   *   from      {number}  start % (default 0)
   *   to        {number}  end % (default 100)
   *   duration  {number}  ms (default 1000)
   *   color     {string}  bar color (default '#5b6ef5')
   *   height    {string}  bar height (default '4px')
   *   radius    {string}  border-radius (default '2px')
   *   striped   {boolean} animated diagonal stripes (default false)
   * @returns Promise
   */
  function progressBar(el, opts) {
    el = _el(el); if (!el) return Promise.resolve();
    opts = _merge({
      from: 0, to: 100, duration: 1000,
      color: '#5b6ef5', height: '4px', radius: '2px', striped: false,
    }, opts);

    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.style.overflow = 'hidden';

    var bar = document.createElement('div');
    var bg  = opts.striped
      ? 'repeating-linear-gradient(45deg,' + opts.color + ' 0,' + opts.color + ' 10px,rgba(255,255,255,0.15) 10px,rgba(255,255,255,0.15) 20px)'
      : opts.color;

    bar.style.cssText = [
      'position:absolute', 'top:0', 'left:0',
      'height:' + opts.height, 'border-radius:' + opts.radius,
      'background:' + bg,
      'width:' + opts.from + '%',
      'transition:width ' + opts.duration + 'ms ease',
      opts.striped ? 'background-size:40px 40px;animation:ak-shimmer 1s linear infinite' : '',
    ].join(';');
    el.appendChild(bar);

    return new Promise(function (resolve) {
      requestAnimationFrame(function () {
        bar.style.width = opts.to + '%';
        setTimeout(resolve, opts.duration);
      });
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════════
   * SECTION 12 — PAGE TRANSITION
   * Fade/overlay transition between page navigations.
   *
   * Usage:
   *   var t = AnimKit.pageTransition({ color: '#000' });
   *   t.out().then(function() { window.location = '/new-page'; });
   *   // on new page: AnimKit.pageTransition().in();
   * ═══════════════════════════════════════════════════════════════════════════ */

  function pageTransition(opts) {
    opts = _merge({ color: '#000000', duration: 400 }, opts);
    var overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'background:' + opts.color,
      'z-index:99999', 'pointer-events:none', 'opacity:0',
      'transition:opacity ' + opts.duration + 'ms ease',
    ].join(';');
    document.body.appendChild(overlay);

    return {
      /** Fade to black (call before navigating) */
      out: function () {
        return new Promise(function (r) {
          overlay.style.opacity = '1';
          setTimeout(r, opts.duration);
        });
      },
      /** Fade back in (call on new page load) */
      in: function () {
        return new Promise(function (r) {
          overlay.style.opacity = '0';
          setTimeout(function () { overlay.remove(); r(); }, opts.duration);
        });
      },
    };
  }

  /* ═══════════════════════════════════════════════════════════════════════════
   * SECTION 13 — TIMELINE
   * Chain animations, waits, and callbacks into a sequential pipeline.
   *
   * Usage:
   *   AnimKit.timeline()
   *     .animate('#logo', 'fadeInDown', { duration: 600 })
   *     .wait(200)
   *     .animate('#nav',  'fadeInDown', { duration: 400 })
   *     .call(function() { console.log('done!') })
   *     .run();
   * ═══════════════════════════════════════════════════════════════════════════ */

  function timeline() {
    var steps = [];
    var api = {
      animate: function (el, anim, opts) {
        steps.push({ type: 'anim', el: el, anim: anim, opts: opts });
        return api;
      },
      wait: function (ms) {
        steps.push({ type: 'wait', ms: ms });
        return api;
      },
      call: function (fn) {
        steps.push({ type: 'call', fn: fn });
        return api;
      },
      parallel: function (fns) {
        /* Run multiple animations simultaneously, then continue */
        steps.push({ type: 'parallel', fns: fns });
        return api;
      },
      run: function () {
        return steps.reduce(function (promise, step) {
          return promise.then(function () {
            if (step.type === 'wait') {
              return new Promise(function (r) { setTimeout(r, step.ms); });
            }
            if (step.type === 'call') {
              return Promise.resolve(step.fn());
            }
            if (step.type === 'anim') {
              return _cssAnim(_el(step.el), 'ak-' + step.anim, step.opts);
            }
            if (step.type === 'parallel') {
              return Promise.all(step.fns.map(function (fn) { return fn(); }));
            }
          });
        }, Promise.resolve());
      },
    };
    return api;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
   * SECTION 14 — UTILITIES
   * ═══════════════════════════════════════════════════════════════════════════ */

  /** Stop all CSS animations on an element */
  function stop(el) {
    el = _el(el); if (el) el.style.animation = 'none';
  }

  /** Pause a running animation */
  function pause(el) {
    el = _el(el); if (el) el.style.animationPlayState = 'paused';
  }

  /** Resume a paused animation */
  function resume(el) {
    el = _el(el); if (el) el.style.animationPlayState = 'running';
  }

  /** Wait ms milliseconds (returns Promise — useful in async flows) */
  function wait(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  /**
   * safe — respects `prefers-reduced-motion` accessibility setting.
   * Skips animation and just shows the element if motion is reduced.
   */
  function safe(el, anim, opts) {
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      var e = _el(el);
      if (e) e.style.opacity = '1';
      return Promise.resolve(e);
    }
    return _cssAnim(el, 'ak-' + anim, opts);
  }

  /* ═══════════════════════════════════════════════════════════════════════════
   * SECTION 15 — AUTO-INIT  (data-anim attributes)
   *
   * Reads elements with [data-anim] and applies animations based on:
   *   data-anim          {string}   animation name (e.g. "fadeInUp")
   *   data-anim-trigger  {string}   "load"|"scroll"|"hover"|"click" (default "scroll")
   *   data-anim-duration {number}   ms (default 600)
   *   data-anim-delay    {number}   ms (default 0)
   *   data-anim-easing   {string}   CSS easing (default "ease")
   *   data-anim-repeat   {string}   "infinite" or number (default 1)
   *   data-anim-stagger  {number}   if applied to a parent, ms between children
   *
   * Example HTML:
   *   <section data-anim="fadeInUp" data-anim-trigger="scroll" data-anim-delay="100">
   *   <button  data-anim="rubberBand" data-anim-trigger="hover">Click me</button>
   *   <ul data-anim="fadeInLeft" data-anim-stagger="80" data-anim-trigger="scroll">
   *     <li>...</li> <li>...</li>
   *   </ul>
   * ═══════════════════════════════════════════════════════════════════════════ */

  function init(scope) {
    _injectStyles();
    scope = scope || document;
    var elements = Array.from(scope.querySelectorAll('[data-anim]'));

    elements.forEach(function (el) {
      var anim       = el.dataset.anim;
      var trigger    = el.dataset.animTrigger    || 'scroll';
      var duration   = parseInt(el.dataset.animDuration) || 600;
      var delay      = parseInt(el.dataset.animDelay)    || 0;
      var easing     = el.dataset.animEasing     || 'ease';
      var repeatVal  = el.dataset.animRepeat;
      var staggerMs  = parseInt(el.dataset.animStagger) || 0;
      var threshold  = parseFloat(el.dataset.animThreshold) || 0.15;
      var iterations = repeatVal === 'infinite' ? Infinity : (parseInt(repeatVal) || 1);

      /* If stagger is set, animate children instead of the parent */
      var targets = staggerMs ? Array.from(el.children) : [el];

      function runAnim(target, extraDelay) {
        return _cssAnim(target, 'ak-' + anim, {
          duration:   duration,
          delay:      delay + (extraDelay || 0),
          easing:     easing,
          iterations: iterations,
        });
      }

      function run() {
        targets.forEach(function (t, i) {
          if (iterations === 1 && trigger !== 'hover') t.style.opacity = '0';
          runAnim(t, staggerMs ? i * staggerMs : 0);
        });
      }

      if (trigger === 'scroll') {
        targets.forEach(function (t) { t.style.opacity = '0'; });
        var obs = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            var idx = targets.indexOf(entry.target);
            runAnim(entry.target, staggerMs ? idx * staggerMs : 0);
            obs.unobserve(entry.target);
          });
        }, { threshold: threshold });
        targets.forEach(function (t) { obs.observe(t); });

      } else if (trigger === 'hover') {
        el.addEventListener('mouseenter', run);

      } else if (trigger === 'click') {
        el.addEventListener('click', run);

      } else {
        /* trigger === 'load' */
        run();
      }
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════════
   * PUBLIC API
   * ═══════════════════════════════════════════════════════════════════════════ */

  return {

    /* ── Init ────────────────────────────────────────────────────────────── */
    init: init,
    easings: easings,

    /* ── Entrance ────────────────────────────────────────────────────────── */
    fadeIn: fadeIn,       fadeInUp: fadeInUp,       fadeInDown: fadeInDown,
    fadeInLeft: fadeInLeft, fadeInRight: fadeInRight,
    zoomIn: zoomIn,       zoomInUp: zoomInUp,       zoomInDown: zoomInDown,
    bounceIn: bounceIn,   bounceInUp: bounceInUp,   bounceInDown: bounceInDown,
    bounceInLeft: bounceInLeft, bounceInRight: bounceInRight,
    flipInX: flipInX,     flipInY: flipInY,
    rotateIn: rotateIn,   rollIn: rollIn,
    slideInUp: slideInUp, slideInDown: slideInDown,
    slideInLeft: slideInLeft, slideInRight: slideInRight,
    backInDown: backInDown, backInUp: backInUp,
    backInLeft: backInLeft, backInRight: backInRight,
    blurIn: blurIn,       dropIn: dropIn,
    wipeInLeft: wipeInLeft, wipeInRight: wipeInRight,
    wipeInUp: wipeInUp,   wipeInDown: wipeInDown,
    expandH: expandH,     expandV: expandV,

    /* ── Exit ────────────────────────────────────────────────────────────── */
    fadeOut: fadeOut,     fadeOutUp: fadeOutUp,     fadeOutDown: fadeOutDown,
    fadeOutLeft: fadeOutLeft, fadeOutRight: fadeOutRight,
    zoomOut: zoomOut,     bounceOut: bounceOut,
    slideOutUp: slideOutUp, slideOutDown: slideOutDown,
    slideOutLeft: slideOutLeft, slideOutRight: slideOutRight,
    blurOut: blurOut,

    /* ── Attention ───────────────────────────────────────────────────────── */
    pulse: pulse,         bounce: bounce,           flash: flash,
    shake: shake,         shakeY: shakeY,           headShake: headShake,
    wobble: wobble,       rubberBand: rubberBand,   jello: jello,
    tada: tada,           swing: swing,             heartbeat: heartbeat,
    spin: spin,           spinReverse: spinReverse, ping: ping,
    breathe: breathe,     float: float,             glowPulse: glowPulse,
    sway: sway,           vibrate: vibrate,         skewAnim: skewAnim,

    /* ── Scroll ──────────────────────────────────────────────────────────── */
    scrollReveal: scrollReveal,

    /* ── Text effects ────────────────────────────────────────────────────── */
    typewriter: typewriter,
    morphText: morphText,
    splitText: splitText,
    glitch: glitch,
    scramble: scramble,
    countUp: countUp,
    wavyText: wavyText,

    /* ── Interaction ─────────────────────────────────────────────────────── */
    ripple: ripple,
    tilt3D: tilt3D,
    magnetic: magnetic,
    hoverLift: hoverLift,
    cursorTrail: cursorTrail,

    /* ── Parallax ────────────────────────────────────────────────────────── */
    parallax: parallax,

    /* ── Stagger ─────────────────────────────────────────────────────────── */
    stagger: stagger,

    /* ── Loaders ─────────────────────────────────────────────────────────── */
    skeleton: skeleton,
    progressBar: progressBar,

    /* ── Page transition ─────────────────────────────────────────────────── */
    pageTransition: pageTransition,

    /* ── Timeline ────────────────────────────────────────────────────────── */
    timeline: timeline,

    /* ── Utility ─────────────────────────────────────────────────────────── */
    stop: stop,
    pause: pause,
    resume: resume,
    wait: wait,
    safe: safe,

  };
});
/* ── End of AnimKit.js ───────────────────────────────────────────────────── */
