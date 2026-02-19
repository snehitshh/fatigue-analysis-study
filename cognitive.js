function mountCognitiveTest(container, onComplete, blockIdx) {
    // --- Configuration ---
    const PHASE_TIME = 150 * 1000; 
    const BREAK_TIME = 30 * 1000;  
    const STIMULUS_TIMEOUT = 3000; 

    const COLORS = [
        { name: 'red', label: 'Red', key: 'R', bg: 'linear-gradient(90deg,#fd5042 60%,#c3241d 100%)', color: '#fff', css: '#d62e14' },
        { name: 'blue', label: 'Blue', key: 'B', bg: 'linear-gradient(90deg,#227af3 50%,#223994 100%)', color: '#fff', css: '#2264d9' },
        { name: 'green', label: 'Green', key: 'G', bg: 'linear-gradient(90deg,#23cb75 40%,#188652 120%)', color: '#fff', css: '#169f4f' },
        { name: 'yellow', label: 'Yellow', key: 'Y', bg: 'linear-gradient(90deg,#ffd945 40%,#ffb420 120%)', color: '#333', css: '#ebbb18', textShadow: '0 1px 6px #fff4a399' },
    ];

    const AXCPT_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'X', 'Y', 'Z'];

    // --- Modern Centered UI with Feedback Pop-ups ---
    if (!window.__cognitiveStyles) {
        const style = document.createElement('style');
        style.textContent = `
            .cognitive-test-container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; text-align: center; font-family: 'Inter', sans-serif; }
            .cognitive-stimulus { font-size: 6em; font-weight: 800; margin: 20px 0; min-height: 150px; display: flex; align-items: center; justify-content: center; position: relative; transition: opacity 0.1s; }
            .feedback-overlay { position: absolute; font-size: 0.7em; top: -40px; pointer-events: none; animation: popFade 0.5s ease-out forwards; }
            @keyframes popFade { 0% { transform: scale(0.5); opacity: 0; } 50% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(1); opacity: 0; transform: translateY(-30px); } }
            .axcpt-box { border: 5px solid #374151; padding: 20px; border-radius: 15px; background: #f9fafb; width: 120px; height: 120px; display: flex; align-items: center; justify-content: center; }
            .cog-btn-row { display: flex; gap: 20px; margin-top: 30px; }
            .cognitive-progbar-outer { width: 100%; max-width: 500px; height: 12px; background: #e5e7eb; border-radius: 6px; margin: 20px 0; overflow: hidden; }
            #cognitive-prog-bar { height: 100%; background: #3b82f6; width: 0%; transition: width 0.1s linear; }
        `;
        document.head.appendChild(style);
        window.__cognitiveStyles = true;
    }

    const PHASES = [
        { type: 'stroop', label: 'Stroop Test (Part 1)' },
        { type: 'break',  label: 'Rest Period' },
        { type: 'axcpt',  label: 'AX-CPT (Part 1)' },
        { type: 'break',  label: 'Rest Period' },
        { type: 'stroop', label: 'Stroop Test (Part 2)' },
        { type: 'break',  label: 'Rest Period' },
        { type: 'axcpt',  label: 'AX-CPT (Part 2)' },
        { type: 'break',  label: 'Rest Period' }
    ];

    let currentPhaseIdx = 0, phaseStartTime = 0, trialStartTime = 0, trialResults = [];
    let awaitingResponse = false, trialTimeout = null, phaseTimer = null, lastAxcptCue = null;

    function showInstructions() {
        container.innerHTML = `
            <div class="cognitive-test-container">
                <h2 class="block-title">Cognitive Battery</h2>
                <p>Complete the tasks as fast as possible. Real-time feedback will be shown.</p>
                <button class="button primary" onclick="startBattery()">Start Battery</button>
            </div>`;
        window.startBattery = () => startPhase(0);
    }

    function startPhase(idx) {
        if (idx >= PHASES.length) { endTest(); return; }
        currentPhaseIdx = idx;
        const phase = PHASES[idx];
        phaseStartTime = performance.now();
        
        if (phase.type === 'break') {
            renderBreakUI(phase.label);
        } else {
            renderTestUI(phase.label);
            nextTrial();
        }
        startPhaseTimer(phase.type === 'break' ? BREAK_TIME : PHASE_TIME);
    }

function renderTestUI(label) {
    container.innerHTML = `
        <div class="cognitive-test-container">
            <h3>${label}</h3>
            <div class="cognitive-progbar-outer"><div id="cognitive-prog-bar"></div></div>
            
            <div id="phase-timer-text" style="font-weight:700; color:#1e40af; font-size:1.4em; margin-bottom:15px;">
                Time Remaining: 150s
            </div>

            <div id="cognitive-feedback" style="font-weight:600; color:#6b7280; margin-bottom:10px;">Focus...</div>
            <div class="cognitive-stimulus" id="cog-stimulus"></div>
            <div class="cog-btn-row" id="cog-btns"></div>
        </div>`;
}

    function renderBreakUI(label) {
        container.innerHTML = `
            <div class="cognitive-test-container">
                <h3>${label}</h3>
                <div id="break-timer" style="font-size: 5em; font-weight: 800;">30</div>
                <p>Relax before the next part begins.</p>
            </div>`;
    }

