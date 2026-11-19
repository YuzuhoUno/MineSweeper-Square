const LEVELS = {
    easy: {
        name: "Easy",
        rows: 9,
        cols: 9,
        mines: 10
    },
    normal: {
        name: "Normal",
        rows: 16,
        cols: 16,
        mines: 40
    },
    hard: {
        name: "Hard",
        rows: 16,
        cols: 30,
        mines: 99
    }
};

const STATE_HIDDEN = 0;
const STATE_REVEALED = 1;
const STATE_FLAGGED = 2;

const state = {
    playerName: "",
    currentLevelKey: "easy",
    board: [],
    elapsedSeconds: 0,
    timerInterval: null,
    isGameOver: false
};

function initApp() {
    setupEventListeners();
    renderLeaderboard("easy");
}

function startNewGame() {
    const nameInput = document.querySelector("#player-name-input");
    const nameVal = nameInput ? nameInput.value.trim() : "";
    const nameError = document.getElementById("name-error");

    if (!nameVal) {
        //Put cursor to nameInput automatically
        nameInput.focus();
        nameInput.style.borderColor = "red";
        nameError.classList.remove("hidden");
        return;
    }
    //Change the red borderColor to original color
    nameInput.style.borderColor = "#bdc3c7";
    nameError.classList.add("hidden");
    
    state.playerName = nameVal;
    const selectedRadio = document.querySelector("input[name='difficulty']:checked");
    state.currentLevelKey = selectedRadio ? selectedRadio.value : "easy";

    const level = LEVELS[state.currentLevelKey];
    state.isGameOver = false;
    state.elapsedSeconds = 0;

    // Create a board
    state.board = Array.from({ length: level.rows }, () =>
        Array.from({ length: level.cols }, () => ({
            state: STATE_HIDDEN,
            isMine: false,
            neighbourMines: 0
        }))
    );

    // Put mines with random()
    let placedMines = 0;
    while (placedMines < level.mines) {
        const row = Math.floor(Math.random() * level.rows);
        const col = Math.floor(Math.random() * level.cols);
        if (!state.board[row][col].isMine) {
            state.board[row][col].isMine = true;
            placedMines++;
        }
    }

    // Calculate the number of mines around a tile (8 different directions)
    for (let r = 0; r < level.rows; r++) {
        for (let c = 0; c < level.cols; c++) {
            if (state.board[r][c].isMine) {
                continue;
            }
            state.board[r][c].neighbourMines = countNeighborMines(r, c);
        }
    }
    setupGameScreen();
}

function countNeighborMines(r, c) {
    const level = LEVELS[state.currentLevelKey];
    let count = 0;

    // Up Down Cross around a tile
    const directions = [
        [-1, 1], [0, 1], [1, 1],
        [-1, 0],         [1, 0],
        [-1, -1], [0, -1], [1, -1]
    ];
    for (const [dr, dc] of directions) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < level.rows && nc >= 0 && nc < level.cols) {
            if (state.board[nr][nc].isMine) {
                count++;
            }
        }
    }
    return count;
}

