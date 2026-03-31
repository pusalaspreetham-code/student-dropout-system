/**
 * components/riskBadge.js
 * Reusable helper that generates risk badge HTML.
 * Import / call from any page that needs a risk badge.
 *
 * Usage:
 *   import { createRiskBadge, riskColor } from './components/riskBadge.js';
 *   cell.innerHTML = createRiskBadge('High');
 */

'use strict';

/**
 * Returns an HTML string for a styled risk badge.
 * @param {string} level - "High" | "Medium" | "Low"
 * @returns {string} HTML string
 */
export function createRiskBadge(level) {
  const norm = normalizeLevel(level);
  return `<span class="risk-badge ${norm}">
    <span class="badge-dot"></span>
    ${norm}
  </span>`;
}

/**
 * Returns the CSS variable name for the risk color.
 * @param {string} level
 * @returns {string} CSS custom property reference
 */
export function riskColor(level) {
  const norm = normalizeLevel(level);
  const map = {
    High:   'var(--risk-high)',
    Medium: 'var(--risk-med)',
    Low:    'var(--risk-low)',
  };
  return map[norm] || map.Low;
}

/**
 * Normalise any casing / abbreviation of risk level.
 * @param {string} raw
 * @returns {"High"|"Medium"|"Low"}
 */
export function normalizeLevel(raw) {
  if (!raw) return 'Low';
  const s = String(raw).trim().toLowerCase();
  if (s === 'high')                   return 'High';
  if (s === 'medium' || s === 'med')  return 'Medium';
  return 'Low';
}
