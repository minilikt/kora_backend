const token = localStorage.getItem("flex_token");
if (!token) window.location.href = "login.html";

const planOverview = document.getElementById("planOverview");
const planContent = document.getElementById("planContent");
const modal = document.getElementById("exerciseModal");
const modalBody = document.getElementById("modalBody");

let activePlanData = null;

async function loadActivePlan() {
  try {
    const res = await fetch("/api/plans/active", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();

    if (json.status === "success" && json.data) {
      activePlanData = json.data;
      renderPlan(json.data);
    } else {
      planContent.innerHTML = `
                <div style="text-align: center; padding: 50px;">
                    <h3>No Active Plan Found</h3>
                    <p style="color: var(--text-dim);">Go to registration or your profile to generate a new workout plan.</p>
                </div>
            `;
    }
  } catch (err) {
    console.error("Fetch error:", err);
    planContent.innerHTML =
      '<div style="color: red; text-align: center; padding: 50px;">Failed to load plan. Check connection.</div>';
  }
}

function renderPlan(plan) {
  const { planJson, startDate, endDate } = plan;

  // Render Overview
  planOverview.innerHTML = `
        <div class="header-item">
            <span>Goal</span>
            <p>${planJson.input.goal}</p>
        </div>
        <div class="header-item">
            <span>Experience Level</span>
            <p>${planJson.input.level}</p>
        </div>
        <div class="header-item">
            <span>Active Period</span>
            <p>${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}</p>
        </div>
        <div class="header-item">
            <span>Frequency</span>
            <p>${planJson.input.days} Days / Week</p>
        </div>
    `;

  // Find Next Workout
  const nextSession = plan.sessions.find((s) => !s.completedStatus && !s.planned.rest);
  const nextWorkoutCTA = document.getElementById("nextWorkoutCTA");

  if (nextSession) {
    const sessionDetail = planJson.weeks
      .find((w) => w.week === nextSession.week)
      .sessions.find((s) => s.day === nextSession.dayNumber);

    nextWorkoutCTA.innerHTML = `
            <div class="cta-box">
                <h2>Next Session: Week ${nextSession.week} Day ${nextSession.dayNumber}</h2>
                <p style="color: var(--text-dim); margin-top: -10px;">${sessionDetail.focus.join(" & ")}</p>
                <button class="btn-start" onclick="startWorkout('${plan.id}', ${nextSession.week}, ${nextSession.dayNumber})">
                    ${nextSession.week === 1 && nextSession.dayNumber === 1 && !nextSession.startedAt ? "Start Plan" : "Resume Workout"}
                </button>
            </div>
        `;
  } else {
    nextWorkoutCTA.innerHTML = `
            <div class="cta-box" style="border-color: var(--accent);">
                <h2>🎉 Mesocycle Complete!</h2>
                <p style="color: var(--text-dim);">You've finished all sessions in this plan.</p>
                <a href="register.html" class="btn-start" style="background: var(--accent); color: white;">Generate New Plan</a>
            </div>
        `;
  }

  // Render Weeks
  let weeksHtml = "";
  planJson.weeks.forEach((week) => {
    weeksHtml += `
            <div class="week-container">
                <h2 class="week-title">Week ${week.week} <span style="font-size: 0.9rem; font-weight: 300; margin-left: auto; color: var(--text-dim);">${week.intensity * 100}% Intensity</span></h2>
                <div class="sessions-grid">
                    ${week.sessions.map((session) => renderSession(session, week.week, plan.sessions, planJson.exerciseLibrary)).join("")}
                </div>
            </div>
        `;
  });
  planContent.innerHTML = weeksHtml;
}

function renderSession(session, weekNumber, userSessions, library) {
  const userSession = userSessions.find(
    (s) => s.week === weekNumber && s.dayNumber === session.day,
  );
  const isCompleted = userSession?.completedStatus;

  if (session.rest) {
    return `
            <div class="session-card" style="opacity: 0.5;">
                <div class="session-header">
                    <h3>Day ${session.day}</h3>
                    <span class="session-focus">Rest Day</span>
                </div>
                <div class="exercise-list" style="padding: 30px; text-align: center; color: var(--text-dim); font-style: italic;">
                    Recovery is growth.
                </div>
            </div>
        `;
  }

  return `
        <div class="session-card ${isCompleted ? "completed" : ""}">
            <div class="session-header">
                <h3>Day ${session.day} ${isCompleted ? '<span class="completed-badge">Done</span>' : ""}</h3>
                <span class="session-focus">${session.focus.join(" & ")}</span>
            </div>
            <div class="exercise-list">
                ${session.exercises.map((ex) => renderExerciseItem(ex, library)).join("")}
            </div>
        </div>
    `;
}

function renderExerciseItem(ex, library) {
  const details = library[ex.exerciseId] || { name: "Unknown Exercise" };
  return `
        <div class="exercise-item" onclick="showExerciseDetails('${ex.exerciseId}')">
            <span class="exercise-name">${details.name}</span>
            <div class="exercise-meta">
                <span>${ex.sets} Sets</span>
                <span style="color: var(--primary);">${(ex.intensity || 0) * 100}% Load</span>
            </div>
        </div>
    `;
}

function showExerciseDetails(exerciseId) {
  if (!activePlanData) return;
  const details = activePlanData.planJson.exerciseLibrary[exerciseId];
  if (!details) return;

  modalBody.innerHTML = `
        <h2 class="exercise-detail-title">${details.name}</h2>
        
        ${details.gifUrl ? `<img src="${details.gifUrl}" class="exercise-gif" alt="${details.name}">` : `<div class="exercise-gif" style="display:flex; align-items:center; justify-content:center; color: var(--text-dim);">No visualization available</div>`}

        <div class="detail-section">
            <h4>Target Equipment</h4>
            <p>${details.equipment.join(", ") || "None specified"}</p>
        </div>

        <div class="detail-section">
            <h4>Instructions</h4>
            ${
              details.instructions && details.instructions.length > 0
                ? `<ol class="instruction-list">
                    ${details.instructions.map((step) => `<li>${step}</li>`).join("")}
                   </ol>`
                : '<p style="color: var(--text-dim);">No instructions provided.</p>'
            }
        </div>
    `;

  modal.style.display = "flex";
}

function startWorkout(planId, week, day) {
  window.location.href = `workout.html?planId=${planId}&week=${week}&day=${day}`;
}

loadActivePlan();
