function mountFittsTest(container, onComplete) {
    // --- Test & Visual Parameters ---
    let animationActive = false;
    let trialActive = false;
    const TEST_DURATION = 60 * 1000; // 1 minute in ms
    let testStartTime = 0;
    
    // Set TRIALS_PER_BLOCK very high so the timer is the primary end condition
    const BLOCKS = 1, TRIALS_PER_BLOCK = 999, TOTAL_TRIALS = BLOCKS * TRIALS_PER_BLOCK;
    const TOTAL_BLOCKS = 10;
    let currentBlock = 1;
    let participantId = "P" + Math.floor(Math.random() * 100000);
    
    const ARENA_W = 700, ARENA_H = 500;
    const TARGET_SIZES = [30, 40]; 
    const TARGET_DISTANCES = [150, 300]; 
    const BLUE_TARGET_RADIUS = 30;
    const MOVE_SPEED = 1.2;
    const MAX_MISCLICKS = 3;
    const COLOR_TARGET = "#107046", COLOR_TARGET_BORDER = "#03422c";
    const COLOR_START = "#1559C7", COLOR_START_BORDER = "#0A294F";
    const DIALOG_TIMEOUT = 1000;

    let paused = false, pauseOverlay = null, pauseBtn = null, pauseTS = null, pauseAccum = 0;
    let trialIdx = 0, trialData = [], sessionStart = 0;
    let currentTrial = null;
    let animationFrame = null;
    let globalTimer = null;
    let trialSequence = [];

const LEVELS = {
    1: { size: 50, speed: 0.5, distance: 100 }, // Very Easy
    2: { size: 45, speed: 0.7, distance: 150 }, // Easy
    3: { size: 35, speed: 0.9, distance: 200 }, // Medium
    4: { size: 30, speed: 1.1, distance: 230 }, // Hard
    5: { size: 34, speed: 1.3, distance: 260 }  // Extreme 
};

    // Trial state variables
    let blueClicked = false;
    let greenTargetsClicked = 0;
    let misclickCount = 0;
    let trialStartTime = 0;
    let blueClickTime = 0;
    let greenClickTimes = [];

    function showPopupNotification(msg, anchorIdOrElem) {
        let arena = typeof anchorIdOrElem === "string" ? document.getElementById(anchorIdOrElem) : anchorIdOrElem;
        if (!arena || !msg) return;
        let oldPop = arena.querySelector(".fitts-popup-notification");
        if (oldPop) oldPop.remove();

        let note = document.createElement("div");
        note.className = "fitts-popup-notification";
        note.innerHTML = msg;
        Object.assign(note.style, {
            position: "absolute", left: "50%", top: "18px", transform: "translateX(-50%)",
            zIndex: 1010, background: "#f4f6fb", color: "#14314a", border: "2.1px solid #b4d9f4",
            borderRadius: "1em", boxShadow: "0 3px 14px #77c5fb52", fontSize: "1em", fontWeight: 550,
            padding: "9px 23px", minWidth: "120px", textAlign: "center", pointerEvents: "none"
        });
        arena.appendChild(note);
        setTimeout(() => {
            note.style.opacity = "0";
            setTimeout(() => note.remove(), 350);
        }, DIALOG_TIMEOUT);
    }

    showInstructions();

    function showInstructions() {
        container.innerHTML = `
            <div class="fitts-instructions">
                <div class="block-title">Fatigue Induction Test (Block ${currentBlock})</div>
                <div class="instruction-content">
                    <p><strong>Instructions:</strong></p>
                    <ul>
                        <li>Click the <span style="color: ${COLOR_START}; font-weight: bold;">blue target</span> to begin</li>
                        <li>Then click all <strong>3</strong> <span style="color: ${COLOR_TARGET}; font-weight: bold;">green targets</span></li>
                        <li>Complete as many sets as possible in 1 minute</li>
                    </ul>
                    <div class="ready-section">
                        <button class="button primary" onclick="startFittsTest()">Start Test</button>
                    </div>
                </div>
            </div>`;
        window.startFittsTest = startTest;
    }

    function startTest() {
        generateTrialSequence();
        sessionStart = performance.now();
        testStartTime = sessionStart;
        trialIdx = 0;
        trialData = [];
        showTestInterface();

        globalTimer = setInterval(() => {
            const elapsed = performance.now() - testStartTime;
            updateProgress(elapsed); // Now updates based on time
            if (elapsed >= TEST_DURATION) {
                clearInterval(globalTimer);
                globalTimer = null;
                endTest();
            }
        }, 100);

        nextTrial();
    }

    function generateTrialSequence() {
        trialSequence = [];
        for (let i = 0; i < TOTAL_TRIALS; i++) {
            trialSequence.push({
                targetSize: TARGET_SIZES[i % TARGET_SIZES.length],
                targetDistance: TARGET_DISTANCES[Math.floor(i / TARGET_SIZES.length) % TARGET_DISTANCES.length],
                targetRadius: TARGET_SIZES[i % TARGET_SIZES.length] / 2
            });
        }
    }

    function showTestInterface() {
        container.innerHTML = `
            <div class="fitts-test-container">
                <div class="block-title">Block ${currentBlock}</div>
                <div id="fitts-feedback">Time left: 60s</div>
                <div id="fitts-progbar"><div id="fitts-prog" style="width: 0%"></div></div>
                <div id="fitts-arena"></div>
                <div class="test-controls">
                    <button id="pause-btn" class="button secondary" onclick="togglePause()">Pause</button>
                    <div class="trial-info"><span id="misclick-counter">Misclicks: 0/${MAX_MISCLICKS}</span></div>
                </div>
            </div>`;
        window.togglePause = togglePause;
        setupArenaClickHandler();
    }

    function setupArenaClickHandler() {
        const arena = document.getElementById('fitts-arena');
        if (arena) arena.addEventListener('click', handleArenaClick);
    }

    function handleArenaClick(event) {
        if (paused || !currentTrial || !trialActive) return;

        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;
        const clickTime = performance.now();

        if (!blueClicked) {
            if (isPointInCircle(clickX, clickY, currentTrial.blueTarget.x, currentTrial.blueTarget.y, BLUE_TARGET_RADIUS)) {
                blueClicked = true;
                blueClickTime = clickTime;
                updateFeedback("Hit the green targets!");
                return;
            } else {
                showPopupNotification("Click the blue target first", document.getElementById('fitts-arena'));
                return;
            }
        }

        let hitTarget = false;
        for (let target of currentTrial.greenTargets) {
            if (!target.clicked && isPointInCircle(clickX, clickY, target.x, target.y, target.radius)) {
                hitTarget = true;
                target.clicked = true;
                greenTargetsClicked++;
                greenClickTimes.push(clickTime - trialStartTime);
                updateFeedback(`Green target ${greenTargetsClicked}/3 hit!`);
                
                if (greenTargetsClicked >= 3) {
                    trialActive = false;
                    setTimeout(() => completeTrialSuccess(), 50);
                    return;
                }
                return;
            }
        }

        if (!hitTarget) {
            misclickCount++;
            updateMisclickCounter();
            if (misclickCount >= MAX_MISCLICKS) completeTrialFailure();
        }
    }

    function isPointInCircle(px, py, cx, cy, radius) {
        return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2) <= radius;
    }

    function togglePause() {
        paused ? resumeTest() : pauseTest();
    }

    function pauseTest() {
        if (paused) return;
        paused = true;
        pauseTS = performance.now();
        if (animationFrame) cancelAnimationFrame(animationFrame);
        const arena = document.getElementById('fitts-arena');
        pauseOverlay = document.createElement('div');
        Object.assign(pauseOverlay.style, {
            position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
            background: 'rgba(255,255,255,0.95)', zIndex: 1000, display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexDirection: 'column'
        });
        pauseOverlay.innerHTML = `<div>Paused</div><button class="button primary" onclick="resumeTest()">Resume</button>`;
        arena.appendChild(pauseOverlay);
        window.resumeTest = resumeTest;
    }

    function resumeTest() {
        if (!paused) return;
        paused = false;
        pauseAccum += performance.now() - pauseTS;
        if (pauseOverlay) pauseOverlay.remove();
        if (currentTrial) animateTargets();
    }

    function nextTrial() {
        if (!globalTimer) return;
        initializeTrial();
        animationActive = true;
        animateTargets();
    }

 function initializeTrial() {
    const arena = document.getElementById('fitts-arena');
    if (!arena) return;

    // Pick a random level for this set
    const randomLevel = Math.floor(Math.random() * 5) + 1;
    const config = LEVELS[randomLevel];

    trialActive = true;
    blueClicked = false;
    greenTargetsClicked = 0;
    misclickCount = 0;
    trialStartTime = performance.now();
    greenClickTimes = [];
    pauseAccum = 0;

    // Use config values for speed and size
    currentTrial = {
        level: randomLevel,
        targetSize: config.size,
        targetDistance: config.distance,
        blueTarget: { 
            x: ARENA_W / 2, 
            y: ARENA_H / 2, 
            vx: (Math.random() - 0.5) * config.speed * 4, 
            vy: (Math.random() - 0.5) * config.speed * 4, 
            element: null 
        },
        greenTargets: [],
        arenaWidth: ARENA_W,
        arenaHeight: ARENA_H
    };

    for (let i = 0; i < 3; i++) {
        const angle = (i * 120 + Math.random() * 60 - 30) * Math.PI / 180;
        let tx = (ARENA_W / 2) + Math.cos(angle) * config.distance;
        let ty = (ARENA_H / 2) + Math.sin(angle) * config.distance;

        // Clamp inside bounds
        tx = Math.max(config.size/2, Math.min(ARENA_W - config.size/2, tx));
        ty = Math.max(config.size/2, Math.min(ARENA_H - config.size/2, ty));

        currentTrial.greenTargets.push({
            x: tx, y: ty,
            vx: (Math.random() - 0.5) * config.speed * 4,
            vy: (Math.random() - 0.5) * config.speed * 4,
            radius: config.size / 2,
            clicked: false, element: null
        });
    }
    createTargetElements();
}

    function createTargetElements() {
        const arena = document.getElementById('fitts-arena');
        arena.innerHTML = "";
        
        const blue = document.createElement('div');
        blue.className = 'moving-target blue-target';
        Object.assign(blue.style, { position: 'absolute', width: `${BLUE_TARGET_RADIUS * 2}px`, height: `${BLUE_TARGET_RADIUS * 2}px`, background: COLOR_START, border: `3px solid ${COLOR_START_BORDER}`, borderRadius: '50%', zIndex: 10, pointerEvents: 'none' });
        arena.appendChild(blue);
        currentTrial.blueTarget.element = blue;

        currentTrial.greenTargets.forEach(t => {
            const green = document.createElement('div');
            green.className = 'moving-target green-target';
            Object.assign(green.style, { position: 'absolute', width: `${t.radius * 2}px`, height: `${t.radius * 2}px`, background: COLOR_TARGET, border: `3px solid ${COLOR_TARGET_BORDER}`, borderRadius: '50%', zIndex: 10, pointerEvents: 'none' });
            arena.appendChild(green);
            t.element = green;
        });
    }

 function animateTargets() {
    if (!animationActive || paused || !currentTrial) return;

    // NEW: Update timer logic inside the animation frame for smoothness
    const elapsed = performance.now() - testStartTime;
    
    // Check if time is up
    if (elapsed >= TEST_DURATION) {
        animationActive = false;
        clearInterval(globalTimer); // Stop the backup interval
        globalTimer = null;
        endTest();
        return;
    }

    // Update the UI progress bar and feedback text every single frame
    updateProgress(elapsed);
    updateFeedback(""); // Passing empty string just triggers the timer refresh logic

    updateTargetPositions();
    renderTargets();
    
    // This keeps the loop running at 60 frames per second
    animationFrame = requestAnimationFrame(animateTargets);
}

    function updateTargetPositions() {
        const b = currentTrial.blueTarget;
        b.x += b.vx; b.y += b.vy;
        if (b.x <= BLUE_TARGET_RADIUS || b.x >= currentTrial.arenaWidth - BLUE_TARGET_RADIUS) b.vx *= -1;
        if (b.y <= BLUE_TARGET_RADIUS || b.y >= currentTrial.arenaHeight - BLUE_TARGET_RADIUS) b.vy *= -1;

        if (blueClicked) {
            currentTrial.greenTargets.forEach(t => {
                t.x += t.vx; t.y += t.vy;
                if (t.x <= t.radius || t.x >= currentTrial.arenaWidth - t.radius) t.vx *= -1;
                if (t.y <= t.radius || t.y >= currentTrial.arenaHeight - t.radius) t.vy *= -1;
            });
        }
    }

    function renderTargets() {
        const b = currentTrial.blueTarget;
        b.element.style.left = `${b.x - BLUE_TARGET_RADIUS}px`;
        b.element.style.top = `${b.y - BLUE_TARGET_RADIUS}px`;
        b.element.style.opacity = blueClicked ? '0.3' : '1';

        currentTrial.greenTargets.forEach(t => {
            t.element.style.left = `${t.x - t.radius}px`;
            t.element.style.top = `${t.y - t.radius}px`;
            t.element.style.opacity = t.clicked ? '0.2' : (blueClicked ? '1' : '0.4');
        });
    }

    function updateProgress(elapsed) {
        const prog = document.getElementById('fitts-prog');
        if (prog) prog.style.width = `${(elapsed / TEST_DURATION) * 100}%`;
    }

    function updateFeedback(msg) {
        const fb = document.getElementById('fitts-feedback');
        if (fb) {
            const rem = Math.max(0, Math.ceil((TEST_DURATION - (performance.now() - testStartTime)) / 1000));
            fb.textContent = `Time left: ${rem}s - ${msg}`;
        }
    }

    function updateMisclickCounter() {
        const mc = document.getElementById('misclick-counter');
        if (mc) mc.textContent = `Misclicks: ${misclickCount}/${MAX_MISCLICKS}`;
    }

    function completeTrialSuccess() {
        animationActive = false;
        const totalTime = performance.now() - trialStartTime - pauseAccum;
        recordTrial(true, totalTime);
        showPopupNotification("Success!", document.getElementById('fitts-arena'));
        trialIdx++;
        setTimeout(() => nextTrial(), 150);
    }

    function completeTrialFailure() {
        animationActive = false;
        recordTrial(false, performance.now() - trialStartTime);
        showPopupNotification("Failed Set", document.getElementById('fitts-arena'));
        trialIdx++;
        setTimeout(() => nextTrial(), 150);
    }

