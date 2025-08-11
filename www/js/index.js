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
        setActiveTab("home-button");

        document.getElementById("exercise-name").value = "";

        document.getElementById("exercise-form").reset();

        setsContainer.innerHTML = ``;
        currentlyEditing = null;
        const suggestionsList = document.getElementById("suggestions-list");
        if (suggestionsList) suggestionsList.style.display = "none";

        listWorkoutDates();
    });
    document.getElementById("settings-button").addEventListener('click', ()=> {
        setActiveTab("settings-button");
    });
    document.getElementById("stats-button").addEventListener('click', () => {
        setActiveTab("stats-button");
        renderWorkoutHeatmap();
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
            event.target.value = "";
        };
        reader.readAsText(file);
    });
    listWorkoutDates();

    function setActiveTab(target) {
        const mainNav = document.getElementsByClassName('main-nav')[0];
        const buttons = mainNav.getElementsByTagName('button');

        for (let button of buttons) {
            if (button.id === target) {
                button.classList.add('active-tab');
            } else {
                button.classList.remove('active-tab');
            }
        }

        const mapping = {
            "settings-button": "settings-container",
            "stats-button": "stats-container",
            "home-button": "exercise-container"
        };

        const containers = document.getElementsByClassName('content-container');
        for (let container of containers) {
            container.classList.add('d-none');
        }

        const targetContainerId = mapping[target];
        if (targetContainerId) {
            document.getElementById(targetContainerId).classList.remove('d-none');
        }
    }
    function renderWorkoutHeatmap() {
        const section = document.getElementById('heatmap-section');
        section.innerHTML = ''; // Clear previous content

        const history = getHistory();

        // Calculate daily volumes { 'YYYY-MM-DD': volume }
        const dailyVolumes = {};
        let firstWorkoutDate = null;

        for (const exercise of Object.values(history)) {
            for (const entry of exercise) {
                const day = entry.date.slice(0, 10);
                if (!firstWorkoutDate || day < firstWorkoutDate) {
                    firstWorkoutDate = day;
                }
                let volume = 0;
                for (const set of entry.sets) {
                    volume += (set.weight || 0) * (set.reps || 0);
                }
                dailyVolumes[day] = (dailyVolumes[day] || 0) + volume;
            }
        }

        if (!firstWorkoutDate) {
            section.textContent = 'No workout data available.';
            return;
        }

        const today = new Date();
        const sixMonthsAgo = new Date(today);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        // Start date: max(sixMonthsAgo, firstWorkoutDate)
        const startDate = new Date(firstWorkoutDate);
        if (startDate < sixMonthsAgo) {
            startDate.setTime(sixMonthsAgo.getTime());
        }

        // Find the first Monday on or before startDate
        const firstMonday = new Date(startDate);
        firstMonday.setDate(firstMonday.getDate() - ((firstMonday.getDay() + 6) % 7));

        // Calculate total weeks to cover until today
        const daysDiff = Math.ceil((today - firstMonday) / (1000 * 60 * 60 * 24));
        const totalWeeks = Math.ceil(daysDiff / 7);

        // Find max volume
        const maxVolume = Math.max(...Object.values(dailyVolumes), 0);
        const maxDay = maxVolume > 0
            ? Object.entries(dailyVolumes).reduce((a, b) => (b[1] > a[1] ? b : a))[0]
            : null;

        function volumeToColor(volume) {
            if (volume === 0) return '';
            const startRGB = [204, 255, 204];
            const endRGB = [0, 153, 0];
            const ratio = volume / maxVolume;
            const r = Math.round(startRGB[0] + ratio * (endRGB[0] - startRGB[0]));
            const g = Math.round(startRGB[1] + ratio * (endRGB[1] - startRGB[1]));
            const b = Math.round(startRGB[2] + ratio * (endRGB[2] - startRGB[2]));
            return `rgb(${r},${g},${b})`;
        }

        // Build weeks data: weeks[w][weekday]
        const weeks = Array.from({ length: totalWeeks }, () => Array(7).fill(null));
        for (let w = 0; w < totalWeeks; w++) {
            for (let wd = 0; wd < 7; wd++) {
                const currDate = new Date(firstMonday);
                currDate.setDate(currDate.getDate() + w * 7 + wd);
                if (currDate > today) continue;
                const iso = currDate.toISOString().slice(0, 10);
                weeks[w][wd] = iso;
            }
        }

        const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const table = document.createElement('table');
        table.id = 'workout-heatmap';

        for (let wd = 0; wd < 7; wd++) {
            const tr = document.createElement('tr');

            // Weekday label column
            const th = document.createElement('th');
            th.textContent = weekdays[wd];
            tr.appendChild(th);

            for (let w = 0; w < totalWeeks; w++) {
                const td = document.createElement('td');
                td.className = 'day-tile';

                const dateISO = weeks[w][wd];
                if (dateISO) {
                    const volume = dailyVolumes[dateISO] || 0;
                    const bg = volumeToColor(volume);
                    if (bg) td.style.backgroundColor = bg;
                    td.title = `${dateISO}\nVolume: ${volume}`;

                    if (dateISO === maxDay) {
                        const starImg = document.createElement('img');
                        starImg.src = 'img/openmoji/2B50.svg';
                        starImg.className = 'star-icon';
                        starImg.alt = 'Highest volume day';
                        td.appendChild(starImg);
                    }
                    if (volume > 0) {
                        td.style.cursor = 'pointer';

                        td.addEventListener('click', () => {
                            const workoutsForDate = [];
                            Object.entries(history).forEach(([exercise, sessions]) => {
                                sessions.forEach((session, idx) => {
                                    if (session.date.slice(0, 10) === dateISO) {
                                        workoutsForDate.push({
                                            exercise,
                                            sessionIndex: idx,
                                            session
                                        });
                                    }
                                });
                            });

                            setActiveTab("home-button");
                            showWorkoutsForDate(workoutsForDate, dateISO, "heatmap");
                        });
                    }
                }
                tr.appendChild(td);
            }

            table.appendChild(tr);
        }

        section.appendChild(table);
    }

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
        container.innerHTML = "<h3>Past Workouts</h3>";

        if (sortedDates.length === 0) {
            container.innerHTML += "<p>No workouts recorded yet.</p>";
            return;
        }

        const table = document.createElement("table");
        table.classList.add("workout-dates-table");
        const tbody = document.createElement("tbody");

        sortedDates.forEach(date => {
            const tr = document.createElement("tr");
            tr.style.cursor = "pointer";

            const iconTd = document.createElement("td");
            iconTd.innerHTML = '<img src="img/openmoji/1F50E.svg" alt="Search icon" class="icon-inline" />';
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

    function showWorkoutsForDate(workouts, dateKey, origin = 'history') {
        const container = document.getElementById("history-entries");
        const backButton = document.createElement('button');
        const titleElement = document.createElement('h3');

        titleElement.innerText = `Workouts on ${new Date(dateKey).toDateString()}`

        backButton.innerHTML = '<img src="img/openmoji/2934.svg" alt="Back icon" class="icon-inline" /> Back';
        backButton.classList.add('generic-button');
        backButton.addEventListener('click', ()=>{
            if(origin === 'heatmap'){
                setActiveTab('stats-button');
            }else{
                listWorkoutDates();
            }
        });

        container.innerHTML = '';
        container.appendChild(titleElement);
        container.appendChild(backButton);
        const table = document.createElement("table");
        table.classList.add("workout-day-table");
        const tbody = document.createElement("tbody");

        workouts.forEach(({ exercise, sessionIndex, session }) => {
            const tr = document.createElement("tr");
            tr.style.cursor = "pointer";

            const iconTd = document.createElement("td");
            iconTd.innerHTML = '<img src="img/openmoji/1F50E.svg" alt="Search icon" class="icon-inline" />';

            tr.appendChild(iconTd);

            const exerciseTd = document.createElement("td");
            exerciseTd.textContent = `${exercise} (${session.sets.length} sets)`;
            tr.appendChild(exerciseTd);

            tr.addEventListener("click", () => {
                renderHistory(exercise, sessionIndex, workouts, dateKey);
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

    function renderHistory(exercise, sessionIndex = null, workouts = null, dateKey = null) {
        const history = getHistory();
        const sessions = history[exercise] || [];
        let recentSessions = sessions.slice(-MAX_HISTORY);
        if(sessionIndex !== null){
            recentSessions = [history[exercise][sessionIndex]];
        }
            historyContainer.innerHTML = '';

        if (!recentSessions.length) {
            historyContainer.innerHTML = '<p>No history yet for this exercise.</p>';
            return;
        }else{
            const titleElement = document.createElement("h3");
            titleElement.innerText = `${exercise}${dateKey ? ' on ' + new Date(dateKey).toDateString() : ''}`;
            historyContainer.appendChild(titleElement);
            if(workouts && dateKey){
                const backButton = document.createElement('button');
                backButton.innerHTML = '<img src="img/openmoji/2934.svg" alt="Back icon" class="icon-inline" /> Back';
                backButton.classList.add('generic-button');
                backButton.addEventListener("click", ()=>{
                    showWorkoutsForDate(workouts, dateKey);
                });
                historyContainer.appendChild(backButton);
            }
        }


        const reversedSessions = [...recentSessions].reverse();

        const table = document.createElement("table");
        table.classList.add("workout-history-table");

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
                    editBtn.innerHTML = '<img src="img/openmoji/270F.svg" alt="Edit icon" class="icon-inline" />';

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
        const dateStamp = new Date().toISOString().split('T')[0];
        const filename = `exerciseHistory-${dateStamp}.json`;

        if (window.cordova && cordova.platformId === 'android') {
            document.addEventListener("deviceready", () => {
                const blob = new Blob([json], { type: 'application/json' });

                // Use the standard Downloads directory
                const downloadsDir = cordova.file.externalRootDirectory + "Download/";

                window.resolveLocalFileSystemURL(downloadsDir, function (dirEntry) {
                    dirEntry.getFile(filename, { create: true }, function (fileEntry) {
                        fileEntry.createWriter(function (fileWriter) {
                            fileWriter.onwriteend = function () {
                                alert("Exported to Downloads folder");
                            };
                            fileWriter.onerror = function (e) {
                                alert("Failed to write file: " + e.toString());
                            };
                            fileWriter.write(blob);
                        });
                    }, function (err) {
                        alert("Failed to create file: " + JSON.stringify(err));
                    });
                }, function (err) {
                    alert("Failed to access Downloads folder: " + JSON.stringify(err));
                });
            });
        } else {
            // Browser fallback
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
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
        const exerciseHistory = history[exercise] || (history[exercise] = []);

        const isEditing = currentlyEditing &&
            currentlyEditing.exercise === exercise &&
            exerciseHistory[currentlyEditing.sessionIndex];

        const sessionDate = isEditing
            ? exerciseHistory[currentlyEditing.sessionIndex].date
            : new Date().toISOString();

        const newSession = {
            date: sessionDate,
            sets,
        };

        if (isEditing) {
            exerciseHistory[currentlyEditing.sessionIndex] = newSession;
        } else {
            exerciseHistory.push(newSession);
        }

        saveHistory(history);
        renderHistory(exercise);
        form.reset();

        currentlyEditing = null;
        setsContainer.innerHTML = '';
    });

    exerciseInput.addEventListener("blur", () => {
        const exercise = exerciseInput.value.trim();
        if (exercise) renderHistory(exercise);
    });
});
