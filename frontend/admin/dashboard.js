/**
 * dashboard.js – Admin Portal Dashboard
 * Base URL: http://localhost:3000/api/admin
 */

'use strict';

/* ══════════════════════════════════════════
   CONFIG & STATE
══════════════════════════════════════════ */
const BASE_URL = 'http://localhost:3000/api/admin';

/* Auth guard */
const adminId   = sessionStorage.getItem('admin_id');
const adminName = sessionStorage.getItem('admin_name') || adminId;
if (!adminId) {
  window.location.href = 'login.html';
}

/* App state */
let mentors          = [];   // [{id, name, ...}]
let students         = [];   // [{id, name, admission_id, mentor_name, ...}]
let pendingDeleteId  = null; // student id pending deletion

/* ══════════════════════════════════════════
   DOM REFS
══════════════════════════════════════════ */
const adminAvatar     = document.getElementById('admin-avatar');
const adminNameEl     = document.getElementById('admin-name');
const logoutBtn       = document.getElementById('logout-btn');

const statTotal       = document.getElementById('stat-total');
const statAssigned    = document.getElementById('stat-assigned');
const statUnassigned  = document.getElementById('stat-unassigned');
const statMentors     = document.getElementById('stat-mentors');

const toggleFormBtn   = document.getElementById('toggle-form-btn');
const addStudentBody  = document.getElementById('add-student-body');
const addStudentForm  = document.getElementById('add-student-form');
const addStudentBtn   = document.getElementById('add-student-btn');
const clearFormBtn    = document.getElementById('clear-form-btn');
const formAlert       = document.getElementById('form-alert');

const refreshBtn      = document.getElementById('refresh-btn');
const studentsTbody   = document.getElementById('students-tbody');
const tableAlert      = document.getElementById('table-alert');

const deleteOverlay   = document.getElementById('delete-overlay');
const deleteMsg       = document.getElementById('delete-msg');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const confirmDeleteBtn= document.getElementById('confirm-delete-btn');

const toastContainer  = document.getElementById('toast-container');

/* ══════════════════════════════════════════
   UTILS
══════════════════════════════════════════ */

/** Show a toast notification */
function showToast(message, type = 'info', duration = 3500) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, duration);
}

/** Show an inline alert inside a container element */
function showAlert(container, message, type = 'error') {
  const icons = { error: '⚠️', success: '✅', info: 'ℹ️' };
  container.innerHTML = `
    <div class="alert alert-${type}" style="margin-bottom:16px">
      <span>${icons[type]}</span><span>${message}</span>
    </div>
  `;
}

function clearAlert(container) {
  container.innerHTML = '';
}

/** Set button loading state */
function setLoading(btn, loading, label = '') {
  if (loading) {
    btn.disabled = true;
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner"></span> ${label || 'Please wait…'}`;
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.originalText || label;
  }
}

/** Generic fetch wrapper */
async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  let data;
  try { data = await res.json(); } catch { data = {}; }

  return { ok: res.ok, status: res.status, data };
}

/* ══════════════════════════════════════════
   INIT – run on page load
══════════════════════════════════════════ */
function initPage() {
  /* Set admin info in navbar */
  adminNameEl.textContent = adminName;
  adminAvatar.textContent = (adminName[0] || 'A').toUpperCase();

  /* Logout */
  logoutBtn.addEventListener('click', handleLogout);

  /* Toggle form visibility */
  toggleFormBtn.addEventListener('click', toggleForm);

  /* Clear form */
  clearFormBtn.addEventListener('click', () => {
    addStudentForm.reset();
    clearAlert(formAlert);
  });

  /* Add student */
  addStudentForm.addEventListener('submit', handleAddStudent);

  /* Refresh table */
  refreshBtn.addEventListener('click', loadStudents);

  /* Delete dialog */
  cancelDeleteBtn.addEventListener('click', closeDeleteDialog);
  confirmDeleteBtn.addEventListener('click', handleConfirmDelete);
  deleteOverlay.addEventListener('click', (e) => {
    if (e.target === deleteOverlay) closeDeleteDialog();
  });

  /* Load initial data */
  Promise.all([loadMentors(), loadStudents()]);
}

/* ══════════════════════════════════════════
   LOGOUT
══════════════════════════════════════════ */
function handleLogout() {
  sessionStorage.clear();
  window.location.href = 'login.html';
}

/* ══════════════════════════════════════════
   TOGGLE FORM
══════════════════════════════════════════ */
let formVisible = true;
function toggleForm() {
  formVisible = !formVisible;
  addStudentBody.style.display = formVisible ? '' : 'none';
  toggleFormBtn.textContent = formVisible ? 'Hide Form' : 'Show Form';
}