function recordTrial(success, time) {
    const ID = Math.log2((currentTrial.targetDistance / currentTrial.targetSize) + 1);
    
    // Round to 4 decimal places for scientific precision without the "mess"
    const throughput = (ID / (time / 1000)).toFixed(4);

    trialData.push({
        participantId: participantId,
        timestamp: Date.now(),
        block: currentBlock,
        trialInBlock: trialIdx + 1,
        difficultyLevel: currentTrial.level,
        targetSize: currentTrial.targetSize,
        targetDistance: currentTrial.targetDistance,
        targetSpeed: currentTrial.targetSpeed,
        indexOfDifficulty: ID.toFixed(4),
        totalTime_ms: time.toFixed(2),
        throughput_bps: throughput,
        misclicks: misclickCount,
        success: success,
        blueClickTime_ms: (blueClickTime - trialStartTime).toFixed(2),
        // Clean up the intervals to 2 decimal places
        greenClickIntervals: greenClickTimes.map(t => t.toFixed(2)).join('|') 
    });
}

    function endTest() {
        animationActive = false;
        if (animationFrame) cancelAnimationFrame(animationFrame);
        downloadCSV(trialData, currentBlock);
        
        if (currentBlock < TOTAL_BLOCKS) {
            currentBlock++;
            showBlockBreak();
        } else {
            showResults(extractFittsData(trialData, TEST_DURATION / 1000));
        }
    }

    function showBlockBreak() {
        container.innerHTML = `
            <div class="fitts-break-screen">
                <h3>Block ${currentBlock - 1} Complete</h3>
                <p>Take a breath. Press below when ready for the next 1-minute set.</p>
                <button class="button primary" onclick="startFittsTest()">Start Block ${currentBlock}</button>
            </div>`;
    }

    function downloadCSV(data, blockNum) {
        if (!data.length) return;
        const headers = Object.keys(data[0]).join(",");
        const rows = data.map(r => Object.values(r).map(v => JSON.stringify(v)).join(",")).join("\n");
        const blob = new Blob([[headers, rows].join("\n")], { type: "text/csv" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `fitts_fatigue_block_${blockNum}.csv`;
        a.click();
    }

    function showResults(data) {
        container.innerHTML = `<div class="fitts-results"><h3>Test Complete</h3><p>Throughput: ${data.throughput.toFixed(2)} ops/sec</p><button class="button primary" onclick="onComplete(data)">Finish</button></div>`;
    }

    function extractFittsData(data, duration) {
        const success = data.filter(t => t.success);
        return { throughput: (success.length * 3) / duration };
    }
}