function setupEventListeners() {
    const nameInput = document.getElementById("player-name-input");
    if (nameInput) {
        nameInput.addEventListener("input", () => {
            if (nameInput.value.trim() !== "") {
                nameInput.style.borderColor = "#bdc3c7";
                const nameError = document.getElementById("name-error");
                if (nameError) nameError.classList.add("hidden");
            }
        });
    }
    
    document.addEventListener("click", (event) => {
        const actionBtn = event.target.closest("[class-action]");
        if (actionBtn) {
            //Take out class-action ex)"start-game"
            handleAction(actionBtn.getAttribute("class-action"));
            return;
        }

        const tabBtn = event.target.closest("[class-tab]");
        if (tabBtn) {
            //Take out class-tab ex)"easy"
            const levelKey = tabBtn.getAttribute("class-tab");
            document.querySelectorAll("[class-tab]").forEach(btn => btn.classList.remove("active"));
            tabBtn.classList.add("active");
            renderLeaderboard(levelKey);
            return;
        }

        const deleteSaveBtn = event.target.closest("[class-delete-save]");
        if (deleteSaveBtn) {
            const index = deleteSaveBtn.getAttribute("class-delete-save");
            deleteSave(index);
            return;
        }

        const loadSaveBtn = event.target.closest("[class-load-save]");
        if (loadSaveBtn) {
            const index = loadSaveBtn.getAttribute("class-load-save");
            loadSave(index);
            return;
        }
    });

    const boardContainer = document.querySelector(".grid-board");

    // Left click, open the cell
    boardContainer.addEventListener("click", (event) => {
        if (state.isGameOver) return;

        const cellNode = event.target.closest(".cell");
        if (!cellNode) return;

        //Get coordinate of r,c with dicimal num
        const r = parseInt(cellNode.dataset.row, 10);
        const c = parseInt(cellNode.dataset.col, 10);
        revealCell(r, c);
    });

    // Right click, put a flag
    boardContainer.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        if (state.isGameOver) return;

        const cellNode = event.target.closest(".cell");
        if (!cellNode) return;

        const r = parseInt(cellNode.dataset.row, 10);
        const c = parseInt(cellNode.dataset.col, 10);
        toggleFlag(r, c);
    });
}

function handleAction(action) {
    switch (action) {
        case "start-game":
            startNewGame();
            break;
        case "view-saved":
            togglePanel("saves");
            renderSavedGames();
            break;
        case "start-leaderboard":
        case "view-leaderboard":
            togglePanel("leaderboard");
            break;
        case "start-rules":
        case "view-rules":
            togglePanel("rules");
            break;
        case "save-game":
            saveCurrentGame();
            break;
        case "quit-game":
            quitToMainMenu();
            break;
        case "continue-victory":
            document.querySelector("[class-modal='victory']").classList.add("hidden");
            document.querySelector("[class-modal='lose']").classList.add("hidden");
            startNewGame();
            break;
        case "close-victory":
            document.querySelector("[class-modal='victory']").classList.add("hidden");
            document.querySelector("[class-modal='lose']").classList.add("hidden");
            quitToMainMenu();
            break;
    }
}

function togglePanel(panelName) {
    //"saves", "leaderboard", "rules"
    const panels = document.querySelectorAll("[class-panel]");
    const actionBtns = document.querySelectorAll("[class-action]");

    panels.forEach(panel => {
        const isTarget = panel.getAttribute("class-panel") === panelName;
        if (isTarget) {
            panel.classList.toggle("hidden");
        } else {
            panel.classList.add("hidden");
        }
    });

    actionBtns.forEach(btn => {
        const action = btn.getAttribute("class-action");
        const panelMap = {
            "view-saved": "saves",
            "start-leaderboard": "leaderboard",
            "view-leaderboard": "leaderboard",
            "start-rules": "rules",
            "view-rules": "rules"
        };

        if (panelMap[action]) {
            const correspondingPanel = document.querySelector(`[class-panel="${panelMap[action]}"]`);
            //If it shows on the screen
            if (correspondingPanel && !correspondingPanel.classList.contains("hidden")) {
                btn.classList.add("btn-primary");
                btn.classList.remove("btn-secondary");
            } else {
                btn.classList.remove("btn-primary");
                btn.classList.add("btn-secondary");
            }
        }
    });
}

function setupGameScreen() {
    const mainMenu = document.querySelector("[class-screen='main-menu']");
    if (mainMenu) mainMenu.classList.remove("active");
    document.querySelector("[class-screen='gameplay']").classList.add("active");

    document.querySelector("[class-info='player-name']").textContent = state.playerName;
    document.querySelector("[class-info='level-name']").textContent = LEVELS[state.currentLevelKey].name;

    renderBoard();
    startTimer();
}

