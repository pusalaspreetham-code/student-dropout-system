// --- GLOBAL DATA & STATE ---
let s, p, risk;
let chartInstances = {}; // Track all active charts to prevent infinite growth

window.onload = () => {
    const rawData = localStorage.getItem("studentData");
    if (!rawData) return window.location.href = "index.html";
    
    const data = JSON.parse(rawData);
    s = data.student; 
    p = data.prediction; 
    risk = p.risk_percent;
    
    initializeDashboard();
};

/**
 * INITIALIZE DASHBOARD
 * strictly maps PostgreSQL data to Premium UI components
 * Fixes: Left Profile Card, System Status, and Date Formatting
 */
function initializeDashboard() {
    // 1. UPDATE LEFT PROFILE CARD & TOP BAR (Fixes '--' from your first image)
    const profileName = document.getElementById("p-name-main");
    const profileId = document.getElementById("p-id");
    const welcomeHeader = document.getElementById("welcome");
    
    if (profileName) profileName.innerText = s.name;
    if (profileId) profileId.innerText = s.admission_id || "ADM-PENDING";
    if (welcomeHeader) welcomeHeader.innerText = "✨ Welcome, " + s.name;

    // 2. RISK HERO SECTION (Overview Page)
    const riskVal = p.risk_percent;
    const riskElement = document.getElementById("risk");
    const bar = document.getElementById("bar");
    const levelText = document.getElementById("level");

    if (riskElement) riskElement.innerText = riskVal.toFixed(2) + "%";
    if (levelText) levelText.innerText = "STATUS: " + p.risk_level.toUpperCase();
    
    if (bar) {
        bar.style.width = riskVal + "%";
        // Premium Glow & Color Logic
        if (riskVal < 40) {
            bar.style.background = "linear-gradient(90deg, #10b981, #34d399)";
            bar.style.boxShadow = "0 0 15px rgba(16, 185, 129, 0.4)";
        } else if (riskVal < 70) {
            bar.style.background = "linear-gradient(90deg, #f59e0b, #fbbf24)";
            bar.style.boxShadow = "0 0 15px rgba(245, 158, 11, 0.4)";
        } else {
            bar.style.background = "linear-gradient(90deg, #ef4444, #f87171)";
            bar.style.boxShadow = "0 0 15px rgba(239, 68, 68, 0.4)";
        }
    }

    // 3. PREDICTIVE INSIGHTS MINI-CARDS (Fixes '--' from your second image)
    const miniRisk = document.getElementById("risk-mini");
    const miniStatus = document.getElementById("status-mini");
    
    if (miniRisk) miniRisk.innerText = riskVal.toFixed(2) + "%";
    
    if (miniStatus) {
        const currentLevel = p.risk_level ? p.risk_level.toUpperCase() : "OPTIMAL";
        miniStatus.innerText = currentLevel;
        
        // Color-coding the status text for a premium feel
        if (currentLevel === "HIGH") miniStatus.style.color = "#ef4444";
        else if (currentLevel === "MEDIUM") miniStatus.style.color = "#f59e0b";
        else miniStatus.style.color = "#10b981"; // Green for Low/Optimal
    }

    // 4. ACADEMIC DATA MAPPING (Academic Tab)
    const attendanceEl = document.getElementById("attendance");
    const marksEl = document.getElementById("marks");
    const backlogsEl = document.getElementById("backlogs");

    if (attendanceEl) attendanceEl.innerText = s.attendance + "%";
    if (marksEl) marksEl.innerText = s.marks;
    if (backlogsEl) backlogsEl.innerText = s.backlogs;

    // 5. IDENTITY LEDGER (Profile Tab - Premium Grid)
    const container = document.getElementById("db-details");
    if (container) {
        container.innerHTML = ""; // Clear existing
        
        // Hide these because they are already on the Left Profile Card or are sensitive
        const hiddenKeys = ['password', 'id', 'name', 'admission_id']; 

        Object.entries(s).forEach(([key, value]) => {
            if (!hiddenKeys.includes(key.toLowerCase())) {
                const label = key.replace(/_/g, ' ').toUpperCase();
                
                // --- PREMIUM DATE FORMATTING ---
                let displayValue = value;
                if ((key.toLowerCase().includes('date') || key.toLowerCase() === 'dob') && value) {
                    const dateObj = new Date(value);
                    displayValue = dateObj.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                    });
                }

                container.innerHTML += `
                    <div style="padding: 15px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.03); border-radius: 12px;">
                        <p style="color: var(--text-dim); font-size: 9px; letter-spacing: 1px; margin: 0 0 5px 0;">${label}</p>
                        <b style="font-size: 14px; color: var(--text-main);">${displayValue || 'N/A'}</b>
                    </div>
                `;
            }
        });
    }

    // 6. AI ADVISORY TIP (Overview Page)
    const tipElement = document.getElementById("ai-tip");
    if (tipElement) {
        if (riskVal > 60) {
            tipElement.innerHTML = `⚠️ <b style="color:#ef4444">Risk Alert:</b> Neural assessment indicates high dropout risk. Focus on your <b>${s.backlogs} backlogs</b>.`;
        } else {
            tipElement.innerHTML = `✅ <b>System Optimal:</b> Your attendance of <b>${s.attendance}%</b> is maintaining a stable academic profile.`;
        }
    }
}
// --- NAVIGATION & VIEW SWITCHING ---
function showView(viewId, menuItem) {
    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    
    document.getElementById(viewId).classList.add('active');
    menuItem.classList.add('active');

    // Trigger Charts with delay to allow CSS layout to settle
    if (viewId === 'analytics') {
        setTimeout(renderPremiumCharts, 150);
    }
}

