'use strict';

/**
 * EcoTrack AI — Carbon Footprint Tracker
 * Core application logic.
 *
 * Architecture:
 *  - emissionEngine: pure functions for CO2 calculation (fully unit-testable)
 *  - store: persistence layer (localStorage wrapper with validation)
 *  - ui: DOM rendering and event wiring
 *  - aiClient: Gemini API integration with input sanitization
 *
 * Exposed on `window.EcoTrack` for the test suite (tests.html) to import.
 */

// ═══════════════════════════════════════════════════════════════
// EMISSION ENGINE — pure, testable calculation logic
// ═══════════════════════════════════════════════════════════════
const emissionEngine = (() => {
  /** Emission factors in kg CO2e. Sources: IPCC AR6, India CEA grid factor 2023, FAO. */
  const EF = Object.freeze({
    transport: {
      car_petrol: 0.192, car_diesel: 0.171, car_electric: 0.050,
      bike_petrol: 0.089, bus: 0.027, train: 0.012,
      flight_domestic: 0.255, walk_cycle: 0.000
    },
    food: { vegan: 1.5, vegetarian: 2.5, chicken: 4.5, beef: 7.5 },
    foodWaste: { none: 0, little: 0.2, moderate: 0.5, lot: 1.0 },
    electricityGridFactor: 0.82, // kg CO2 per kWh, India average
    cookingFuel: { lpg: 1.5, electric: 0, solar: 0, firewood: 2.0 },
    shoppingOrders: { 0: 0, 1: 0.5, 2: 1.0, 3: 1.8 },
    plastic: { none: 0, little: 0.1, moderate: 0.3 }
  });

  const INDIA_AVG_DAILY_KG = 6.0;

  /**
   * Clamp a value to a safe non-negative finite number.
   * Prevents NaN/Infinity/negative values from corrupting calculations.
   */
  function safeNumber(value, fallback = 0) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return fallback;
    return n;
  }

  /**
   * Look up an emission factor by category+key, throwing on unknown keys
   * rather than silently returning undefined (which would propagate as NaN).
   */
  function lookup(table, key, tableName) {
    if (!Object.prototype.hasOwnProperty.call(table, key)) {
      throw new RangeError(`Unknown ${tableName} option: "${key}"`);
    }
    return table[key];
  }

  /**
   * Calculate today's total carbon footprint from validated user inputs.
   * @param {object} input
   * @returns {{total:number, transport:number, food:number, energy:number, shopping:number}}
   */
  function calculate(input) {
    const km = safeNumber(input.km);
    const kwh = safeNumber(input.kwh);

    const transport = lookup(EF.transport, input.mode, 'transport mode') * km;
    const food = lookup(EF.food, input.diet, 'diet') + lookup(EF.foodWaste, input.waste, 'food waste');
    const energy = kwh * EF.electricityGridFactor + lookup(EF.cookingFuel, input.fuel, 'cooking fuel');
    const shopping = lookup(EF.shoppingOrders, input.orders, 'shopping orders') + lookup(EF.plastic, input.plastic, 'plastic use');

    const total = transport + food + energy + shopping;

    return {
      total: round2(total),
      transport: round2(transport),
      food: round2(food),
      energy: round2(energy),
      shopping: round2(shopping)
    };
  }

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  /** Classify a total footprint into a human-readable tier. */
  function classify(total) {
    if (total < 2) return { tier: 'excellent', label: '🌟 Excellent!', desc: 'Far below average. Amazing eco habits!', color: '#22c55e' };
    if (total < 4) return { tier: 'good', label: '✅ Good', desc: "Below India average. Keep it up!", color: '#86efac' };
    if (total < 6) return { tier: 'average', label: '⚠️ Average', desc: "Around India's daily average.", color: '#f59e0b' };
    if (total < 10) return { tier: 'high', label: '🔴 High', desc: 'Above average. Room to reduce.', color: '#f97316' };
    return { tier: 'very_high', label: '🚨 Very High', desc: 'Significantly above average. Take action!', color: '#ef4444' };
  }

  /** Calculate consecutive-day streak ending today from a history array of {date:'YYYY-MM-DD'}. */
  function calcStreak(history, referenceDate = new Date()) {
    if (!Array.isArray(history) || history.length === 0) return 0;
    const dateSet = new Set(history.map(e => e.date));
    let streak = 0;
    const d = new Date(referenceDate);
    for (let i = 0; i < 365; i++) {
      const ds = d.toISOString().split('T')[0];
      if (dateSet.has(ds)) { streak++; d.setDate(d.getDate() - 1); } else break;
    }
    return streak;
  }

  return { EF, INDIA_AVG_DAILY_KG, calculate, classify, calcStreak, safeNumber, round2 };
})();