// Open the cell (Left click)
function revealCell(r, c) {
    const cell = state.board[r][c];
    if (cell.state !== STATE_HIDDEN) {
        return;
    }

    cell.state = STATE_REVEALED;
    if (cell.isMine) {
        handleGameOver(false);
        renderBoard();
        return;
    }

    if (cell.neighbourMines === 0) {
        const level = LEVELS[state.currentLevelKey];
        const directions = [
            [-1, 1], [0, 1], [1, 1],
            [-1, 0],         [1, 0],
            [-1, -1], [0, -1], [1, -1]
        ];
        for (const [dr, dc] of directions) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < level.rows && nc >= 0 && nc < level.cols) {
                revealCell(nr, nc);
            }
        }
    }
    renderBoard();
    checkWinCondition();
}

// Put a flag (Right click)
function toggleFlag(r, c) {
    const cell = state.board[r][c];
    if (cell.state === STATE_REVEALED) {
        return;
    }

    if (cell.state === STATE_FLAGGED) {
        cell.state = STATE_HIDDEN;
    } else {
        cell.state = STATE_FLAGGED;
    }
    renderBoard();
}

function checkWinCondition() {
    const level = LEVELS[state.currentLevelKey];

    for (let r = 0; r < level.rows; r++) {
        for (let c = 0; c < level.cols; c++) {
            const cell = state.board[r][c];
            if (!cell.isMine && cell.state !== STATE_REVEALED) {
                return;
            }
        }
    }
    handleGameOver(true);
}

function renderBoard() {
    const level = LEVELS[state.currentLevelKey];
    const gridContainer = document.querySelector(".grid-board");

    gridContainer.style.gridTemplateColumns = `repeat(${level.cols}, 1fr)`;
    gridContainer.innerHTML = "";

    for (let r = 0; r < level.rows; r++) {
        for (let c = 0; c < level.cols; c++) {
            const cell = state.board[r][c];
            const cellNode = document.createElement("div");
            cellNode.classList.add("cell");
            cellNode.dataset.row = r;
            cellNode.dataset.col = c;

            if (cell.state === STATE_REVEALED) {
                cellNode.classList.add("revealed");
                if (cell.isMine) {
                    cellNode.textContent = "💣";
                    cellNode.classList.add("mine");
                } else if (cell.neighbourMines > 0) {
                    cellNode.textContent = cell.neighbourMines;
                    cellNode.dataset.mines = cell.neighbourMines;
                }
            } else if (cell.state === STATE_FLAGGED) {
                cellNode.textContent = "🚩";
                cellNode.classList.add("flagged");
            }

            gridContainer.appendChild(cellNode);
        }
    }
}

function handleGameOver(isWin) {
    state.isGameOver = true;
    stopTimer();
    if (isWin) {
        handleVictory();
    } else {
        // Open all cells which have a mine
        const level = LEVELS[state.currentLevelKey];
        for (let r = 0; r < level.rows; r++) {
            for (let c = 0; c < level.cols; c++) {
                if (state.board[r][c].isMine) {
                    state.board[r][c].state = STATE_REVEALED;
                }
            }
        }
        handleLose();
    }
}

function handleVictory() {
    stopTimer();
    saveLeaderboardResult();

    const timeStr = formatTime(state.elapsedSeconds);
    document.querySelector("[class-info='victory-player']").textContent = state.playerName;
    document.querySelector("[class-info='victory-level']").textContent = LEVELS[state.currentLevelKey].name;
    document.querySelector("[class-info='victory-time']").textContent = timeStr;

    document.querySelector("[class-modal='victory']").classList.remove("hidden");
}

function handleLose() {
    const timeStr = formatTime(state.elapsedSeconds);
    document.querySelector("[class-info='lose-player']").textContent = state.playerName;
    document.querySelector("[class-info='lose-level']").textContent = LEVELS[state.currentLevelKey].name;
    document.querySelector("[class-info='lose-time']").textContent = timeStr;

    document.querySelector("[class-modal='lose']").classList.remove("hidden");
}

function startTimer() {
    stopTimer();
    updateTimerDisplay();
    state.timerInterval = setInterval(() => {
        state.elapsedSeconds++;
        updateTimerDisplay(); //Display 00:01
    }, 1000); //1000 == 1sec
}

function stopTimer() {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
}

function updateTimerDisplay() {
    document.querySelector("[class-info='timer']").textContent = formatTime(state.elapsedSeconds);
}

