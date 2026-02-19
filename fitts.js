function mountFittsTest(container, onComplete) {
    // --- Test & Visual Parameters ---
    let completedMinutes = 0;
    const TOTAL_MINUTES_NEEDED = 10;
    let animationActive = false;
    let trialActive = false; // Primary interaction gate
    const TEST_DURATION = 60 * 1000; 
    let testStartTime = 0;
    
    const BLOCKS = 1, TRIALS_PER_BLOCK = 999, TOTAL_TRIALS = BLOCKS * TRIALS_PER_BLOCK;
    let participantId = "P" + Math.floor(Math.random() * 100000);
    
    const ARENA_W = 700, ARENA_H = 500;
    const MAX_MISCLICKS = 3;
    const COLOR_TARGET = "#107046", COLOR_TARGET_BORDER = "#03422c";
    const DIALOG_TIMEOUT = 1000;

    let paused = false, pauseOverlay = null, pauseAccum = 0;
    let trialIdx = 0, trialData = [];
    let currentTrial = null;
    let animationFrame = null;
    let globalTimer = null;

    const LEVELS = {
        1: { size: 55, distance: 320 },
        2: { size: 45, distance: 280 },
        3: { size: 35, distance: 240 },
        4: { size: 28, distance: 200 },
        5: { size: 22, distance: 160 }
    };

    let greenTargetsClicked = 0;
    let misclickCount = 0;
    let trialStartTime = 0;
    let greenClickTimes = [];

    // --- Helper: Popup ---
    function showPopupNotification(msg, anchorIdOrElem) {
        let arena = typeof anchorIdOrElem === "string" ? document.getElementById(anchorIdOrElem) : anchorIdOrElem;
        if (!arena || !msg) return;
        let note = document.createElement("div");
        note.className = "fitts-popup-notification";
        note.innerHTML = msg;
        Object.assign(note.style, {
            position: "absolute", left: "50%", top: "18px", transform: "translateX(-50%)",
            zIndex: 1010, background: "#f4f6fb", color: "#14314a", border: "2.1px solid #b4d9f4",
            borderRadius: "1em", padding: "9px 23px", pointerEvents: "none"
        });
        arena.appendChild(note);
        setTimeout(() => { note.style.opacity = "0"; setTimeout(() => note.remove(), 350); }, DIALOG_TIMEOUT);
    }

    // --- Core Logic ---
    showInstructions();

    function showInstructions() {
        container.innerHTML = `
            <div class="fitts-instructions">
                <div class="block-title">Fatigue Induction Test (Minute ${completedMinutes + 1})</div>
                <div class="instruction-content">
                    <p>Click the <strong>highlighted green target</strong>. Complete as many sets as possible in 1 minute.</p>
                    <button class="button primary" onclick="startFittsTest()">Start Minute</button>
                </div>
            </div>`;
        window.startFittsTest = startTest;
    }

    function startTest() {
        testStartTime = performance.now();
        trialIdx = 0;
        trialData = [];
        misclickCount = 0;
        showTestInterface();

        globalTimer = setInterval(() => {
            const elapsed = performance.now() - testStartTime;
            updateProgress(elapsed);
            if (elapsed >= TEST_DURATION) {
                clearInterval(globalTimer);
                globalTimer = null;
                endTest();
            }
        }, 100);

        nextTrial();
    }

    function showTestInterface() {
        container.innerHTML = `
            <div class="fitts-test-container">
                <div id="fitts-feedback">Time left: 60s</div>
                <div id="fitts-progbar"><div id="fitts-prog" style="width: 0%"></div></div>
                <div id="fitts-arena" style="position:relative; width:${ARENA_W}px; height:${ARENA_H}px; border:1px solid #ccc; margin:auto;"></div>
                <div class="test-controls">
                    <button id="pause-btn" class="button secondary" onclick="togglePause()">Pause</button>
                    <div class="trial-info"><span id="misclick-counter">Misclicks: 0/${MAX_MISCLICKS}</span></div>
                </div>
            </div>`;
        window.togglePause = togglePause;
        document.getElementById('fitts-arena').addEventListener('click', handleArenaClick);
    }

    // --- CLICK HANDLER ---
    function handleArenaClick(event) {
        if (paused || !currentTrial || !trialActive) return;

        const rect = event.currentTarget.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        const targetIndex = currentTrial.sequence[currentTrial.currentIndexInSequence];
        const target = currentTrial.targets[targetIndex];

        const dist = Math.sqrt(Math.pow(clickX - target.x, 2) + Math.pow(clickY - target.y, 2));

        if (dist <= target.radius) {
            // HIT
            target.clicked = true;
            target.isHighlighted = false;
            greenTargetsClicked++;
            greenClickTimes.push(performance.now() - trialStartTime);
            currentTrial.currentIndexInSequence++;

            if (currentTrial.currentIndexInSequence < currentTrial.sequence.length) {
                const nextIdx = currentTrial.sequence[currentTrial.currentIndexInSequence];
                currentTrial.targets[nextIdx].isHighlighted = true;
            } else {
                completeTrialSuccess();
                return;
            }
            renderCircularArena();
        } else {
            // MISS
            misclickCount++;
            updateMisclickCounter();
            if (misclickCount > MAX_MISCLICKS) {
                handleHardStop("Limit Exceeded!");
            }
        }
    }

    function renderCircularArena() {
        const arena = document.getElementById('fitts-arena');
        if (!arena || !currentTrial) return;
        arena.innerHTML = ""; 
        currentTrial.targets.forEach(target => {
            const el = document.createElement('div');
            Object.assign(el.style, {
                position: 'absolute', width: `${target.radius * 2}px`, height: `${target.radius * 2}px`,
                left: `${target.x - target.radius}px`, top: `${target.y - target.radius}px`,
                borderRadius: '50%', background: target.isHighlighted ? COLOR_TARGET : "#d1d5db",
                opacity: target.isHighlighted ? "1.0" : "0.15", pointerEvents: 'none'
            });
            arena.appendChild(el);
        });
    }

    function nextTrial() {
        initializeTrial();
        trialActive = true; // RE-ENABLE CLICKING
        trialStartTime = performance.now();
        animationActive = true;
        animateTargets();
    }

    function initializeTrial() {
        const randomLevel = Math.floor(Math.random() * 5) + 1;
        const config = LEVELS[randomLevel];
        const numTargets = 11;
        const centerX = ARENA_W / 2, centerY = ARENA_H / 2;
        const circleRadius = config.distance / 2;
        const targets = [];

        for (let i = 0; i < numTargets; i++) {
            const angle = (i * (360 / numTargets) - 90) * (Math.PI / 180);
            targets.push({ id: i, x: centerX + Math.cos(angle) * circleRadius, y: centerY + Math.sin(angle) * circleRadius, radius: config.size / 2, isHighlighted: false });
        }

        let sequence = Array.from({length: numTargets}, (_, i) => i);
        for (let i = sequence.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
        }
        targets[sequence[0]].isHighlighted = true;
        currentTrial = { targets, sequence, currentIndexInSequence: 0, level: randomLevel, targetSize: config.size, targetDistance: config.distance };
        renderCircularArena();
    }

    function animateTargets() {
        if (!animationActive || paused || !currentTrial) return;
        const elapsed = performance.now() - testStartTime;
        const remaining = Math.max(0, Math.ceil((60000 - elapsed) / 1000));
        const fb = document.getElementById('fitts-feedback');
        if (fb) fb.textContent = `Time left: ${remaining}s - Target ${currentTrial.currentIndexInSequence + 1}/11`;
        animationFrame = requestAnimationFrame(animateTargets);
    }

    function updateProgress(elapsed) {
        const prog = document.getElementById('fitts-prog');
        if (prog) prog.style.width = `${Math.min(100, (elapsed / 60000) * 100)}%`;
    }

    function updateMisclickCounter() {
        const counterElement = document.getElementById('misclick-counter');
        if (counterElement) counterElement.textContent = `Misclicks: ${misclickCount}/${MAX_MISCLICKS}`;
    }

    function handleHardStop(reason) {
        animationActive = false;
        trialActive = false;
        currentTrial = null;
        if (animationFrame) cancelAnimationFrame(animationFrame);
        showPopupNotification(reason, document.getElementById('fitts-arena'));
        setTimeout(() => { endTest(); }, 1200);
    }

    function completeTrialSuccess() {
        trialActive = false; // Disable until nextTrial initializes
        const totalTime = performance.now() - trialStartTime;
        recordTrial(true, totalTime);
        showPopupNotification("Set Complete!", document.getElementById('fitts-arena'));
        trialIdx++;
        setTimeout(() => { if (performance.now() - testStartTime < TEST_DURATION) nextTrial(); }, 150);
    }

    function recordTrial(success, time) {
        const ID = Math.log2((currentTrial.targetDistance / currentTrial.targetSize) + 1);
        const throughput = ((ID * 11) / (time / 1000)).toFixed(4);
        trialData.push({ participantId, block: currentBlock, trialInBlock: trialIdx + 1, difficultyLevel: currentTrial.level, indexOfDifficulty: ID.toFixed(4), totalTime_ms: time.toFixed(2), throughput_bps: throughput, misclicks: misclickCount, success, timestamp: Date.now() });
    }

    function endTest() {
        animationActive = false;
        if (globalTimer) { clearInterval(globalTimer); globalTimer = null; }
        const arena = document.getElementById('fitts-arena');
        if (arena) arena.innerHTML = "";

        completedMinutes++;
        downloadCSV(trialData, `block_${currentBlock}_set_${completedMinutes}`);
        trialData = []; 

        if (completedMinutes < TOTAL_MINUTES_NEEDED) {
            showNextSetScreen();
        } else {
            showResults();
        }
    }

    function showNextSetScreen() {
        container.innerHTML = `
            <div class="fitts-results">
                <div class="block-title">Set ${completedMinutes}/${TOTAL_MINUTES_NEEDED} Complete</div>
                <p>Data downloaded. Take a breath.</p>
                <button class="button primary" onclick="startNextMinute()">Start Next Minute</button>
            </div>`;
        window.startNextMinute = () => {
            animationActive = false; trialActive = false; testStartTime = 0; trialIdx = 0; misclickCount = 0;
            startTest();
        };
    }

    function showResults() {
        container.innerHTML = `
            <div class="fitts-results">
                <div class="block-title">Tapping Test Complete</div>
                <button class="button primary" id="fitts-finish-link">Continue to Assessment</button>
            </div>`;
        document.getElementById('fitts-finish-link').onclick = () => {
            onComplete({ status: "success", sets: completedMinutes });
        };
    }

    function downloadCSV(data, fileName) {
        if (!data.length) return;
        const headers = "participantId,block,setIndex,trialInSet,difficultyLevel,indexOfDifficulty,totalTime_ms,throughput_bps,misclicks,success,timestamp";
        const rows = data.map(r => `${r.participantId},${r.block},${completedMinutes},${r.trialInBlock},${r.difficultyLevel},${r.indexOfDifficulty},${r.totalTime_ms},${r.throughput_bps},${r.misclicks},${r.success},${r.timestamp}`).join("\n");
        const blob = new Blob([headers + "\n" + rows], { type: "text/csv" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `fitts_data_${fileName}.csv`;
        a.click();
    }

    function togglePause() {
        if (paused) {
            paused = false;
            if (pauseOverlay) pauseOverlay.remove();
            if (currentTrial) animateTargets();
        } else {
            paused = true;
            if (animationFrame) cancelAnimationFrame(animationFrame);
            const arena = document.getElementById('fitts-arena');
            pauseOverlay = document.createElement('div');
            Object.assign(pauseOverlay.style, { position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', background: 'rgba(255,255,255,0.9)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' });
            pauseOverlay.innerHTML = `<button class="button primary" onclick="togglePause()">Resume</button>`;
            arena.appendChild(pauseOverlay);
        }
    }
}