// ═══════════════════════════════════════════════════════════════
// VALIDATION — input sanitization & whitelisting
// ═══════════════════════════════════════════════════════════════
const validate = (() => {
  /** Allowed option sets, derived from the emission engine so they can never drift apart. */
  const ALLOWED = {
    mode: Object.keys(emissionEngine.EF.transport),
    diet: Object.keys(emissionEngine.EF.food),
    waste: Object.keys(emissionEngine.EF.foodWaste),
    fuel: Object.keys(emissionEngine.EF.cookingFuel),
    orders: Object.keys(emissionEngine.EF.shoppingOrders),
    plastic: Object.keys(emissionEngine.EF.plastic)
  };

  function isAllowed(field, value) {
    return ALLOWED[field] !== undefined && ALLOWED[field].includes(value);
  }

  /**
   * Strip a free-text string down to safe, displayable plain text.
   * Removes HTML tags and caps length to prevent prompt-stuffing / DOM injection
   * when the value is later interpolated into innerHTML or an AI prompt.
   */
  function sanitizeText(str, maxLen = 500) {
    if (typeof str !== 'string') return '';
    const noTags = str.replace(/<[^>]*>/g, '');
    return noTags.slice(0, maxLen).trim();
  }

  /** Validate a Gemini API key shape (does not verify it actually works). */
  function looksLikeApiKey(key) {
    return typeof key === 'string' && /^[A-Za-z0-9_-]{20,100}$/.test(key.trim());
  }

  return { isAllowed, sanitizeText, looksLikeApiKey, ALLOWED };
})();

// ═══════════════════════════════════════════════════════════════
// STORE — localStorage persistence with validation & quota safety
// ═══════════════════════════════════════════════════════════════
const store = (() => {
  const KEYS = { apiKey: 'eco_api_key', history: 'eco_history' };
  const MAX_HISTORY_ENTRIES = 365;

  function getApiKey() {
    try { return localStorage.getItem(KEYS.apiKey) || ''; }
    catch { return ''; }
  }

  function setApiKey(key) {
    try { localStorage.setItem(KEYS.apiKey, key); return true; }
    catch { return false; }
  }

  function clearApiKey() {
    try { localStorage.removeItem(KEYS.apiKey); } catch { /* ignore */ }
  }

  function getHistory() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEYS.history) || '[]');
      if (!Array.isArray(raw)) return [];
      // Defensive validation: drop malformed entries rather than crash the UI.
      return raw.filter(e => e && typeof e.date === 'string' && Number.isFinite(e.total));
    } catch { return []; }
  }

  function saveHistory(history) {
    try {
      const trimmed = history.slice(0, MAX_HISTORY_ENTRIES);
      localStorage.setItem(KEYS.history, JSON.stringify(trimmed));
      return true;
    } catch { return false; }
  }

  function addEntry(entry) {
    const history = getHistory().filter(e => e.date !== entry.date);
    history.push(entry);
    history.sort((a, b) => b.date.localeCompare(a.date));
    saveHistory(history);
    return history;
  }

  return { getApiKey, setApiKey, clearApiKey, getHistory, saveHistory, addEntry };
})();

// ═══════════════════════════════════════════════════════════════
// AI CLIENT — Gemini API wrapper
// ═══════════════════════════════════════════════════════════════
const aiClient = (() => {
  const MODEL = 'gemini-2.0-flash';
  const ENDPOINT = (key) => `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`;

  /**
   * Call Gemini with a prompt. Never throws — always resolves to a user-facing string,
   * so callers don't need try/catch at every call site.
   */
  async function ask(prompt, apiKey) {
    if (!apiKey) {
      return '⚠️ Please add your Gemini API key in the setup section above to use AI features.';
    }
    if (!validate.looksLikeApiKey(apiKey)) {
      return '⚠️ That API key doesn\'t look valid. Please check and re-enter it.';
    }
    try {
      const res = await fetch(ENDPOINT(apiKey), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 600 }
        })
      });
      const data = await res.json();
      if (data.error) return `❌ API Error: ${validate.sanitizeText(data.error.message, 200)}`;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return text ? text : 'No response from AI. Please try again.';
    } catch (e) {
      return `❌ Network error: ${validate.sanitizeText(e.message, 200)}`;
    }
  }

  return { ask };
})();

// ═══════════════════════════════════════════════════════════════
// EXPORT for test suite + browser global
// ═══════════════════════════════════════════════════════════════
const EcoTrack = { emissionEngine, validate, store, aiClient };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EcoTrack; // Node-based test runners, if ever used
}
if (typeof window !== 'undefined') {
  window.EcoTrack = EcoTrack;
}
