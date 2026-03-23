const data = JSON.parse(localStorage.getItem("studentData"));

const s = data.student;
const p = data.prediction;

document.getElementById("welcome").innerText =
    "Welcome, " + s.name;

// Top stats
document.getElementById("attendance").innerText = s.attendance;
document.getElementById("marks").innerText = s.marks;
document.getElementById("study").innerText = s.study_hours;
document.getElementById("backlogs").innerText = s.backlogs;

// Risk
const risk = p.risk_percent;

document.getElementById("risk").innerText =
    "Risk: " + risk.toFixed(2) + "%";

document.getElementById("level").innerText =
    "Level: " + p.risk_level;

// Progress bar
const bar = document.getElementById("bar");
bar.style.width = risk + "%";

if (risk < 40) bar.style.background = "#22c55e";
else if (risk < 70) bar.style.background = "#f59e0b";
else bar.style.background = "#ef4444";

// PIE CHART
new Chart(document.getElementById("pieChart"), {
    type: "doughnut",
    data: {
        labels: ["Risk", "Safe"],
        datasets: [{
            data: [risk, 100 - risk],
            backgroundColor: ["#ef4444", "#22c55e"]
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false
    }
});

// BAR CHART
new Chart(document.getElementById("barChart"), {
    type: "bar",
    data: {
        labels: ["Marks", "Attendance", "Study"],
        datasets: [{
            label: "Performance",
            data: [
                s.marks,
                s.attendance,
                s.study_hours * 10
            ],
            backgroundColor: "#3b82f6"
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false
    }
});

function logout() {
    localStorage.removeItem("studentData");
    window.location.href = "index.html";
}