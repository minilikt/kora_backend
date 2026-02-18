const token = localStorage.getItem("flex_token");
if (!token) window.location.href = "login.html";

const exerciseContent = document.getElementById("exerciseContent");
const loadingIndicator = document.getElementById("loading");

let activePlanData = null;

async function loadExercises() {
  try {
    const res = await fetch("/api/plans/active", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();

    if (json.status === "success" && json.data) {
      activePlanData = json.data;
      renderDailyFeed(json.data);
      loadingIndicator.style.display = "none";
    } else {
      exerciseContent.innerHTML =
        '<p style="text-align: center; padding: 50px;">No active plan data found.</p>';
      loadingIndicator.style.display = "none";
    }
  } catch (err) {
    console.error("Fetch error:", err);
    exerciseContent.innerHTML =
      '<p style="color: red; text-align: center;">Failed to sync plan data.</p>';
    loadingIndicator.style.display = "none";
  }
}

function renderDailyFeed(plan) {
  const { planJson, sessions } = plan;
  const nextSession = sessions.find((s) => !s.completedStatus && !s.planned.rest);

  let html = "";
  planJson.weeks.forEach((week) => {
    week.sessions.forEach((session) => {
      const isCurrent =
        nextSession &&
        nextSession.week === week.week &&
        nextSession.dayNumber === session.day;

      html += `
                <div class="day-section ${isCurrent ? "current-day" : ""}">
                    <div class="day-header">
                        <div class="day-title">
                            Week ${week.week} Day ${session.day}
                            ${isCurrent ? '<span class="current-badge">Today\'s Objective</span>' : ""}
                        </div>
                        <div class="day-focus">${session.rest ? "Rest & Recovery" : session.focus.join(" & ")}</div>
                    </div>

                    ${
                      session.rest
                        ? '<div class="rest-day">Active recovery or total rest recommended.</div>'
                        : `
                        <div class="exercise-list">
                            ${session.exercises
                              .map((ex) => {
                                const details = planJson.exerciseLibrary[ex.exerciseId] || { name: "Unknown" };
                                return `
                                    <div class="exercise-row">
                                        <span class="ex-name">${details.name}</span>
                                        <span class="ex-sets">${ex.sets} Sets</span>
                                        <span class="ex-intensity">${ex.intensity * 100}% Load</span>
                                    </div>
                                `;
                              })
                              .join("")}
                        </div>
                    `
                    }

                    <button class="json-toggle" onclick="toggleJson(${week.week}, ${session.day})">
                        { } View Day Schema
                    </button>
                    <div class="json-view" id="json-${week.week}-${session.day}">
                        ${JSON.stringify(session, null, 2)}
                    </div>
                </div>
            `;
    });
  });

  exerciseContent.innerHTML = html;
}

window.toggleJson = (week, day) => {
  const el = document.getElementById(`json-${week}-${day}`);
  if (el.style.display === "block") {
    el.style.display = "none";
  } else {
    el.style.display = "block";
  }
};

loadExercises();