function formatTime(totalSecs) {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function quitToMainMenu() {
    stopTimer();
    document.querySelector("[class-screen='gameplay']").classList.remove("active");
    const mainMenu = document.querySelector("[class-screen='main-menu']");
    if (mainMenu) {
        mainMenu.classList.add("active");
    }
}

function saveCurrentGame() {
    if (state.isGameOver) {
        alertNotice("Cannot save a finished game!");
        return;
    }
    try {
        const saves = JSON.parse(localStorage.getItem("minesweeper_saves") || "[]");
        const saveData = {
            playerName: state.playerName || "Player",
            currentLevelKey: state.currentLevelKey,
            board: state.board,
            elapsedSeconds: state.elapsedSeconds,
            date: new Date().toLocaleDateString() //ex)2026/11/10
        };
        saves.push(saveData);
        localStorage.setItem("minesweeper_saves", JSON.stringify(saves));
        alertNotice("Game saved successfully!");
    } catch (e) {
        alertNotice("Failed to save game.");
    }
}

function renderSavedGames() {
    const container = document.querySelector(".saves-list");
    const saves = JSON.parse(localStorage.getItem("minesweeper_saves") || "[]");
    if (saves.length === 0) {
        container.innerHTML = "<p>No saved games found.</p>";
        return;
    }
    //save == one saved data information, index == index of the save
    container.innerHTML = saves.map((save, idx) => `
        <div class="save-item">
            <div class="saved-info">
                <strong>${save.playerName}</strong> - ${LEVELS[save.currentLevelKey].name} (${formatTime(save.elapsedSeconds)})
                <br><small>${save.date}</small>
            </div>
            <div class="saved-games-button">
                <button class="btn btn-success" class-load-save="${idx}">Load</button>
                <button class="btn btn-danger" class-delete-save="${idx}">Delete</button>
            </div>
        </div>
    `).join("");
}

function loadSave(index) {
    const saves = JSON.parse(localStorage.getItem("minesweeper_saves") || "[]");
    const save = saves[index];
    if (!save) return;
    state.playerName = save.playerName;
    state.currentLevelKey = save.currentLevelKey;
    state.board = save.board;
    state.elapsedSeconds = save.elapsedSeconds;
    state.isGameOver = false;

    togglePanel("saves");
    setupGameScreen();
}

function deleteSave(index) {
    let saves = JSON.parse(localStorage.getItem("minesweeper_saves") || "[]");
    saves.splice(index, 1); //(starting point, number of delete items)
    localStorage.setItem("minesweeper_saves", JSON.stringify(saves));
    renderSavedGames();
}

function saveLeaderboardResult() {
    const leaderboard = JSON.parse(localStorage.getItem("minesweeper_leaderboard") || "{}");
    //If there is no list
    if (!leaderboard[state.currentLevelKey]) {
        leaderboard[state.currentLevelKey] = [];
    }

    leaderboard[state.currentLevelKey].push({
        playerName: state.playerName,
        time: state.elapsedSeconds,
        date: new Date().toLocaleDateString()
    });

    //Sort with increase order
    leaderboard[state.currentLevelKey].sort((a, b) => a.time - b.time);
    localStorage.setItem("minesweeper_leaderboard", JSON.stringify(leaderboard));
}

function renderLeaderboard(levelKey) {
    const container = document.querySelector(".leaderboard-content");
    const leaderboard = JSON.parse(localStorage.getItem("minesweeper_leaderboard") || "{}");
    const entries = leaderboard[levelKey] || [];

    if (entries.length === 0) {
        container.innerHTML = "<p>No recorded scores yet for this level.</p>";
        return;
    }
    //entry == one data information, index == index of the data
    container.innerHTML = `
        <table class="leaderboard-content">
            <thead>
                <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Time</th>
                </tr>
            </thead>
            <tbody>
                ${entries.map((entry, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${entry.playerName}</td>
                        <td>${formatTime(entry.time)}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table> 
    `;
}

//toast == temporary notification
function alertNotice(msg) {
    const toast = document.createElement("div");
    toast.classList.add("toast");
    toast.textContent = msg;

    document.body.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 2500);
}

initApp();