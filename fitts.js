function mountFittsTest(container, onComplete) {
    // --- Test & Visual Parameters ---
    let completedMinutes = 0;
const TOTAL_MINUTES_NEEDED = 10;
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
    1: { size: 55, distance: 320 }, // Very Easy: Large targets, wide circle
    2: { size: 45, distance: 280 }, // Easy
    3: { size: 35, distance: 240 }, // Medium
    4: { size: 28, distance: 200 }, // Hard
    5: { size: 22, distance: 160 }  // Extreme: Small targets, tight circle
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
                    <li>You will see 11 targets in a circle.</li>
                    <li>Click the <strong>highlighted green target</strong> to begin the timer.</li>
                    <li>Continue clicking the targets as they light up one by one.</li>
                    <li>Complete as many full sets of 11 as possible in 1 minute.</li>
                </ul>
                <div class="ready-section">
                    <button class="button primary" onclick="startFittsTest()">Start Block</button>
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
    if (paused || !currentTrial) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const targetIndex = currentTrial.sequence[currentTrial.currentIndexInSequence];
    const target = currentTrial.targets[targetIndex];

    if (isPointInCircle(clickX, clickY, target.x, target.y, target.radius)) {
        // TRIGGER FOR NEW MINUTE: Start the timer on the first click
        if (testStartTime === 0) {
            testStartTime = performance.now();
            animationActive = true;
            trialActive = true;
            animateTargets(); 
        }

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
    } 
    else {
        // Only count misclicks after the test has actually started
        if (testStartTime > 0) {
            misclickCount++;
            updateMisclickCounter();

            // NEW: Hard stop if misclicks exceed 3
            if (misclickCount > MAX_MISCLICKS) {
                animationActive = false;
                if (animationFrame) cancelAnimationFrame(animationFrame);
                
                // Show failure notification and force a set end
                showPopupNotification("Too many misclicks!", document.getElementById('fitts-arena'));
                
                // Record this as a failed set and move to the intermediate screen
                setTimeout(() => {
                    endTest(); 
                }, 1000);
            }
        }
    }
}
function renderCircularArena() {
    const arena = document.getElementById('fitts-arena');
    if (!arena || !currentTrial) return;

    // IMPORTANT: Clear the arena every time to prevent freezing and overlaps
    arena.innerHTML = ""; 

    currentTrial.targets.forEach(target => {
        const el = document.createElement('div');
        el.className = 'fitts-target';
        
        // Use opacity and color to show the "Light up" effect
        const isHighlighted = target.isHighlighted;
        
        Object.assign(el.style, {
            position: 'absolute',
            width: `${target.radius * 2}px`,
            height: `${target.radius * 2}px`,
            left: `${target.x - target.radius}px`,
            top: `${target.y - target.radius}px`,
            borderRadius: '50%',
            background: isHighlighted ? COLOR_TARGET : "#d1d5db",
            border: `2px solid ${isHighlighted ? COLOR_TARGET_BORDER : "#9ca3af"}`,
            opacity: isHighlighted ? "1.0" : "0.15",
            transition: 'none', // Disable transitions for instant randomized spawning
            pointerEvents: 'none'
        });
        
        arena.appendChild(el);
        target.element = el;
    });
}