function startPhaseTimer(duration) {
    if (phaseTimer) clearInterval(phaseTimer);
    phaseTimer = setInterval(() => {
        const elapsed = performance.now() - phaseStartTime;
        const remaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));
        
        // Update the visual progress bar
        const pb = document.getElementById('cognitive-prog-bar');
        if (pb) pb.style.width = `${(elapsed / duration) * 100}%`;
        
        // FIX: Update the countdown text every 100ms
        const timerText = document.getElementById('phase-timer-text');
        if (timerText) {
            timerText.textContent = `Time Remaining: ${remaining}s`;
        }
        
        // Update break timer if we are in a break phase
        const bt = document.getElementById('break-timer');
        if (bt) bt.textContent = remaining;

        if (elapsed >= duration) {
            clearInterval(phaseTimer);
            startPhase(currentPhaseIdx + 1);
        }
    }, 100);
}

    function nextTrial() {
        const phase = PHASES[currentPhaseIdx];
        const stimDiv = document.getElementById('cog-stimulus');
        const btnArea = document.getElementById('cog-btns');
        if (!stimDiv || !btnArea) return;

        stimDiv.style.opacity = "1";
        awaitingResponse = true;
        trialStartTime = performance.now();

        if (phase.type === 'stroop') {
            const word = COLORS[Math.floor(Math.random() * COLORS.length)];
            let color;
            do { color = COLORS[Math.floor(Math.random() * COLORS.length)]; } while (color.name === word.name);
            stimDiv.textContent = word.label.toUpperCase();
            stimDiv.style.color = color.css;
            stimDiv.dataset.correct = color.key;
            btnArea.innerHTML = COLORS.map(c => `<button class="cog-btn" style="background:${c.bg}; color:white" onclick="handleResponse('${c.key}')">${c.label}</button>`).join('');
        } else {
            // AX-CPT Logic
            let char;
            const rand = Math.random();
            if (lastAxcptCue === 'A') { char = rand < 0.7 ? 'X' : 'Y'; }
            else { char = rand < 0.4 ? 'A' : AXCPT_LETTERS[Math.floor(Math.random() * AXCPT_LETTERS.length)]; }

            const isMatch = (lastAxcptCue === 'A' && char === 'X');
            stimDiv.innerHTML = `<div class="axcpt-box">${char}</div>`;
            stimDiv.style.color = "#1f2937";
            stimDiv.dataset.correct = isMatch ? 'M' : 'N';
            btnArea.innerHTML = `<button class="cog-btn" style="background:#10b981; color:white;" onclick="handleResponse('M')">Target (M)</button>
                                 <button class="cog-btn" style="background:#ef4444; color:white;" onclick="handleResponse('N')">Non-Target (N)</button>`;
            lastAxcptCue = char;
        }
        trialTimeout = setTimeout(() => handleResponse(null, true), STIMULUS_TIMEOUT);
    }

    window.handleResponse = (response, isTimeout = false) => {
        if (!awaitingResponse) return;
        awaitingResponse = false;
        if (trialTimeout) clearTimeout(trialTimeout);

        const stimDiv = document.getElementById('cog-stimulus');
        const isCorrect = !isTimeout && (response === stimDiv.dataset.correct);
        
        // --- REAL-TIME FEEDBACK POP-UP ---
        const feedback = document.createElement('div');
        feedback.className = 'feedback-overlay';
        feedback.innerHTML = isCorrect ? '<span style="color:#10b981">✓</span>' : '<span style="color:#ef4444">✗</span>';
        stimDiv.appendChild(feedback);

        trialResults.push({ phase: PHASES[currentPhaseIdx].type, correct: isCorrect, rt: isTimeout ? STIMULUS_TIMEOUT : (performance.now() - trialStartTime) });
        
        stimDiv.style.opacity = "0.2";
        setTimeout(() => { if (PHASES[currentPhaseIdx].type !== 'break') nextTrial(); }, 150);
    };

    function endTest() {
        if (phaseTimer) clearInterval(phaseTimer);
        downloadCSV();
        onComplete({ results: trialResults });
    }

    function downloadCSV() {
        const csv = "Phase,Correct,ReactionTime\n" + trialResults.map(r => `${r.phase},${r.correct},${r.rt.toFixed(2)}`).join("\n");
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `cognitive_battery_block${blockIdx}.csv`;
        a.click();
    }

    showInstructions();
}