/* ══════════════════════════════════════════
   LOAD MENTORS
══════════════════════════════════════════ */
async function loadMentors() {
  try {
    const { ok, data } = await apiFetch('/mentors');
    if (ok && Array.isArray(data)) {
      mentors = data;
      statMentors.textContent = mentors.length;
    } else {
      mentors = [];
      statMentors.textContent = 0;
    }
  } catch (err) {
    console.error('Failed to load mentors:', err);
    mentors = [];
    statMentors.textContent = '!';
  }
}

/* ══════════════════════════════════════════
   LOAD STUDENTS
══════════════════════════════════════════ */
async function loadStudents() {
  setLoading(refreshBtn, true, '↻ Refresh');
  studentsTbody.innerHTML = `
    <tr><td colspan="6">
      <div class="empty-state"><div class="icon">⏳</div><p>Loading students…</p></div>
    </td></tr>
  `;

  try {
    const { ok, data } = await apiFetch('/students');

    if (!ok) {
      studentsTbody.innerHTML = `
        <tr><td colspan="6">
          <div class="empty-state"><div class="icon">⚠️</div><p>Failed to load students.</p></div>
        </td></tr>
      `;
      setLoading(refreshBtn, false);
      return;
    }

    students = Array.isArray(data) ? data : [];

    /* Update stats */
    const assigned   = students.filter(s => s.mentor_name || s.mentor_id).length;
    const unassigned = students.length - assigned;
    statTotal.textContent      = students.length;
    statAssigned.textContent   = assigned;
    statUnassigned.textContent = unassigned;

    renderStudentsTable();

  } catch (err) {
    console.error('Failed to load students:', err);
    studentsTbody.innerHTML = `
      <tr><td colspan="6">
        <div class="empty-state"><div class="icon">⚠️</div><p>Network error. Could not load students.</p></div>
      </td></tr>
    `;
  } finally {
    setLoading(refreshBtn, false);
  }
}

/* ══════════════════════════════════════════
   RENDER STUDENTS TABLE
══════════════════════════════════════════ */
function renderStudentsTable() {
  if (students.length === 0) {
    studentsTbody.innerHTML = `
      <tr><td colspan="6">
        <div class="empty-state">
          <div class="icon">👥</div>
          <p>No students added yet. Use the form above to add one.</p>
        </div>
      </td></tr>
    `;
    return;
  }

  studentsTbody.innerHTML = students.map((student, idx) => {
    const mentorDisplay = (student.mentor_name)
      ? `<span class="mentor-badge">👨‍🏫 ${escapeHtml(student.mentor_name)}</span>`
      : `<span class="mentor-badge unassigned">Unassigned</span>`;

    /* Build mentor dropdown */
    const mentorOptions = mentors.map(m => `
      <option value="${m.id}" ${(student.mentor_id === m.id) ? 'selected' : ''}>
        ${escapeHtml(m.name)}
      </option>
    `).join('');

    return `
      <tr data-id="${student.id}">
        <td style="color:var(--text-dim);font-size:.82rem">${idx + 1}</td>
        <td>
          <div class="student-name">${escapeHtml(student.name)}</div>
          <div class="student-id">${escapeHtml(student.email || '')}</div>
        </td>
        <td>
          <code style="background:var(--surface-2);padding:3px 8px;border-radius:4px;font-size:.8rem">
            ${escapeHtml(student.admission_id)}
          </code>
        </td>
        <td>${mentorDisplay}</td>
        <td>
          <select class="assign-select" data-student-id="${student.id}" ${mentors.length === 0 ? 'disabled title="No mentors available"' : ''}>
            <option value="">— Select Mentor —</option>
            ${mentorOptions}
          </select>
        </td>
        <td>
          <button class="btn btn-danger delete-btn" data-student-id="${student.id}" data-student-name="${escapeHtml(student.name)}">
            🗑 Delete
          </button>
        </td>
      </tr>
    `;
  }).join('');

  /* Attach event listeners */
  studentsTbody.querySelectorAll('.assign-select').forEach(sel => {
    sel.addEventListener('change', handleAssignMentor);
  });

  studentsTbody.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', openDeleteDialog);
  });
}