function completeTrialSuccess() {
    trialActive = false;
    const totalTime = performance.now() - trialStartTime;
    recordTrial(true, totalTime);

    trialIdx++;

    // Check if 1-minute is up
    const elapsed = performance.now() - testStartTime;
    if (elapsed < TEST_DURATION) {
        // Use a short timeout to clear the screen and start next random set
        setTimeout(() => nextTrial(), 50); 
    } else {
        // 1 minute is over, end the test
        animationActive = false;
        endTest();
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

    // Pick random difficulty for the new set of 11
    const randomLevel = Math.floor(Math.random() * 5) + 1;
    const config = LEVELS[randomLevel];
    const numTargets = 11;
    const centerX = ARENA_W / 2;
    const centerY = ARENA_H / 2;
    const circleRadius = config.distance / 2;

    const targets = [];
    for (let i = 0; i < numTargets; i++) {
        const angle = (i * (360 / numTargets) - 90) * (Math.PI / 180);
        targets.push({
            id: i,
            x: centerX + Math.cos(angle) * circleRadius,
            y: centerY + Math.sin(angle) * circleRadius,
            radius: config.size / 2,
            isHighlighted: false,
            clicked: false
        });
    }

    // Shuffle for randomness
    let sequence = Array.from({length: numTargets}, (_, i) => i);
    for (let i = sequence.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
    }

    // Highlight the first target
    targets[sequence[0]].isHighlighted = true;

    currentTrial = {
        targets,
        sequence,
        currentIndexInSequence: 0,
        level: randomLevel,
        targetSize: config.size,
        targetDistance: config.distance
    };
    
    // Explicitly call the render here to ensure visibility
    renderCircularArena(); 
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
    // If the test is paused or over, stop the animation immediately
    if (!animationActive || paused || !currentTrial) return;

    const elapsed = performance.now() - testStartTime;
    updateProgress(elapsed); 

    // Update countdown text to prevent freezing at 0s
    const remaining = Math.max(0, Math.ceil((60000 - elapsed) / 1000));
    const fb = document.getElementById('fitts-feedback');
    if (fb) fb.textContent = `Time left: ${remaining}s - Target ${currentTrial.currentIndexInSequence + 1}/11`;

    // CRITICAL: Termination logic
    if (elapsed >= 60000) { 
        animationActive = false;
        if (animationFrame) cancelAnimationFrame(animationFrame);
        endTest(); // This triggers the Finish screen
        return;
    }

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
    if (prog) {
        // TEST_DURATION should be 60000 (1 minute)
        prog.style.width = `${Math.min(100, (elapsed / 60000) * 100)}%`;
    }
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
    // Lock interaction during reset
    trialActive = false;

    // Record the final data for this set of 11
    const totalTime = performance.now() - trialStartTime;
    recordTrial(true, totalTime);

    // Provide quick visual feedback
    showPopupNotification("Set Complete!", document.getElementById('fitts-arena'));

    // Increment trial count for logging
    trialIdx++;

    // RESET IMMEDIATELY: This prevents the freeze
    setTimeout(() => {
        // Only start a new one if the 1-minute timer hasn't run out
        if (performance.now() - testStartTime < TEST_DURATION) {
            nextTrial(); 
        }
    }, 150); 
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
    
    // Throughput for 11 targets
    const throughput = ( (ID * 11) / (time / 1000) ).toFixed(4);

    trialData.push({
        participantId: participantId,
        block: currentBlock,
        trialInBlock: trialIdx + 1,
        difficultyLevel: currentTrial.level,
        indexOfDifficulty: ID.toFixed(4),
        totalTime_ms: time.toFixed(2),
        throughput_bps: throughput,
        misclicks: misclickCount,
        success: success,
        timestamp: Date.now()
    });
}

function endTest() {
    // 1. Stop all background timers
    animationActive = false;
    if (globalTimer) {
        clearInterval(globalTimer);
        globalTimer = null;
    }

    // 2. Clear the arena
    const arena = document.getElementById('fitts-arena');
    if (arena) arena.innerHTML = "";

    // INCREMENT COUNTER BEFORE DOWNLOAD
    completedMinutes++; 

    // 3. FORCE DOWNLOAD NOW (Every set)
    downloadCSV(trialData, `block_${currentBlock}_set_${completedMinutes}`);

    // 4. CLEAR DATA so the next CSV is fresh
    trialData = []; 

    if (completedMinutes < TOTAL_MINUTES_NEEDED) {
        // Show the "Start Next Minute" screen
        showNextSetScreen();
    } else {
        // Move to NASA-TLX after 10 full sets
        const finalStats = {
            throughput: calculateThroughput(),
            meanErrorRate: calculateMeanError(),
            allTrialData: [] // Data already downloaded
        };
        showResults(finalStats);
    }
}

function showNextSetScreen() {
    container.innerHTML = `
        <div class="fitts-results">
            <div class="block-title">Set ${completedMinutes}/${TOTAL_MINUTES_NEEDED} Complete</div>
            <p>CSV Downloaded. Take a breath.</p>
            <button class="button primary" id="next-set-btn">Start Next Minute</button>
        </div>`;
    
    document.getElementById('next-set-btn').onclick = () => {
        // 1. FULL RESET: Wipe internal state
        animationActive = false; 
        trialActive = false;
        testStartTime = 0; 
        trialIdx = 0;
        misclickCount = 0;
        greenTargetsClicked = 0;

        // 2. RE-MOUNT UI: Redraw the arena, progress bar, and feedback text
        showTestInterface(); 
        
        // 3. INITIALIZE: Generate the new 11-target circle
        initializeTrial(); 
        
        // 4. RENDER: Explicitly draw the targets so they are visible
        renderCircularArena(); 

        // 5. RE-START TIMER: Re-initialize the global monitor
        if (globalTimer) clearInterval(globalTimer);
        globalTimer = setInterval(() => {
            if (testStartTime > 0) { 
                const elapsed = performance.now() - testStartTime;
                updateProgress(elapsed);
                if (elapsed >= 60000) {
                    clearInterval(globalTimer);
                    globalTimer = null;
                    endTest();
                }
            }
        }, 100);
    };
}
function showResults(data) {
    // Clear the container and show ONLY the Finish button to proceed to NASA-TLX
    container.innerHTML = `
        <div class="fitts-results">
            <div class="block-title">Test Complete</div>
            <div class="results-content">
                <p>Block Throughput: <strong>${data.throughput} bps</strong></p>
                <button class="button primary" id="fitts-finish-link">Finish</button>
            </div>
        </div>
    `;

    // This button MUST call the onComplete function passed from main.js
    document.getElementById('fitts-finish-link').onclick = () => {
        onComplete(data); // This triggers showNASATLX in main.js
    };
}

    function showBlockBreak() {
        container.innerHTML = `
            <div class="fitts-break-screen">
                <h3>Block ${currentBlock - 1} Complete</h3>
                <p>Take a breath. Press below when ready for the next 1-minute set.</p>
                <button class="button primary" onclick="startFittsTest()">Start Block ${currentBlock}</button>
            </div>`;
    }

  function downloadCSV(data, fileName) {
    if (!data.length) return;
    const headers = "participantId,block,setIndex,trialInSet,difficultyLevel,indexOfDifficulty,totalTime_ms,throughput_bps,misclicks,success,timestamp";
    const rows = data.map(r => 
        `${r.participantId},${r.block},${completedMinutes},${r.trialInBlock},${r.difficultyLevel},${r.indexOfDifficulty},${r.totalTime_ms},${r.throughput_bps},${r.misclicks},${r.success},${r.timestamp}`
    ).join("\n");
    
    const blob = new Blob([headers + "\n" + rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `fitts_data_${fileName}.csv`;
    a.click();
}


    function extractFittsData(data, duration) {
        const success = data.filter(t => t.success);
        return { throughput: (success.length * 3) / duration };
    }
}