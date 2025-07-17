document.addEventListener('deviceready', function () {
    const MAX_HISTORY = 4;
    const STORAGE_KEY = "exerciseHistory";

    const form = document.getElementById("exercise-form");
    const setsContainer = document.getElementById("sets-container");
    const addSetBtn = document.getElementById("add-set");
    const historyContainer = document.getElementById("history-entries");
    const exerciseInput = document.getElementById("exercise-name");
    const suggestionsList = document.getElementById("suggestions-list");
    let currentlyEditing = null; // { exercise, sessionIndex }

    document.getElementById("home-button").addEventListener('click', () => {
        document.getElementById("exercise-name").value = "";

        document.getElementById("exercise-form").reset();

        const setsContainer = document.getElementById("sets-container");
        setsContainer.innerHTML = ``;
        setsContainer.appendChild(createSetEntry());
        currentlyEditing = null;
        const suggestionsList = document.getElementById("suggestions-list");
        if (suggestionsList) suggestionsList.style.display = "none";

        listWorkoutDates();
    });

    listWorkoutDates();


    function getExerciseSuggestions(prefix) {
        const history = getHistory();
        const lowerPrefix = prefix.toLowerCase();

        if (!lowerPrefix) {
            // Return most frequently used exercises when no prefix
            const ranked = Object.entries(history)
                .map(([exercise, sessions]) => ({
                    exercise,
                    count: sessions.length,
                }))
                .sort((a, b) => b.count - a.count);

            return ranked.map(e => e.exercise);
        }

        // Otherwise, filter by prefix and sort by last usage date
        const matchedExercises = Object.entries(history)
            .filter(([exercise]) => exercise.toLowerCase().startsWith(lowerPrefix))
            .map(([exercise, sessions]) => {
                const lastDate = sessions.reduce(
                    (max, s) => s.date > max ? s.date : max,
                    '1970-01-01T00:00:00Z'
                );
                return { exercise, lastDate };
            })
            .sort((a, b) => b.lastDate.localeCompare(a.lastDate));

        return matchedExercises.map(e => e.exercise);
    }


    function listWorkoutDates() {
        const history = getHistory();
        const dateToWorkouts = {};

        // Build a mapping of date → [{exercise, session}]
        Object.entries(history).forEach(([exercise, sessions]) => {
            sessions.forEach((session, index) => {
                const dateKey = session.date.split("T")[0];
                if (!dateToWorkouts[dateKey]) dateToWorkouts[dateKey] = [];
                dateToWorkouts[dateKey].push({ exercise, sessionIndex: index, session });
            });
        });

        const sortedDates = Object.keys(dateToWorkouts).sort((a, b) => b.localeCompare(a));

        const container = document.getElementById("history-entries");
        container.innerHTML = "<h2>Workout Dates</h2>";

        if (sortedDates.length === 0) {
            container.innerHTML += "<p>No workouts recorded yet.</p>";
            return;
        }

        const ul = document.createElement("ul");
        sortedDates.forEach(date => {
            const li = document.createElement("li");
            li.style.cursor = "pointer";
            li.textContent = new Date(date).toDateString();
            li.addEventListener("click", () => showWorkoutsForDate(dateToWorkouts[date], date));
            ul.appendChild(li);
        });

        container.appendChild(ul);
    }

    function showWorkoutsForDate(workouts, dateKey) {
        const container = document.getElementById("history-entries");
        container.innerHTML = `<h2>Workouts on ${new Date(dateKey).toDateString()}</h2>`;

        const ul = document.createElement("ul");

        workouts.forEach(({ exercise, sessionIndex, session }) => {
            const li = document.createElement("li");
            li.style.cursor = "pointer";
            li.textContent = `${exercise} (${session.sets.length} sets)`;

            li.addEventListener("click", () => {
                loadSessionForEditing(exercise, sessionIndex);
            });

            ul.appendChild(li);
        });

        container.appendChild(ul);
    }

    function loadSessionForEditing(exercise, sessionIndex) {
        const history = getHistory();
        const session = history[exercise][sessionIndex];

        currentlyEditing = { exercise, sessionIndex };

        const exerciseInput = document.getElementById("exercise-name");
        exerciseInput.value = exercise;

        const setsContainer = document.getElementById("sets-container");
        setsContainer.innerHTML = "";

        session.sets.forEach(set => {
            setsContainer.appendChild(createSetEntry(set));
        });
    }

    function renderSuggestions(list) {
        suggestionsList.innerHTML = '';
        if (list.length === 0) {
            suggestionsList.style.display = 'none';
            return;
        }
        list.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            li.style.padding = '5px 10px';
            li.style.cursor = 'pointer';

            li.addEventListener('mousedown', (e) => {
                e.preventDefault();
                exerciseInput.value = item;
                renderHistory(item);
                suggestionsList.style.display = 'none';
            });

            suggestionsList.appendChild(li);
        });
        suggestionsList.style.display = 'block';
    }

    exerciseInput.addEventListener('input', () => {
        const val = exerciseInput.value.trim();
        const firstWord = val.split(/\s+/)[0];
        const suggestions = getExerciseSuggestions(firstWord);
        renderSuggestions(suggestions);
    });
    exerciseInput.addEventListener('focus', () => {
        const suggestions = getExerciseSuggestions('');
        renderSuggestions(suggestions);
    });

    exerciseInput.addEventListener('blur', () => {
        setTimeout(() => {
            suggestionsList.style.display = 'none';
        }, 150); // slight delay so click can register
    });


    function getHistory() {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    }

    function saveHistory(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    function renderHistory(exercise) {
        const history = getHistory();
        const sessions = history[exercise] || [];

        const recentSessions = sessions.slice(-MAX_HISTORY);
        const offset = sessions.length - recentSessions.length;

        historyContainer.innerHTML = '';

        if (!recentSessions.length) {
            historyContainer.innerHTML = '<p>No history yet for this exercise.</p>';
            return;
        }

        recentSessions.forEach((session, i) => {
            const sessionIndex = i + offset;
            const div = document.createElement("div");

            const date = new Date(session.date).toLocaleString();
            const header = document.createElement("strong");
            header.textContent = date;
            div.appendChild(header);
            div.appendChild(document.createElement("br"));

            session.sets.forEach(set => {
                const p = document.createElement("p");
                p.innerHTML = `Weight: ${set.weight}kg, Reps: ${set.reps}, Effort: ${set.effort}`;
                div.appendChild(p);
            });

            const editBtn = document.createElement("button");
            editBtn.textContent = "Edit";
            editBtn.addEventListener("click", () => {
                loadSessionForEditing(exercise, sessionIndex);
            });
            div.appendChild(editBtn);

            const hr = document.createElement("hr");
            div.appendChild(hr);

            historyContainer.appendChild(div);
        });
    }

    function createSetEntry(set = { weight: '', reps: '', effort: 'easy' }) {
        const setDiv = document.createElement("div");
        setDiv.classList.add("set-entry");

        setDiv.innerHTML = `
      <label>Weight (kg): <input type="number" class="weight" value="${set.weight}" required></label>
      <label>Reps: <input type="number" class="reps" value="${set.reps}" required></label>
      <label>
        Effort:
        <select class="effort">
          <option value="easy" ${set.effort === "easy" ? "selected" : ""}>Easy</option>
          <option value="moderate" ${set.effort === "moderate" ? "selected" : ""}>Moderate</option>
          <option value="challenging" ${set.effort === "challenging" ? "selected" : ""}>Challenging</option>
        </select>
      </label>
      <label>Remove Set<button type="button" class="remove-set">❌</button></label>
    `;

        const removeBtn = setDiv.querySelector(".remove-set");
        removeBtn.addEventListener("click", () => {
            setDiv.remove();
        });

        return setDiv;
    }



    addSetBtn.addEventListener("click", () => {
        const setsContainer = document.getElementById("sets-container");
        setsContainer.appendChild(createSetEntry());
    });

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const exercise = exerciseInput.value.trim();
        if (!exercise) return;

        const setElements = setsContainer.querySelectorAll(".set-entry");
        const sets = [];

        setElements.forEach(entry => {
            const weight = parseFloat(entry.querySelector(".weight").value);
            const reps = parseInt(entry.querySelector(".reps").value, 10);
            const effort = entry.querySelector(".effort").value;

            if (!isNaN(weight) && !isNaN(reps)) {
                sets.push({ weight, reps, effort });
            }
        });

        if (sets.length === 0) return;

        const history = getHistory();

        if (!history[exercise]) {
            history[exercise] = [];
        }

        const newSession = {
            date: new Date().toISOString(),
            sets
        };

        if (
            currentlyEditing &&
            currentlyEditing.exercise === exercise &&
            history[exercise][currentlyEditing.sessionIndex]
        ) {
            history[exercise][currentlyEditing.sessionIndex] = newSession;
        } else {
            history[exercise].push(newSession);
        }

        saveHistory(history);
        renderHistory(exercise);
        form.reset();
        currentlyEditing = null;

        setsContainer.appendChild(createSetEntry());
    });

    exerciseInput.addEventListener("blur", () => {
        const exercise = exerciseInput.value.trim();
        if (exercise) renderHistory(exercise);
    });
});