/* ══════════════════════════════════════════
   ADD STUDENT
══════════════════════════════════════════ */
async function handleAddStudent(e) {
  e.preventDefault();
  clearAlert(formAlert);

  /* Collect values */
  const fields = {
    admission_id:          get('admission_id'),
    name:                  get('name'),
    email:                 get('email'),
    date_of_birth:         get('date_of_birth'),
    attendance:            parseFloat(get('attendance')),
    marks:                 parseFloat(get('marks')),
    study_hours:           parseFloat(get('study_hours')),
    distance_from_home:    parseFloat(get('distance_from_home')),
    annual_income:         parseFloat(get('annual_income')),
    previous_marks:        parseFloat(get('previous_marks')),
    backlogs:              parseInt(get('backlogs'), 10),
    assignments_completed: parseFloat(get('assignments_completed')),
    participation:         parseFloat(get('participation')),
  };

  /* Basic validation */
  const requiredText = ['admission_id', 'name', 'email', 'date_of_birth'];
  for (const key of requiredText) {
    if (!fields[key]) {
      showAlert(formAlert, `"${key.replace(/_/g, ' ')}" is required.`);
      document.getElementById(key).focus();
      return;
    }
  }

  const numericFields = [
    'attendance', 'marks', 'study_hours', 'distance_from_home',
    'annual_income', 'previous_marks', 'backlogs',
    'assignments_completed', 'participation',
  ];
  for (const key of numericFields) {
    if (isNaN(fields[key])) {
      showAlert(formAlert, `"${key.replace(/_/g, ' ')}" must be a valid number.`);
      document.getElementById(key).focus();
      return;
    }
  }

  setLoading(addStudentBtn, true, 'Adding…');

  try {
    const { ok, data } = await apiFetch('/student', {
      method: 'POST',
      body: JSON.stringify(fields),
    });

    if (ok) {
      showAlert(formAlert, `Student "${fields.name}" added successfully!`, 'success');
      addStudentForm.reset();
      showToast(`✅ "${fields.name}" added successfully!`, 'success');
      await loadStudents();
    } else {
      showAlert(formAlert, data.message || 'Failed to add student. Please try again.');
    }
  } catch (err) {
    console.error('Add student error:', err);
    showAlert(formAlert, 'Network error. Could not connect to the server.');
  } finally {
    setLoading(addStudentBtn, false);
  }
}

function get(id) {
  return (document.getElementById(id)?.value || '').trim();
}

/* ══════════════════════════════════════════
   ASSIGN MENTOR
══════════════════════════════════════════ */
async function handleAssignMentor(e) {
  const select     = e.target;
  const studentId  = parseInt(select.dataset.studentId, 10);
  const mentorId   = parseInt(select.value, 10);

  if (!mentorId) return;

  /* Optimistic UI – lock select while saving */
  select.disabled = true;

  try {
    const { ok, data } = await apiFetch('/assign-mentor', {
      method: 'POST',
      body: JSON.stringify({ student_id: studentId, mentor_id: mentorId }),
    });

    if (ok) {
      showToast('Mentor assigned successfully!', 'success');
      await loadStudents(); // refresh to update "Current Mentor" column
    } else {
      showToast(data.message || 'Failed to assign mentor.', 'error');
      select.disabled = false;
    }
  } catch (err) {
    console.error('Assign mentor error:', err);
    showToast('Network error while assigning mentor.', 'error');
    select.disabled = false;
  }
}

/* ══════════════════════════════════════════
   DELETE STUDENT
══════════════════════════════════════════ */
function openDeleteDialog(e) {
  const btn = e.currentTarget;
  pendingDeleteId = parseInt(btn.dataset.studentId, 10);
  const name = btn.dataset.studentName || 'this student';
  deleteMsg.textContent = `Are you sure you want to remove "${name}"? This action cannot be undone.`;
  deleteOverlay.classList.add('active');
}

function closeDeleteDialog() {
  deleteOverlay.classList.remove('active');
  pendingDeleteId = null;
}

async function handleConfirmDelete() {
  if (!pendingDeleteId) return;

  const id = pendingDeleteId;
  setLoading(confirmDeleteBtn, true, 'Deleting…');

  try {
    const { ok, data } = await apiFetch(`/student/${id}`, { method: 'DELETE' });

    if (ok) {
      showToast('Student deleted successfully.', 'success');
      closeDeleteDialog();
      await loadStudents();
    } else {
      showToast(data.message || 'Failed to delete student.', 'error');
      setLoading(confirmDeleteBtn, false);
    }
  } catch (err) {
    console.error('Delete error:', err);
    showToast('Network error while deleting.', 'error');
    setLoading(confirmDeleteBtn, false);
  }
}

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ══════════════════════════════════════════
   BOOT
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', initPage);