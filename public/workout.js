const token = localStorage.getItem("flex_token");
if (!token) window.location.href = "login.html";

const urlParams = new URLSearchParams(window.location.search);
const planId = urlParams.get("planId");
const week = parseInt(urlParams.get("week"));
const day = parseInt(urlParams.get("day"));

if (!planId || isNaN(week) || isNaN(day)) {
  alert("Invalid session parameters.");
  window.location.href = "plan.html";
}

const workoutContainer = document.getElementById("workoutContainer");
const sessionTitle = document.getElementById("sessionTitle");
const timerDisplay = document.getElementById("sessionTimer");
const loadingOverlay = document.getElementById("loading");
const finishBtn = document.getElementById("finishWorkoutBtn");

let activeSession = null;
let startTime = new Date();
let timerInterval = null;

// Timer Logic
function startTimer() {
  timerInterval = setInterval(() => {
    const now = new Date();
    const diff = Math.floor((now - startTime) / 1000);
    const m = Math.floor(diff / 60)
      .toString()
      .padStart(2, "0");
    const s = (diff % 60).toString().padStart(2, "0");
    timerDisplay.innerText = `${m}:${s}`;
  }, 1000);
}

async function initSession() {
  try {
    const res = await fetch("/api/plans/active", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();

    if (json.status === "success" && json.data) {
      const plan = json.data;
      const weekData = plan.planJson.weeks.find((w) => w.week === week);
      const sessionData = weekData.sessions.find((s) => s.day === day);

      if (!sessionData || sessionData.rest) {
        alert("This is a rest day!");
        window.location.href = "plan.html";
        return;
      }

      activeSession = {
        ...sessionData,
        library: plan.planJson.exerciseLibrary,
      };
      sessionTitle.innerText = `Week ${week} Day ${day} - ${activeSession.focus.join(" & ")}`;
      renderWorkout(activeSession);
      loadingOverlay.style.display = "none";
      startTimer();
    }
  } catch (err) {
    console.error("Init error:", err);
    alert("Failed to load session data.");
  }
}

function renderWorkout(session) {
  workoutContainer.innerHTML = session.exercises
    .map((ex, exIndex) => {
      const details = session.library[ex.exerciseId] || { name: "Exercise" };
      return `
            <div class="exercise-card" data-exercise-id="${ex.exerciseId}">
                <div class="exercise-header">
                    <h3 class="exercise-name">${details.name}</h3>
                    <p class="exercise-target">${ex.sets} Sets • Target: ${ex.intensity * 100}% Load</p>
                </div>
                <div class="sets-container" id="sets-${exIndex}">
                    ${Array.from({ length: ex.sets })
                      .map((_, setIndex) => renderSetRow(exIndex, setIndex))
                      .join("")}
                </div>
                <button class="btn-add-set" onclick="addSet(${exIndex})">+ Add Set</button>
            </div>
        `;
    })
    .join("");
}

function renderSetRow(exIndex, setIndex) {
  return `
        <div class="set-row" id="row-${exIndex}-${setIndex}">
            <div class="set-label">${setIndex + 1}</div>
            <div class="input-group">
                <span>Weight (kg)</span>
                <input type="number" class="weight-input" value="0" step="0.5">
            </div>
            <div class="input-group">
                <span>Reps</span>
                <input type="number" class="reps-input" value="0">
            </div>
            <div class="input-group">
                <span>RPE</span>
                <input type="number" class="rpe-input" value="8" min="1" max="10" step="0.5">
            </div>
            <button class="btn-remove-set" onclick="removeRow(${exIndex}, ${setIndex})">×</button>
        </div>
    `;
}

window.addSet = (exIndex) => {
  const container = document.getElementById(`sets-${exIndex}`);
  const nextIndex = container.children.length;
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = renderSetRow(exIndex, nextIndex);
  container.appendChild(tempDiv.firstElementChild);
};

window.removeRow = (exIndex, setIndex) => {
  const row = document.getElementById(`row-${exIndex}-${setIndex}`);
  if (row) row.remove();
};

finishBtn.onclick = async () => {
  const endTime = new Date();
  const payload = {
    planId: planId,
    week: week,
    day: day,
    startedAt: startTime.toISOString(),
    completedAt: endTime.toISOString(),
    notes: document.getElementById("sessionNotes").value,
    exercises: [],
  };

  const cards = document.querySelectorAll(".exercise-card");
  cards.forEach((card) => {
    const exerciseId = card.dataset.exerciseId;
    const sets = [];
    const rows = card.querySelectorAll(".set-row");

    rows.forEach((row, index) => {
      sets.push({
        setIndex: index,
        weight: parseFloat(row.querySelector(".weight-input").value) || 0,
        reps: parseInt(row.querySelector(".reps-input").value) || 0,
        rpe: parseFloat(row.querySelector(".rpe-input").value) || 0,
      });
    });

    if (sets.length > 0) {
      payload.exercises.push({
        exerciseId: exerciseId,
        sets: sets,
      });
    }
  });

  console.log("📤 Submitting Session Payload:", payload);

  try {
    finishBtn.disabled = true;
    finishBtn.innerText = "Saving...";

    const res = await fetch("/api/sessions/complete", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (json.status === "success") {
      alert("Workout Completed! Great job.");
      window.location.href = "dashboard.html";
    } else {
      alert("Error saving workout: " + (json.message || "Unknown error"));
      finishBtn.disabled = false;
      finishBtn.innerText = "Finish";
    }
  } catch (err) {
    console.error("Submission error:", err);
    alert("Connection error while saving session.");
    finishBtn.disabled = false;
    finishBtn.innerText = "Finish";
  }
};

initSession();