// --- PREMIUM VISUALIZATIONS ---
function renderPremiumCharts() {
    // STEP 1: DESTROY OLD CHARTS (Fixes Infinite Scrolling & Errors)
    Object.values(chartInstances).forEach(instance => instance.destroy());

    // STEP 2: STYLING DEFAULTS
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";

    const commonOptions = { 
        responsive: true, 
        maintainAspectRatio: false, // CRITICAL: Fixes infinite height bug
        plugins: { legend: { display: false } } 
    };

    // 1. LINE CHART: Trajectory
    const lineCtx = document.getElementById("lineChart").getContext('2d');
    const grad = lineCtx.createLinearGradient(0, 0, 0, 300);
    grad.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
    grad.addColorStop(1, 'rgba(99, 102, 241, 0)');

    chartInstances.line = new Chart(lineCtx, {
        type: "line",
        data: {
            labels: ["Week 1", "Week 2", "Week 3", "Current"],
            datasets: [{ 
                data: [65, 72, 68, s.marks], 
                borderColor: "#6366f1", 
                backgroundColor: grad, 
                fill: true, 
                tension: 0.4,
                borderWidth: 3,
                pointRadius: 4
            }]
        },
        options: {
            ...commonOptions,
            scales: { y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.03)' } }, x: { grid: { display: false } } }
        }
    });

    // 2. RADAR CHART: Attribute Shape
    chartInstances.radar = new Chart(document.getElementById("radarChart"), {
        type: "radar",
        data: {
            labels: ["Attendance", "Marks", "Study Hours", "Engagement", "Consistency"],
            datasets: [{ 
                data: [s.attendance, s.marks, s.study_hours*10, 85, 70], 
                backgroundColor: "rgba(56, 189, 248, 0.2)", 
                borderColor: "#38bdf8",
                borderWidth: 2 
            }]
        },
        options: { 
            ...commonOptions, 
            scales: { r: { grid: { color: "rgba(255,255,255,0.1)" }, ticks: { display: false }, angleLines: { color: "rgba(255,255,255,0.1)" } } } 
        }
    });

    // 3. SEMI-CIRCLE GAUGE: Stability
    chartInstances.gauge = new Chart(document.getElementById("gauge1"), {
        type: 'doughnut',
        data: { datasets: [{ data: [88, 12], backgroundColor: ['#10b981', '#0f172a'], borderWidth: 0, borderRadius: 10 }] },
        options: { rotation: -90, circumference: 180, cutout: '85%', ...commonOptions }
    });
}

// --- CHATBOT LOGIC ---
async function sendMessage() {
    const input = document.getElementById("user-msg");
    const chatBox = document.getElementById("chat-box");
    const text = input.value.trim();
    if (!text) return;

    // User Bubble
    chatBox.innerHTML += `<div class="user-msg-bubble">${text}</div>`;
    input.value = "";
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const res = await fetch("http://localhost:3000/api/chat", {
            method: "POST", 
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                admission_id: s.admission_id, 
                message: text, 
                risk_percent: risk, 
                risk_level: p.risk_level 
            })
        });
        const result = await res.json();
        
        // Bot Bubble
        chatBox.innerHTML += `<div class="bot-msg-bubble">${result.reply}</div>`;
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (e) {
        console.error("Chat Failed:", e);
    }
}

function toggleChat() {
    const chatWindow = document.getElementById("chat-window");
    const chatBox = document.getElementById("chat-box");
    
    if (chatWindow.style.display === "none" || chatWindow.style.display === "") {
        chatWindow.style.display = "flex";
        
        // --- AUTO-GREETING LOGIC ---
        // Only show the greeting if the chat box is empty (first time opening)
        if (chatBox.innerHTML.trim() === "") {
            const firstName = s.name.split(' ')[0]; // Gets just "Aarav"
            chatBox.innerHTML = `
                <div style="align-self: flex-start; background: rgba(99, 102, 241, 0.1); padding: 15px; border-radius: 15px 15px 15px 4px; max-width: 85%; font-size: 13px; color: #cbd5e1; border: 1px solid rgba(99, 102, 241, 0.2); line-height: 1.5;">
                    👋 Hello <b>${firstName}</b>! I am your <b>Personal AI Counselor</b>. <br><br>
                    I have analyzed your current academic vectors and risk levels. How can I assist you with your studies or career planning today?
                </div>
            `;
        }
    } else {
        chatWindow.style.display = "none";
    }
}

function logout() { localStorage.clear(); window.location.href = "index.html"; }