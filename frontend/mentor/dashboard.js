/**
 * dashboard.js  —  EduGuard Student Dropout Prediction System
 *
 * Features:
 *  1. Student data fetch  (GET /api/mentor/students/:mentorId)
 *  2. Stats cards + animated counts
 *  3. Risk Distribution Doughnut chart  (Chart.js)
 *  4. Risk % Bar chart  (Chart.js)
 *  5. Search + filter
 *  6. Export CSV
 *  7. Student detail popup (modal)
 *  8. Per-student radar chart in popup
 *  9. Recommendations panel
 * 10. Notes (save/load via localStorage)
 * 11. Refresh Prediction  (POST /api/mentor/refresh-prediction  OR  POST /api/predict)
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════
     AUTH GUARD
  ══════════════════════════════════════════════ */
  const mentorId   = sessionStorage.getItem('mentorId');
  const mentorName = sessionStorage.getItem('mentorName') || mentorId;
  if (!mentorId) { window.location.href = 'login.html'; return; }

  /* ══════════════════════════════════════════════
     DOM REFS
  ══════════════════════════════════════════════ */
  const $ = id => document.getElementById(id);
  const loadingOverlay  = $('loading-overlay');
  const navName         = $('nav-mentor-name');
  const navId           = $('nav-mentor-id');
  const headerSubtitle  = $('header-subtitle');
  const logoutBtn       = $('logout-btn');
  const refreshAllBtn   = $('refresh-all-btn');
  const searchInput     = $('search-input');
  const filterBtns      = document.querySelectorAll('.filter-btn');
  const tableBody       = $('table-body');
  const emptyState      = $('empty-state');
  const resultsInfo     = $('results-info');
  const tableBadge      = $('table-badge');
  const exportBtn       = $('export-btn');

  const statTotal  = $('stat-total');
  const statHigh   = $('stat-high');
  const statMedium = $('stat-medium');
  const statLow    = $('stat-low');

  // Modal
  const modalBackdrop    = $('modal-backdrop');
  const modalClose       = $('modal-close');
  const modalAvatar      = $('modal-avatar');
  const modalTitle       = $('modal-title');
  const modalRiskBadge   = $('modal-risk-badge');
  const modalRiskPct     = $('modal-risk-pct');
  const modalPredText    = $('modal-prediction-text');
  const modalRefreshBtn  = $('modal-refresh-btn');
  const detailGrid       = $('detail-grid');
  const recoList         = $('reco-list');
  const recoBanner       = $('reco-banner');
  const recoBannerIcon   = $('reco-banner-icon');
  const recoHeading      = $('reco-heading');
  const recoSubheading   = $('reco-subheading');
  const notesTextarea    = $('notes-textarea');
  const btnSaveNote      = $('btn-save-note');
  const notesLog         = $('notes-log');
  const notesSavedLabel  = $('notes-autosave-label');
  const tabNotesDot      = $('tab-notes-dot');

  /* ══════════════════════════════════════════════
     STATE
  ══════════════════════════════════════════════ */
  let allStudents      = [];
  let filteredStudents = [];
  let activeFilter     = 'all';
  let searchQuery      = '';
  let currentStudent   = null;
  let radarChart       = null;
  let doughnutChart    = null;
  let barChart         = null;

  /* ══════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════ */
  navName.textContent = mentorName;
  navId.textContent   = mentorId;
  headerSubtitle.textContent = `Monitoring students assigned to ${mentorName} (${mentorId}).`;

  async function fetchStudents(silent = false) {
  if (!silent) showLoading(true);
  try {
    const res = await fetch(`http://localhost:3000/api/mentor/students/${mentorId}`);
    if (!res.ok) throw new Error(`Server error: ${res.status}`);

    const data = await res.json();
    allStudents = Array.isArray(data) ? data : [];

    // ✅ ADD THIS (your feature integration)
    if (allStudents.length > 0) {
      updateDashboard({
        attendance: parseFloat(allStudents[0].attendance ?? 0),
        marks: parseFloat(allStudents[0].marks ?? 0),
        backlogs: parseFloat(allStudents[0].backlogs ?? 0)
      });
    }

    renderStats();
    renderCharts();
    applyFilters();

  } catch (err) {
    console.error(err);
    showToast('⚠️', 'Failed to load student data.', 'error');
  } finally {
    if (!silent) showLoading(false);
  }
}

  /* ══════════════════════════════════════════════
     STATS CARDS
  ══════════════════════════════════════════════ */
  function renderStats() {
    const high   = allStudents.filter(s => norm(s.risk_level) === 'High').length;
    const medium = allStudents.filter(s => norm(s.risk_level) === 'Medium').length;
    const low    = allStudents.filter(s => norm(s.risk_level) === 'Low').length;
    animateCount(statTotal,  allStudents.length);
    animateCount(statHigh,   high);
    animateCount(statMedium, medium);
    animateCount(statLow,    low);
    $('dc-total').textContent = allStudents.length;
  }

  function animateCount(el, target) {
    let current = 0;
    const step = Math.max(1, Math.ceil(target / 25));
    const t = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current;
      if (current >= target) clearInterval(t);
    }, 28);
  }

  /* ══════════════════════════════════════════════
     CHARTS
  ══════════════════════════════════════════════ */
  const CHART_COLORS = {
    High:   { border: '#ef4444', bg: 'rgba(239,68,68,0.75)' },
    Medium: { border: '#f59e0b', bg: 'rgba(245,158,11,0.75)' },
    Low:    { border: '#22c55e', bg: 'rgba(34,197,94,0.75)' },
  };

  function renderCharts() {
    console.log("Students Data:", allStudents);
    const high   = allStudents.filter(s => norm(s.risk_level) === 'High').length;
    const medium = allStudents.filter(s => norm(s.risk_level) === 'Medium').length;
    const low    = allStudents.filter(s => norm(s.risk_level) === 'Low').length;

    /* ── Doughnut ── */
    const dCtx = $('risk-doughnut').getContext('2d');
    if (doughnutChart) doughnutChart.destroy();
    doughnutChart = new Chart(dCtx, {
      type: 'doughnut',
      data: {
        labels: ['High Risk', 'Medium Risk', 'Low Risk'],
        datasets: [{
          data: [high, medium, low],
          backgroundColor: ['rgba(239,68,68,0.82)', 'rgba(245,158,11,0.82)', 'rgba(34,197,94,0.82)'],
          borderColor:     ['#ef4444', '#f59e0b', '#22c55e'],
          borderWidth: 2,
          hoverOffset: 8,
        }],
      },
      options: {
        cutout: '68%',
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${ctx.parsed} students`,
            },
            backgroundColor: '#0e1628',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            titleColor: '#e8edf7',
            bodyColor: '#7a8fad',
          },
        },
      },
    });

    // Custom legend
    const legend = $('donut-legend');
    legend.innerHTML = [
      { label: 'High Risk',   count: high,   color: '#ef4444' },
      { label: 'Medium Risk', count: medium, color: '#f59e0b' },
      { label: 'Low Risk',    count: low,    color: '#22c55e' },
    ].map(item => `
      <div class="donut-legend-item">
        <span class="donut-legend-dot" style="background:${item.color}"></span>
        <span class="donut-legend-label">${item.label}</span>
        <span class="donut-legend-count">${item.count}</span>
      </div>
    `).join('');
/* ── Bar (top 15 by risk%) ── */
const sorted = [...allStudents]
  .sort((a, b) => {
    // ✅ Fix: Check all possible naming variations (risk_percent OR risk_pct)
    const pctA = parseFloat(a.risk_percent ?? a.risk_pct ?? 0);
    const pctB = parseFloat(b.risk_percent ?? b.risk_pct ?? 0);
    return pctB - pctA;
  })
  .slice(0, 15);

const bCtx = $('risk-bar').getContext('2d');
if (barChart) barChart.destroy();
barChart = new Chart(bCtx, {
  type: 'bar',
  data: {
    labels: sorted.map(s => shortName(s.name)),
    datasets: [{
      label: 'Risk %',
      // ✅ Fix: Use the same flexible naming here
    data: sorted.map(s => Number(s.risk_percent ?? s.risk_pct ?? 0)),
      backgroundColor: sorted.map(s => CHART_COLORS[norm(s.risk_level)].bg),
      borderColor:     sorted.map(s => CHART_COLORS[norm(s.risk_level)].border),
      borderWidth: 1,
      borderRadius: 5,
    }],
  },
  // ... rest of your options
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: ctx => sorted[ctx[0].dataIndex]?.name || ctx[0].label,
              label: ctx => ` Risk: ${ctx.parsed.y}%`,
            },
            backgroundColor: '#0e1628',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            titleColor: '#e8edf7',
            bodyColor: '#7a8fad',
          },
        },
        scales: {
          x: {
            ticks: { color: '#7a8fad', font: { size: 10 }, maxRotation: 35 },
            grid:  { color: 'rgba(255,255,255,0.04)' },
          },
          y: {
            min: 0, max: 100,
            ticks: { color: '#7a8fad', font: { size: 10 }, callback: v => v + '%' },
            grid:  { color: 'rgba(255,255,255,0.06)' },
          },
        },
      },
    });
  }

  function shortName(name) {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length > 1 ? parts[0][0] + '. ' + parts[parts.length - 1] : parts[0];
  }

  /* ══════════════════════════════════════════════
     FILTER + SEARCH
  ══════════════════════════════════════════════ */
  function applyFilters() {
    let list = [...allStudents];
    if (activeFilter !== 'all') list = list.filter(s => norm(s.risk_level) === activeFilter);
    if (searchQuery.trim())     list = list.filter(s => (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()));
    filteredStudents = list;
    renderTable(list);
    resultsInfo.textContent = `${list.length} student${list.length !== 1 ? 's' : ''}`;
    tableBadge.textContent  = `${list.length} record${list.length !== 1 ? 's' : ''}`;
  }

  /* ══════════════════════════════════════════════
     TABLE RENDER
  ══════════════════════════════════════════════ */
  function renderTable(students) {
    tableBody.innerHTML = '';
    if (!students.length) { emptyState.classList.remove('hidden'); return; }
    emptyState.classList.add('hidden');

    students.forEach((s, i) => {
      const level   = norm(s.risk_level);
      const pct     = parseFloat(s.risk_percent ?? s.risk_pct ?? 0);
      const attend  = parseFloat(s.attendance ?? 0);
      const marks   = parseFloat(s.marks ?? 0);
      const hours   = parseFloat(s.study_hours ?? 0);
      const noteKey = noteStorageKey(s.name);
      const hasNote = getNoteLog(noteKey).length > 0;

      const tr = document.createElement('tr');
      tr.style.animationDelay = `${i * 0.025}s`;
      tr.innerHTML = `
        <td>
          <div class="cell-name">
            <div class="avatar" style="${avatarStyle(s.name)}">${initials(s.name)}</div>
            <span class="name-text">${esc(s.name || '—')}</span>
          </div>
        </td>
        <td>
          <div class="attend-wrap">
            <div class="attend-bar">
              <div class="attend-fill ${attendClass(attend)}" style="width:${Math.min(attend,100)}%"></div>
            </div>
            <span class="attend-pct">${attend}%</span>
          </div>
        </td>
        <td class="cell-num">${marks > 0 ? marks.toFixed(1) : '—'}</td>
        <td class="cell-num">${hours > 0 ? hours.toFixed(1) + 'h' : '—'}</td>
        <td><span class="risk-pct ${level.toLowerCase()}">${pct.toFixed(1)}%</span></td>
        <td><span class="risk-badge ${level}"><span class="badge-dot"></span>${level}</span></td>
        <td><span class="prediction-cell ${predClass(s.prediction, level)}">${formatPred(s.prediction, level)}</span></td>
        <td>
          <span class="note-indicator ${hasNote ? 'has-note' : ''}" title="${hasNote ? 'Has notes' : 'No notes'}">
            <i class="ph ${hasNote ? 'ph-note-fill' : 'ph-note'}"></i>
          </span>
        </td>
        <td>
          <div class="action-btns">
            <button class="btn-action btn-view" data-idx="${i}" title="View Details">
              <i class="ph ph-eye"></i>
            </button>
            <button class="btn-action btn-refresh-row" data-idx="${i}" title="Refresh Prediction">
              <i class="ph ph-arrows-clockwise"></i>
            </button>
          </div>
        </td>
      `;
      // Attach events after insertion
      tr.querySelector('.btn-view').addEventListener('click', () => openModal(filteredStudents[i]));
      tr.querySelector('.btn-refresh-row').addEventListener('click', e => {
        e.stopPropagation();
        refreshPrediction(filteredStudents[i], tr.querySelector('.btn-refresh-row'));
      });
      tableBody.appendChild(tr);
    });
  }

  /* ══════════════════════════════════════════════
     MODAL OPEN / CLOSE
  ══════════════════════════════════════════════ */
  function openModal(student) {
    currentStudent = student;
    const level = norm(student.risk_level);
    const pct   = parseFloat(student.risk_percent ?? 0);

    // Header
    modalAvatar.textContent    = initials(student.name);
    modalAvatar.style.cssText  = avatarStyle(student.name);
    modalTitle.textContent     = student.name || '—';
    modalRiskBadge.className   = `risk-badge ${level}`;
    modalRiskBadge.innerHTML   = `<span class="badge-dot"></span>${level}`;
    modalRiskPct.textContent   = `${pct.toFixed(1)}%`;
    modalRiskPct.className     = `modal-risk-pct ${level.toLowerCase()}`;
    modalPredText.textContent  = formatPred(student.prediction, level);
    modalPredText.className    = `modal-prediction-text ${predClass(student.prediction, level)}`;

    // Switch to details tab
    switchTab('details');

    // Fill panels
    renderDetailGrid(student);
    renderRecommendation(student);
    renderNotes(student);
    updateNotesDot(student);

    // Show
    modalBackdrop.classList.add('open');
    modalBackdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Draw radar after modal visible
    requestAnimationFrame(() => renderRadarChart(student));
  }

  function closeModal() {
    modalBackdrop.classList.remove('open');
    modalBackdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    currentStudent = null;
  }

  modalClose.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', e => { if (e.target === modalBackdrop) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  /* ══════════════════════════════════════════════
     TABS
  ══════════════════════════════════════════════ */
  function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      const isActive = btn.dataset.tab === tabId;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive);
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `tab-${tabId}`);
    });
    if (tabId === 'chart' && currentStudent) {
      requestAnimationFrame(() => renderRadarChart(currentStudent));
    }
  }

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  /* ══════════════════════════════════════════════
     DETAIL GRID
  ══════════════════════════════════════════════ */
  function renderDetailGrid(s) {
    const fields = [
      { icon: 'ph-calendar-check', label: 'Attendance',          value: s.attendance != null ? `${s.attendance}%` : '—' },
      { icon: 'ph-exam',           label: 'Marks',               value: s.marks != null ? s.marks : '—' },
      { icon: 'ph-clock',          label: 'Study Hours / Day',   value: s.study_hours != null ? `${s.study_hours}h` : '—' },
      { icon: 'ph-book-open',      label: 'Previous Marks',      value: s.previous_marks != null ? s.previous_marks : '—' },
      { icon: 'ph-x-circle',       label: 'Backlogs',            value: s.backlogs != null ? s.backlogs : '—' },
      { icon: 'ph-check-square',   label: 'Assignments Done',    value: s.assignments_completed != null ? s.assignments_completed : '—' },
      { icon: 'ph-microphone',     label: 'Participation Score', value: s.participation != null ? s.participation : '—' },
      { icon: 'ph-map-pin',        label: 'Distance from Home',  value: s.distance_from_home != null ? `${s.distance_from_home} km` : '—' },
      { icon: 'ph-currency-inr',   label: 'Annual Income',       value: s.annual_income != null ? `₹${Number(s.annual_income).toLocaleString('en-IN')}` : '—' },
    ];

    detailGrid.innerHTML = fields.map(f => `
      <div class="detail-item">
        <div class="detail-icon"><i class="ph ${f.icon}"></i></div>
        <div class="detail-body">
          <span class="detail-label">${f.label}</span>
          <span class="detail-value">${esc(String(f.value))}</span>
        </div>
      </div>
    `).join('');
  }

  /* ══════════════════════════════════════════════
     RADAR CHART (inside modal)
  ══════════════════════════════════════════════ */
  function renderRadarChart(s) {
    const ctx = $('student-radar-chart').getContext('2d');
    if (radarChart) radarChart.destroy();

    // Normalise each metric to 0–100 scale
    const metrics = [
      { label: 'Attendance',    val: clamp(s.attendance, 0, 100) },
      { label: 'Marks',         val: clamp(s.marks, 0, 100) },
      { label: 'Study Hours',   val: clamp((s.study_hours / 12) * 100, 0, 100) },
      { label: 'Assignments',   val: clamp((s.assignments_completed / 10) * 100, 0, 100) },
      { label: 'Participation', val: clamp((s.participation / 5) * 100, 0, 100) },
      { label: 'Prev. Marks',   val: clamp(s.previous_marks, 0, 100) },
    ];

    const level = norm(s.risk_level);
    const color = level === 'High' ? '239,68,68' : level === 'Medium' ? '245,158,11' : '34,197,94';

    radarChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: metrics.map(m => m.label),
        datasets: [
          {
            label: s.name,
            data: metrics.map(m => m.val),
            backgroundColor: `rgba(${color},0.15)`,
            borderColor:     `rgba(${color},0.9)`,
            pointBackgroundColor: `rgba(${color},1)`,
            pointRadius: 4,
            borderWidth: 2,
          },
          {
            label: 'Safe Zone',
            data: [75, 60, 50, 70, 60, 60],
            backgroundColor: 'rgba(99,160,255,0.05)',
            borderColor: 'rgba(99,160,255,0.35)',
            borderDash: [5, 4],
            pointRadius: 0,
            borderWidth: 1.5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            labels: { color: '#7a8fad', font: { size: 11 } },
          },
          tooltip: {
            backgroundColor: '#0e1628',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            titleColor: '#e8edf7',
            bodyColor: '#7a8fad',
          },
        },
        scales: {
          r: {
            min: 0, max: 100,
            ticks: { display: false, stepSize: 25 },
            grid:  { color: 'rgba(255,255,255,0.06)' },
            angleLines: { color: 'rgba(255,255,255,0.07)' },
            pointLabels: { color: '#7a8fad', font: { size: 11 } },
          },
        },
      },
    });
  }
function updateDashboard(data) {
    const attendance = data.attendance;
    const marks = data.marks;
    const backlogs = data.backlogs;

    // Set values
    document.getElementById("attendance").innerText = attendance + "%";
    document.getElementById("marks").innerText = marks;
    document.getElementById("backlogs").innerText = backlogs;

    // Attendance logic
    const attendanceStatus = document.getElementById("attendanceStatus");
    if (attendance >= 75) {
        attendanceStatus.innerText = "Eligible";
        attendanceStatus.style.color = "#10b981"; // green
    } else {
        attendanceStatus.innerText = "Not Eligible";
        attendanceStatus.style.color = "#ef4444"; // red
    }

    // Marks logic
    const marksStatus = document.getElementById("marksStatus");
    if (marks > 85) {
        marksStatus.innerText = "Excellent";
        marksStatus.style.color = "#10b981";
    } else if (marks > 50) {
        marksStatus.innerText = "Good";
        marksStatus.style.color = "#3b82f6";
    } else {
        marksStatus.innerText = "Needs Improvement";
        marksStatus.style.color = "#ef4444";
    }

    // Backlogs logic
    const backlogsStatus = document.getElementById("backlogsStatus");
    if (backlogs === 0) {
        backlogsStatus.innerText = "All Clear 🎉";
        backlogsStatus.style.color = "#10b981";
    } else if (backlogs <= 2) {
        backlogsStatus.innerText = "Manageable – Clear Soon";
        backlogsStatus.style.color = "#f59e0b";
    } else {
        backlogsStatus.innerText = "High Risk – Immediate Action Needed";
        backlogsStatus.style.color = "#ef4444";
    }
}
  /* ══════════════════════════════════════════════
     RECOMMENDATIONS
  ══════════════════════════════════════════════ */
  const RECO_MAP = {
    High: {
      icon: '🚨',
      heading: 'Immediate Intervention Required',
      sub: 'This student is at critical risk of dropping out. Take action now.',
      items: [
        { icon: '📞', title: 'Schedule Urgent 1-on-1 Meeting', text: 'Contact the student within 48 hours to understand their challenges.' },
        { icon: '📈', title: 'Attendance Recovery Plan', text: 'Set a minimum attendance target and track weekly progress.' },
        { icon: '📚', title: 'Assign Academic Buddy', text: 'Pair with a high-performing peer for study support.' },
        { icon: '🏠', title: 'Home Environment Check', text: 'If income or distance is a factor, explore financial aid or transport support.' },
        { icon: '🧠', title: 'Mental Health Check-in', text: 'Refer to the counsellor if the student shows signs of stress or disengagement.' },
        { icon: '✅', title: 'Weekly Progress Reports', text: 'Monitor assignment completion and study hours every week.' },
      ],
    },
    Medium: {
      icon: '⚠️',
      heading: 'Proactive Support Needed',
      sub: 'This student shows warning signs. Early intervention prevents escalation.',
      items: [
        { icon: '💬', title: 'Check-in Conversation', text: 'Have a friendly chat about study challenges and goals this month.' },
        { icon: '📅', title: 'Study Schedule Review', text: 'Help the student build a structured study timetable.' },
        { icon: '📝', title: 'Assignment Completion Follow-up', text: 'Ensure all pending work is submitted and backlogs are cleared.' },
        { icon: '🎯', title: 'Set Short-term Goals', text: 'Establish achievable academic milestones for the next 4 weeks.' },
        { icon: '🤝', title: 'Engagement Activities', text: 'Encourage participation in workshops or extracurricular activities.' },
      ],
    },
    Low: {
      icon: '✅',
      heading: 'Student Is On Track',
      sub: 'Low risk. Maintain regular check-ins to sustain performance.',
      items: [
        { icon: '🌟', title: 'Positive Reinforcement', text: 'Acknowledge the student\'s progress and encourage continued effort.' },
        { icon: '📊', title: 'Monthly Performance Review', text: 'Keep a brief monthly check-in to catch any early warning signs.' },
        { icon: '🚀', title: 'Challenge with Opportunities', text: 'Recommend advanced projects, competitions, or leadership roles.' },
        { icon: '🔁', title: 'Peer Mentoring', text: 'Consider using this student as a mentor for higher-risk peers.' },
      ],
    },
  };

  function renderRecommendation(s) {
    const level = norm(s.risk_level);
    const reco  = RECO_MAP[level] || RECO_MAP.Low;

    recoBannerIcon.textContent  = reco.icon;
    recoHeading.textContent     = reco.heading;
    recoSubheading.textContent  = reco.sub;
    recoBanner.className        = `reco-banner reco-banner-${level.toLowerCase()}`;

    recoList.innerHTML = reco.items.map((item, i) => `
      <div class="reco-item" style="animation-delay:${i*0.06}s">
        <div class="reco-item-icon">${item.icon}</div>
        <div class="reco-item-body">
          <div class="reco-item-title">${item.title}</div>
          <div class="reco-item-text">${item.text}</div>
        </div>
      </div>
    `).join('');
  }

  /* ══════════════════════════════════════════════
     NOTES  (localStorage)
  ══════════════════════════════════════════════ */
  function noteStorageKey(name) {
    return `eduguard_note_${mentorId}_${(name || '').replace(/\s+/g, '_')}`;
  }

  function getNoteLog(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
  }

  function saveNoteLog(key, arr) {
    localStorage.setItem(key, JSON.stringify(arr));
  }

  function renderNotes(s) {
    const key  = noteStorageKey(s.name);
    const logs = getNoteLog(key);

    // Current draft = last note's text as starting point (editable)
    notesTextarea.value = '';
    notesLog.innerHTML = '';

    if (logs.length === 0) {
      notesLog.innerHTML = `<p class="notes-empty">No previous notes for this student.</p>`;
      return;
    }

    notesLog.innerHTML = `<div class="notes-log-title">Previous Notes (${logs.length})</div>` +
      [...logs].reverse().map(entry => `
        <div class="note-entry">
          <div class="note-entry-meta">
            <span class="note-entry-date">${entry.date}</span>
          </div>
          <div class="note-entry-text">${esc(entry.text)}</div>
        </div>
      `).join('');
  }

  function saveNote() {
    if (!currentStudent) return;
    const text = notesTextarea.value.trim();
    if (!text) { showToast('ℹ️', 'Note is empty — nothing to save.', 'info'); return; }

    const key  = noteStorageKey(currentStudent.name);
    const logs = getNoteLog(key);
    logs.push({ date: fmtDate(new Date()), text });
    saveNoteLog(key, logs);

    notesTextarea.value = '';
    notesSavedLabel.textContent = 'Saved!';
    setTimeout(() => { notesSavedLabel.textContent = ''; }, 2500);
    renderNotes(currentStudent);
    updateNotesDot(currentStudent);
    showToast('📝', 'Note saved successfully.', 'success');
    // Refresh note indicator in table
    applyFilters();
  }

  function updateNotesDot(s) {
    const key  = noteStorageKey(s.name);
    const logs = getNoteLog(key);
    tabNotesDot.classList.toggle('hidden', logs.length === 0);
  }

  btnSaveNote.addEventListener('click', saveNote);
  notesTextarea.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveNote(); }
  });

  function fmtDate(d) {
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  /* ══════════════════════════════════════════════
     REFRESH PREDICTION
     ─────────────────────────────────────────────
     CONFIG: Set your prediction endpoint here.
     Leave as null to use auto-detection order.
  ══════════════════════════════════════════════ */
  const PREDICT_ENDPOINT = null; // e.g. '/api/predict' — set this to skip auto-detection

  // Ordered list of endpoints to try (first success wins)
  const PREDICT_ENDPOINT_CANDIDATES = [
    '/api/predict',
    '/api/mentor/refresh-prediction',
    '/api/students/refresh',
    '/api/ml/predict',
    '/predict',
  ];

  async function refreshPrediction(student, btn) {
    const originalHTML = btn.innerHTML;
    btn.disabled  = true;
    btn.innerHTML = `<i class="ph ph-spinner spin-icon"></i>`;

    // Build the request body with every available student field
    const body = {
      student_id:            student.id || student.student_id || undefined,
      name:                  student.name,
      attendance:            parseFloat(student.attendance)            || 0,
      marks:                 parseFloat(student.marks)                 || 0,
      study_hours:           parseFloat(student.study_hours)           || 0,
      distance_from_home:    parseFloat(student.distance_from_home)    || 0,
      annual_income:         parseFloat(student.annual_income)         || 0,
      previous_marks:        parseFloat(student.previous_marks)        || 0,
      backlogs:              parseFloat(student.backlogs)              || 0,
      assignments_completed: parseFloat(student.assignments_completed) || 0,
      participation:         parseFloat(student.participation)         || 0,
    };
    // Remove undefined keys
    Object.keys(body).forEach(k => body[k] === undefined && delete body[k]);

    const headers = { 'Content-Type': 'application/json' };
    const token   = sessionStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // ── If PREDICT_ENDPOINT is set manually, use it exclusively ──
    const endpoints = PREDICT_ENDPOINT
      ? [PREDICT_ENDPOINT]
      : PREDICT_ENDPOINT_CANDIDATES;

    let lastStatus = null;
    let lastBody   = null;
    let succeeded  = false;

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });

        lastStatus = res.status;

        // 404 / 501 = not found or not implemented — skip to local fallback
        if (res.status === 404 || res.status === 501) {
          console.info(`[Refresh] ${endpoint} → ${res.status} (not implemented), falling back to local recalculation`);
          lastStatus = res.status;
          break; // stop trying other endpoints, go straight to local fallback
        }

        // 401 = auth / session issue
        if (res.status === 401) {
          showToast('🔒', 'Session expired. Please log in again.', 'error');
          btn.disabled = false; btn.innerHTML = originalHTML;
          return;
        }

        // 405 = wrong HTTP method on this route
        if (res.status === 405) {
          console.warn(`[Refresh] ${endpoint} → 405 Method Not Allowed`);
          continue;
        }

        // Any other non-OK — read the real server error and show it
        if (!res.ok) {
          let errMsg = `Server returned ${res.status}`;
          try {
            const errData = await res.json();
            errMsg = errData?.message || errData?.error || errMsg;
          } catch (_) { /* ignore json parse error */ }
          console.error(`[Refresh] ${endpoint} → ${res.status}:`, errMsg);
          showToast('❌', `API error ${res.status}: ${errMsg}`, 'error');
          btn.disabled = false; btn.innerHTML = originalHTML;
          return;
        }

        // ── SUCCESS ──
        lastBody = await res.json();
        console.info(`[Refresh] ✅ Success via ${endpoint}`, lastBody);
        succeeded = true;
        break;

      } catch (networkErr) {
        // Network-level failure (CORS, no server, etc.)
        console.warn(`[Refresh] ${endpoint} → Network error:`, networkErr.message);
        lastStatus = 'network_error';
      }
    }

    // ── All endpoints failed / returned 501 — use local recalculation as fallback ──
    if (!succeeded) {
      if (lastStatus === 'network_error') {
        console.warn('[Refresh] All endpoints unreachable. Using local fallback.');
        showToast('⚠️', 'API unreachable — using local estimate.', 'info');
      } else if (lastStatus === 501) {
        console.warn('[Refresh] Prediction API not yet implemented (501). Using local recalculation.');
        showToast('🔄', 'Prediction recalculated locally (API not ready).', 'info');
      } else if (lastStatus === 404) {
        console.warn('[Refresh] No prediction endpoint found. Using local fallback.');
        showToast('ℹ️', 'No prediction API found — recalculating locally.', 'info');
      } else {
        showToast('🔄', 'Recalculated locally.', 'info');
      }

      // Local heuristic recalculation (mirrors common ML scoring logic)
      lastBody = localRecalculate(student);
    }

    // ── Apply result to student object ──
    applyPredictionResult(student, lastBody);

    // Sync back to allStudents array
    const idx = allStudents.findIndex(s => s === student || s.name === student.name);
    if (idx > -1) Object.assign(allStudents[idx], student);

    renderStats();
    renderCharts();
    applyFilters();

    // Refresh modal if it's open for this student
    if (currentStudent && currentStudent.name === student.name) {
      openModal(student);
    }

    if (succeeded) {
      showToast('🔄', `Prediction refreshed for ${student.name}.`, 'success');
    }

    btn.disabled  = false;
    btn.innerHTML = originalHTML;
  }

  /**
   * Map API response fields → student object.
   * Handles multiple possible response shapes from different backends.
   */
  function applyPredictionResult(student, data) {
    if (!data) return;

    // risk_percent / risk_pct / dropout_probability / probability / score
    const pct =
      data.risk_percent       ??
      data.risk_pct           ??
      data.dropout_probability ??
      data.probability        ??
      data.score              ??
      null;
    if (pct !== null) student.risk_percent = parseFloat(pct);

    // risk_level / level / category / risk_category
    const level =
      data.risk_level    ??
      data.level         ??
      data.category      ??
      data.risk_category ??
      null;
    if (level !== null) student.risk_level = level;

    // prediction / result / outcome / label
    const pred =
      data.prediction ??
      data.result     ??
      data.outcome    ??
      data.label      ??
      null;
    if (pred !== null) student.prediction = pred;

    // If we got a percent but no level, derive the level
    if (pct !== null && level === null) {
      const p = parseFloat(pct);
      student.risk_level = p >= 70 ? 'High' : p >= 40 ? 'Medium' : 'Low';
    }
  }

  /**
   * Local heuristic risk recalculation.
   * Used when no prediction API endpoint is available.
   * Mirrors typical ML feature weighting for dropout prediction.
   */
  function localRecalculate(s) {
    let score = 0;

    // Attendance (weight: 30) — below 75% is a major flag
    const att = parseFloat(s.attendance) || 0;
    score += att < 50 ? 30 : att < 60 ? 22 : att < 75 ? 14 : att < 85 ? 6 : 0;

    // Marks (weight: 25)
    const marks = parseFloat(s.marks) || 0;
    score += marks < 35 ? 25 : marks < 50 ? 18 : marks < 60 ? 10 : marks < 75 ? 4 : 0;

    // Backlogs (weight: 15)
    const bl = parseFloat(s.backlogs) || 0;
    score += bl >= 4 ? 15 : bl >= 2 ? 10 : bl >= 1 ? 5 : 0;

    // Study hours (weight: 10) — less than 2h/day is risky
    const hrs = parseFloat(s.study_hours) || 0;
    score += hrs < 1 ? 10 : hrs < 2 ? 7 : hrs < 3 ? 3 : 0;

    // Assignments completed (weight: 10) — out of 10
    const asgn = parseFloat(s.assignments_completed) || 0;
    score += asgn < 4 ? 10 : asgn < 6 ? 7 : asgn < 8 ? 3 : 0;

    // Participation (weight: 5) — out of 5
    const part = parseFloat(s.participation) || 0;
    score += part < 2 ? 5 : part < 3 ? 3 : 0;

    // Previous marks (weight: 5)
    const prev = parseFloat(s.previous_marks) || 0;
    score += prev < 40 ? 5 : prev < 55 ? 3 : 0;

    // Clamp to 0–100
    const riskPct   = Math.min(100, Math.max(0, score));
    const riskLevel = riskPct >= 65 ? 'High' : riskPct >= 35 ? 'Medium' : 'Low';
    const prediction = riskLevel === 'High'
      ? 'Likely Dropout'
      : riskLevel === 'Medium'
      ? 'Monitor Closely'
      : 'Likely to Retain';

    return { risk_percent: riskPct, risk_level: riskLevel, prediction };
  }

  // Modal refresh button
  modalRefreshBtn.addEventListener('click', () => {
    if (currentStudent) refreshPrediction(currentStudent, modalRefreshBtn);
  });

  // Refresh ALL button (navbar)
  refreshAllBtn.addEventListener('click', async () => {
    refreshAllBtn.disabled = true;
    refreshAllBtn.querySelector('i').classList.add('spin-icon');
    await fetchStudents(true);
    refreshAllBtn.disabled = false;
    refreshAllBtn.querySelector('i').classList.remove('spin-icon');
    showToast('🔄', 'Student data refreshed.', 'success');
  });

  /* ══════════════════════════════════════════════
     EXPORT CSV
  ══════════════════════════════════════════════ */
  exportBtn.addEventListener('click', () => {
    const rows = filteredStudents.length ? filteredStudents : allStudents;
    if (!rows.length) { showToast('ℹ️', 'No data to export.', 'info'); return; }

    const headers = [
      'Name','Attendance','Marks','Study Hours','Previous Marks',
      'Backlogs','Assignments Completed','Participation',
      'Distance from Home (km)','Annual Income (INR)',
      'Risk %','Risk Level','Prediction',
    ];

    const csvRows = [
      headers.join(','),
      ...rows.map(s => [
        csvCell(s.name),
        s.attendance ?? '',
        s.marks ?? '',
        s.study_hours ?? '',
        s.previous_marks ?? '',
        s.backlogs ?? '',
        s.assignments_completed ?? '',
        s.participation ?? '',
        s.distance_from_home ?? '',
        s.annual_income ?? '',
        parseFloat(s.risk_percent ?? 0).toFixed(1),
        norm(s.risk_level),
        csvCell(formatPred(s.prediction, norm(s.risk_level))),
      ].join(',')),
    ];

    const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `students_${mentorId}_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('📥', `Exported ${rows.length} records to CSV.`, 'success');
  });

  function csvCell(val) {
    const s = String(val ?? '').replace(/"/g, '""');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
  }

  /* ══════════════════════════════════════════════
     EVENT LISTENERS
  ══════════════════════════════════════════════ */
  searchInput.addEventListener('input', e => { searchQuery = e.target.value; applyFilters(); });

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.filter;
      filterBtns.forEach(b => b.className = 'filter-btn');
      const classMap = { all: 'active-all', High: 'active-high', Medium: 'active-medium', Low: 'active-low' };
      btn.classList.add(classMap[activeFilter] || 'active-all');
      applyFilters();
    });
  });

  logoutBtn.addEventListener('click', () => { sessionStorage.clear(); window.location.href = 'login.html'; });

  /* ══════════════════════════════════════════════
     UTILITY HELPERS
  ══════════════════════════════════════════════ */
  function norm(raw) {
    if (!raw) return 'Low';
    const s = String(raw).trim().toLowerCase();
    if (s === 'high')                  return 'High';
    if (s === 'medium' || s === 'med') return 'Medium';
    return 'Low';
  }

  function attendClass(pct) { return pct >= 75 ? 'good' : pct >= 50 ? 'avg' : 'poor'; }

  function initials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  function avatarStyle(name) {
    const hue = ((strHash(name || '?') % 360) + 360) % 360;
    return `background:hsl(${hue},42%,20%);color:hsl(${hue},70%,65%)`;
  }

  function strHash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
    return h;
  }

  function formatPred(pred, level) {
    if (pred) return String(pred).trim();
    return level === 'High' ? 'Likely Dropout' : level === 'Medium' ? 'Monitor Closely' : 'Likely to Retain';
  }

  function predClass(pred, level) {
    const p = (pred || '').toString().toLowerCase();
    if (p.includes('drop') || level === 'High')   return 'dropout';
    if (p.includes('monitor') || level === 'Medium') return 'monitor';
    return 'retain';
  }

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function clamp(v, min, max) {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : Math.min(max, Math.max(min, n));
  }

  /* ══════════════════════════════════════════════
     LOADING + TOAST
  ══════════════════════════════════════════════ */
  function showLoading(on) {
    if (on) { loadingOverlay.style.display = ''; loadingOverlay.classList.remove('fade-out'); }
    else    { loadingOverlay.classList.add('fade-out'); setTimeout(() => { loadingOverlay.style.display = 'none'; }, 420); }
  }

  let _toastTimer = null;
  function showToast(icon, msg, type = 'info') {
    const toast = $('toast');
    $('toast-icon').textContent = icon;
    $('toast-msg').textContent  = msg;
    toast.className = `toast ${type}`;
    void toast.offsetWidth;
    toast.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => toast.classList.remove('show'), 3600);
  }

  /* ══════════════════════════════════════════════
     KICK OFF
  ══════════════════════════════════════════════ */
  fetchStudents();
})();