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
    const exerciseContainer = document.getElementById("exercise-container");
    const settingsContainer = document.getElementById("settings-container");

    document.getElementById("home-button").addEventListener('click', () => {

        if(exerciseContainer.classList.contains('d-none')){
            exerciseContainer.classList.remove('d-none');
        }
        if(!settingsContainer.classList.contains('d-none')){
            settingsContainer.classList.add('d-none');
        }
        document.getElementById("exercise-name").value = "";

        document.getElementById("exercise-form").reset();

        setsContainer.innerHTML = ``;
        currentlyEditing = null;
        const suggestionsList = document.getElementById("suggestions-list");
        if (suggestionsList) suggestionsList.style.display = "none";

        listWorkoutDates();
    });
    document.getElementById("settings-button").addEventListener('click', ()=> {
        if(!exerciseContainer.classList.contains('d-none')){
            exerciseContainer.classList.add('d-none');
        }
        if(settingsContainer.classList.contains('d-none')){
            settingsContainer.classList.remove('d-none');
        }
    });
    document.getElementById("export-button").addEventListener('click', exportExerciseHistory);
    document.getElementById("import-button").addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                if (confirm("This will overwrite your current history. Continue?")) {
                    saveHistory(data);
                    alert('Exercise history imported successfully!');
                }
            } catch (err) {
                alert('Invalid JSON file');
            }
            input.value = "";
        };
        reader.readAsText(file);
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
        container.innerHTML = "<h3>Workout Days</h3>";

        if (sortedDates.length === 0) {
            container.innerHTML += "<p>No workouts recorded yet.</p>";
            return;
        }

        const table = document.createElement("table");
        const tbody = document.createElement("tbody");

        sortedDates.forEach(date => {
            const tr = document.createElement("tr");
            tr.style.cursor = "pointer";

            const iconTd = document.createElement("td");
            iconTd.textContent = "🔎";
            tr.appendChild(iconTd);

            const dateTd = document.createElement("td");
            dateTd.textContent = new Date(date).toDateString();
            tr.appendChild(dateTd);

            tr.addEventListener("click", () => showWorkoutsForDate(dateToWorkouts[date], date));

            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        container.appendChild(table);
    }

    function showWorkoutsForDate(workouts, dateKey) {
        const container = document.getElementById("history-entries");
        container.innerHTML = `<h3>Workouts on ${new Date(dateKey).toDateString()}</h3>`;

        const table = document.createElement("table");
        const tbody = document.createElement("tbody");

        workouts.forEach(({ exercise, sessionIndex, session }) => {
            const tr = document.createElement("tr");
            tr.style.cursor = "pointer";

            const iconTd = document.createElement("td");
            iconTd.textContent = "✏️";
            tr.appendChild(iconTd);

            const exerciseTd = document.createElement("td");
            exerciseTd.textContent = `${exercise} (${session.sets.length} sets)`;
            tr.appendChild(exerciseTd);

            tr.addEventListener("click", () => {
                loadSessionForEditing(exercise, sessionIndex);
            });

            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        container.appendChild(table);
    }

    function loadSessionForEditing(exercise, sessionIndex) {
        const history = getHistory();
        const session = history[exercise][sessionIndex];

        currentlyEditing = { exercise, sessionIndex };

        const exerciseInput = document.getElementById("exercise-name");
        exerciseInput.value = exercise;

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

        const reversedSessions = [...recentSessions].reverse();

        const table = document.createElement("table");

        const headerRow = document.createElement("tr");
        ["Date", "Set #", "Weight (kg)", "Reps", "Effort", "Actions"].forEach(text => {
            const th = document.createElement("th");
            th.textContent = text;
            headerRow.appendChild(th);
        });
        table.appendChild(headerRow);

        reversedSessions.forEach((session, i) => {
            const sessionIndex = sessions.length - 1 - i;
            const date = new Date(session.date);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = String(date.getFullYear()).slice(-2);

            const dateStr = `${day}.${month}.${year}`;
            const setCount = session.sets.length;

            session.sets.forEach((set, setIndex) => {
                const row = document.createElement("tr");
                if (setIndex === setCount - 1) {
                    row.style.borderBottom = "2px solid #ccc";
                }
                if (setIndex === 0) {
                    const dateCell = document.createElement("td");
                    dateCell.textContent = dateStr;
                    dateCell.rowSpan = setCount;
                    dateCell.classList.add("date-cell");
                    row.appendChild(dateCell);
                }

                const setNumCell = document.createElement("td");
                setNumCell.textContent = setIndex + 1;
                row.appendChild(setNumCell);

                const weightCell = document.createElement("td");
                weightCell.textContent = set.weight;
                row.appendChild(weightCell);

                const repsCell = document.createElement("td");
                repsCell.textContent = set.reps;
                row.appendChild(repsCell);

                const effortCell = document.createElement("td");

                const emojiMap = {
                    easy: { icon: "easy-smiley.svg", class: "effort-easy" },
                    moderate: { icon: "moderate-smiley.svg", class: "effort-moderate" },
                    challenging: { icon: "challenging-smiley.svg", class: "effort-challenging" }
                };

                const img = document.createElement("img");
                img.src = `img/`+emojiMap[set.effort.toLowerCase()].icon;
                img.className = `effort-icon ${emojiMap[set.effort.toLowerCase()].class}`;
                effortCell.appendChild(img);
                row.appendChild(effortCell);

                if (setIndex === 0) {
                    const actionCell = document.createElement("td");
                    actionCell.rowSpan = setCount;

                    const editBtn = document.createElement("button");
                    editBtn.textContent = "✏️";
                    editBtn.addEventListener("click", () => {
                        loadSessionForEditing(exercise, sessionIndex);
                    });
                    actionCell.appendChild(editBtn);
                    row.appendChild(actionCell);
                }

                table.appendChild(row);
            });
        });

        historyContainer.appendChild(table);
    }

    function exportExerciseHistory() {
        const data = getHistory();
        const json = JSON.stringify(data, null, 2);

        if (window.cordova && cordova.platformId !== 'browser') {
            // Native Cordova export (Android/iOS)
            const blob = new Blob([json], { type: 'application/json' });

            window.resolveLocalFileSystemURL(cordova.file.externalDataDirectory, function (dirEntry) {
                dirEntry.getFile("exerciseHistory.json", { create: true }, function (fileEntry) {
                    fileEntry.createWriter(function (fileWriter) {
                        fileWriter.write(blob);
                        fileWriter.onwriteend = function () {
                            alert("Exported to device successfully!");
                        };
                        fileWriter.onerror = function (e) {
                            alert("Failed to write file: " + e.toString());
                        };
                    });
                });
            }, function (err) {
                alert("Failed to access file system: " + err.toString());
            });
        } else {
            // Browser-compatible export
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = 'exerciseHistory.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            URL.revokeObjectURL(url);
        }
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
      <label class="remove-label">Remove Set<br><button type="button" class="remove-set">❌</button></label>
    `;

        const removeBtn = setDiv.querySelector(".remove-set");
        removeBtn.addEventListener("click", () => {
            const confirmed = confirm("Are you sure you want to remove this set?");
            if (confirmed) {
                setDiv.remove();
            }
        });

        return setDiv;
    }

    addSetBtn.addEventListener("click", () => {
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

        setsContainer.innerHTML = ``;
    });

    exerciseInput.addEventListener("blur", () => {
        const exercise = exerciseInput.value.trim();
        if (exercise) renderHistory(exercise);
    });
});
