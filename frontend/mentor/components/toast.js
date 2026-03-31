/**
 * components/toast.js
 * Lightweight toast notification utility.
 *
 * Requires a #toast, #toast-icon, and #toast-msg element in the DOM
 * (already present in dashboard.html).
 *
 * Usage:
 *   import { showToast } from './components/toast.js';
 *   showToast('✅', 'Data loaded successfully!', 'success');
 *   showToast('⚠️', 'Something went wrong.', 'error');
 */

'use strict';

let _timer = null;

/**
 * Display a toast notification.
 * @param {string} icon    - Emoji or short icon text
 * @param {string} message - Message to display
 * @param {'success'|'error'|'info'} type - Styling type
 * @param {number} [duration=3500] - Auto-dismiss in ms
 */
export function showToast(icon, message, type = 'info', duration = 3500) {
  const toast    = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-msg');
  const toastIco = document.getElementById('toast-icon');

  if (!toast) {
    console.warn('[toast.js] #toast element not found in DOM.');
    return;
  }

  toastIco.textContent = icon;
  toastMsg.textContent = message;
  toast.className = `toast ${type}`;

  // Force reflow to restart CSS transition
  void toast.offsetWidth;
  toast.classList.add('show');

  clearTimeout(_timer);
  _timer = setTimeout(() => toast.classList.remove('show'), duration);
}

/**
 * Immediately dismiss the toast.
 */
export function dismissToast() {
  const toast = document.getElementById('toast');
  if (toast) toast.classList.remove('show');
  clearTimeout(_timer);
}
