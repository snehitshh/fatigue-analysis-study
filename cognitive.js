function mountCognitiveTest(container, onComplete, blockIdx) {
    const STROOP_TRIALS = 30, NBACK_TRIALS = 30, NBACK_N = 2, TIME_LIMIT = 3000; // 3 seconds timeout
    const TOTAL_VISIBLE_TRIALS = STROOP_TRIALS + NBACK_TRIALS;

    const COLORS = [
        { name: 'red', label: 'Red', key: 'R', bg: 'linear-gradient(90deg,#fd5042 60%,#c3241d 100%)', color: '#fff', css: '#d62e14' },
        { name: 'blue', label: 'Blue', key: 'B', bg: 'linear-gradient(90deg,#227af3 50%,#223994 100%)', color: '#fff', css: '#2264d9' },
        { name: 'green', label: 'Green', key: 'G', bg: 'linear-gradient(90deg,#23cb75 40%,#188652 120%)', color: '#fff', css: '#169f4f' },
        { name: 'yellow', label: 'Yellow', key: 'Y', bg: 'linear-gradient(90deg,#ffd945 40%,#ffb420 120%)', color: '#333', css: '#ebbb18', textShadow: '0 1px 6px #fff4a399' },
    ];

    // Alphabet letters for N-Back test
    const NBACK_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

    const NBACK_BTNS = [
        { type: 'match', label: 'Match (M)', key: 'M', bg: 'linear-gradient(90deg,#3ed196 10%,#26736b 170%)', color: '#fff' },
        { type: 'no-match', label: 'No Match (N)', key: 'N', bg: 'linear-gradient(90deg,#ff7065 10%,#d02765 170%)', color: '#fff' }
    ];

    // Add CSS if not already present
    if (!window.__cognitiveBtnCSS) {
        const style = document.createElement('style');
        style.textContent = `
            .cog-btn-row { display: flex; justify-content: center; gap: 2em; margin: 2em 0 1.7em 0; flex-wrap: wrap;}
            .cog-btn { display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 110px; min-height: 64px; margin: 0 0.6em; padding: 16px 0; border: none; border-radius: 14px; font-size: 1.30em; font-family: 'Inter', Arial, sans-serif; font-weight: 700; box-shadow: 0 2px 18px 0 rgba(22,34,44,0.09), 0 1px 5px #dbe2fb44; color: #20242d; cursor: pointer; transition: transform 0.11s, box-shadow 0.15s, background 0.12s; outline: none; letter-spacing: 0.01em;}
            .cog-btn:active, .cog-btn:focus-visible { transform: scale(0.97); box-shadow: 0 2px 7px #7384ab44; outline: 3px solid #356bf7; z-index: 2;}
            .cog-btn.cog-red {background: linear-gradient(90deg,#fd5042 60%,#c3241d 100%); color: #fff; box-shadow: 0 2px 12px #f09a8b4d;}
            .cog-btn.cog-blue {background: linear-gradient(90deg,#227af3 50%,#223994 100%); color: #fff; box-shadow: 0 2px 12px #9cbafc38;}
            .cog-btn.cog-green {background: linear-gradient(90deg,#23cb75 40%,#188652 120%); color: #fff; box-shadow: 0 2px 12px #74d1b637;}
            .cog-btn.cog-yellow {background: linear-gradient(90deg,#ffd945 40%,#ffb420 120%); color: #333; text-shadow: 0 1px 6px #fff4a399; box-shadow: 0 2px 12px #ffe38b44;}
            .cog-btn.cog-match, .cog-btn.cog-nmatch { background: linear-gradient(90deg,#eaeffc 60%,#95aadb 100%); color: #292d3b; font-size: 1.15em; min-width: 130px; margin: 0 1.2em;}
            .cog-btn.cog-match {background: linear-gradient(90deg,#3ed196 10%,#26736b 170%); color: #fff;}
            .cog-btn.cog-nmatch {background: linear-gradient(90deg,#ff7065 10%,#d02765 170%); color: #fff;}
            .cognitive-progbar-outer { width:100%; height:17px; background:#e6eaf2; border-radius: 10px; margin-bottom: 1.5em;}
            #cognitive-prog-bar { width:0%; height:100%; background: linear-gradient(90deg,#1968ff 0%,#1850bb 90%); border-radius: 10px; font-weight: 700; font-size: 0.97em; color:#fff; display: flex; align-items: center; justify-content: flex-end; user-select: none; transition: width 0.32s;}
            .cognitive-stimulus { font-size: 3em; font-weight: 700; text-align: center; margin: 1em 0; min-height: 1.5em; display: flex; align-items: center; justify-content: center;}
            .nback-letter { font-size: 1.6em; font-weight: 700; color: #1f2937; background: #f3f4f6; width: 70px; height: 70px; border-radius: 8px; border: 2px solid #374151; display: flex; align-items: center; justify-content: center; margin: 0 auto; font-family: 'Inter', Arial, sans-serif; padding: 8px; box-sizing: border-box;}
            @media (max-width:600px) {.cog-btn-row { gap: 1.1em; } .cog-btn { min-width:75px;font-size:1.01em;padding:11px 0; } .nback-letter { font-size: 1.4em; width: 60px; height: 60px; padding: 6px; }}
        `;
        document.head.appendChild(style);
        window.__cognitiveBtnCSS = true;
    }

    let currentPhase = 'instructions'; // instructions, stroop, nback, complete
    let currentTrial = 0;
    let stroopTrials = [];
    let nbackTrials = [];
    let nbackSequence = [];
    let testStartTime = 0;
    let trialStartTime = 0;
    let responseHandler = null;
    let trialTimeout = null;
    let awaitingResponse = false;

    function clearAllTimeouts() {
        if (trialTimeout) {
            clearTimeout(trialTimeout);
            trialTimeout = null;
        }
    }

    function updateProgressBar(progress) {
        let bar = document.getElementById('cognitive-prog-bar');
        if (bar) bar.style.width = `${(progress * 100).toFixed(1)}%`;
    }

    showInstructions();

    function showInstructions() {
        container.innerHTML = `
            <div class="cognitive-instructions">
                <div class="block-title">Cognitive Test</div>
                <div class="instruction-content">
                    <h3>This test has two parts:</h3>
                    
                    <div class="test-part">
                        <h4>1. Stroop Test (${STROOP_TRIALS} trials)</h4>
                        <p>You'll see color words displayed in <strong>different colors</strong>.</p>
                        <p><strong>Identify the COLOR of the text</strong>, not the word itself.</p>
                        <p><strong>You have 3 seconds per trial.</strong></p>
                        <p>Press the corresponding button as quickly as possible:</p>
                        <div class="cog-btn-row">
                            ${COLORS.map(color => `
                                <div class="cog-btn cog-${color.name}" style="background: ${color.bg}; color: ${color.color}; ${color.textShadow ? 'text-shadow: ' + color.textShadow : ''}">
                                    ${color.label}<br><small>(${color.key})</small>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="test-part">
                        <h4>2. N-Back Test (${NBACK_TRIALS} trials)</h4>
                        <p>You'll see a sequence of letters displayed one at a time.</p>
                        <p>First, you'll see 2 letters to remember (no response needed).</p>
                        <p>Then, <strong>decide if the current letter matches the letter from ${NBACK_N} steps back.</strong></p>
                        <p><strong>You have 3 seconds per trial.</strong></p>
                        <div class="cog-btn-row">
                            ${NBACK_BTNS.map(btn => `
                                <div class="cog-btn cog-${btn.type.replace('-', '')}" style="background: ${btn.bg}; color: ${btn.color}">
                                    ${btn.label}
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="ready-section">
                        <p><strong>Be as fast and accurate as possible!</strong></p>
                        <button class="button primary" onclick="startCognitiveTest()">Start Test</button>
                    </div>
                </div>
            </div>
        `;

        window.startCognitiveTest = startTest;
    }

    function startTest() {
        testStartTime = performance.now();
        generateTrialSequences();
        currentPhase = 'stroop';
        currentTrial = 0;
        showStroopPhase();
    }

    function generateTrialSequences() {
        // Generate Stroop trials (ONLY incongruent ones)
        stroopTrials = [];
        for (let i = 0; i < STROOP_TRIALS; i++) {
            let wordColor, textColor;
            
            // Ensure incongruent trials only
            do {
                wordColor = COLORS[Math.floor(Math.random() * COLORS.length)];
                textColor = COLORS[Math.floor(Math.random() * COLORS.length)];
            } while (wordColor.name === textColor.name);
            
            stroopTrials.push({
                trialNumber: i + 1,
                word: wordColor.label.toUpperCase(),
                textColor: textColor.name,
                correctResponse: textColor.key,
                isCongruent: false // All trials are incongruent now
            });
        }

        // Generate N-back trials with letters
        nbackTrials = [];
        nbackSequence = [];
        
        // First generate the sequence using random letters
        for (let i = 0; i < NBACK_TRIALS; i++) {
            const letter = NBACK_LETTERS[Math.floor(Math.random() * NBACK_LETTERS.length)];
            nbackSequence.push(letter);
        }

        // Then create trials with match information
        for (let i = 0; i < NBACK_TRIALS; i++) {
            const isMatch = i >= NBACK_N && nbackSequence[i] === nbackSequence[i - NBACK_N];
            nbackTrials.push({
                trialNumber: i + 1,
                letter: nbackSequence[i],
                isMatch: isMatch,
                correctResponse: isMatch ? 'M' : 'N'
            });
        }
    }

    function showStroopPhase() {
        clearAllTimeouts();
        if (responseHandler) {
            document.removeEventListener('keydown', responseHandler);
        }
        
        container.innerHTML = `
            <div class="cognitive-test-container">
                <div class="block-title">Stroop Test</div>
                <div id="cognitive-feedback">Get ready...</div>
                <div class="cognitive-progbar-outer">
                    <div id="cognitive-prog-bar"></div>
                </div>
                
                <div class="cognitive-stimulus" id="stroop-stimulus"></div>
                
                <div class="cog-btn-row">
                    ${COLORS.map(color => `
                        <button class="cog-btn cog-${color.name}" 
                                style="background: ${color.bg}; color: ${color.color}; ${color.textShadow ? 'text-shadow: ' + color.textShadow : ''}"
                                data-key="${color.key}" data-color="${color.name}">
                            ${color.label}<br><small>(${color.key})</small>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        setupStroopEventListeners();
        setTimeout(() => nextStroopTrial(), 1000);
    }

    function setupStroopEventListeners() {
        const buttons = container.querySelectorAll('.cog-btn[data-key]');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => handleStroopResponse(btn.dataset.key));
        });

        // Keyboard support
        responseHandler = (e) => {
            const key = e.key.toUpperCase();
            if (['R', 'G', 'B', 'Y'].includes(key) && awaitingResponse) {
                e.preventDefault();
                handleStroopResponse(key);
            }
        };
        document.addEventListener('keydown', responseHandler);
    }

    function nextStroopTrial() {
        if (currentTrial >= STROOP_TRIALS) {
            clearAllTimeouts();
            if (responseHandler) {
                document.removeEventListener('keydown', responseHandler);
            }
            currentPhase = 'nback';
            currentTrial = 0;
            showNBackPhase();
            return;
        }

        clearAllTimeouts();
        const trial = stroopTrials[currentTrial];
        const textColorObj = COLORS.find(c => c.name === trial.textColor);
        
        updateProgressBar(currentTrial / TOTAL_VISIBLE_TRIALS);
        
        const stimulus = document.getElementById('stroop-stimulus');
        const feedback = document.getElementById('cognitive-feedback');
        
        if (feedback) {
            feedback.textContent = `Trial ${currentTrial + 1}/${STROOP_TRIALS} - Identify the COLOR of the text (3s limit)`;
        }
        
        if (stimulus) {
            stimulus.textContent = trial.word;
            stimulus.style.color = textColorObj.css;
        }
        
        trialStartTime = performance.now();
        awaitingResponse = true;
        
        // Set 3-second timeout
        trialTimeout = setTimeout(() => {
            if (awaitingResponse) {
                handleStroopTimeout();
            }
        }, TIME_LIMIT);
    }

    function handleStroopResponse(response) {
        if (!awaitingResponse) return;
        
        awaitingResponse = false;
        clearAllTimeouts();
        
        const responseTime = performance.now() - trialStartTime;
        const trial = stroopTrials[currentTrial];
        const isCorrect = response === trial.correctResponse;
        
        // Record trial data
        stroopTrials[currentTrial].response = response;
        stroopTrials[currentTrial].reactionTime = responseTime;
        stroopTrials[currentTrial].correct = isCorrect;
        stroopTrials[currentTrial].timedOut = false;

        // Visual feedback
        const feedback = document.getElementById('cognitive-feedback');
        if (feedback) {
            feedback.textContent = isCorrect ? '✓ Correct' : '✗ Incorrect';
            feedback.style.color = isCorrect ? '#16a34a' : '#dc2626';
        }

        currentTrial++;
        setTimeout(() => {
            if (feedback) {
                feedback.style.color = '#125478';
            }
            nextStroopTrial();
        }, 500);
    }

    function handleStroopTimeout() {
        if (!awaitingResponse) return;
        
        awaitingResponse = false;
        clearAllTimeouts();
        
        const trial = stroopTrials[currentTrial];
        
        // Record timeout as incorrect
        stroopTrials[currentTrial].response = null;
        stroopTrials[currentTrial].reactionTime = TIME_LIMIT;
        stroopTrials[currentTrial].correct = false;
        stroopTrials[currentTrial].timedOut = true;

        // Visual feedback
        const feedback = document.getElementById('cognitive-feedback');
        if (feedback) {
            feedback.textContent = '⏱ Time up!';
            feedback.style.color = '#dc2626';
        }

        currentTrial++;
        setTimeout(() => {
            if (feedback) {
                feedback.style.color = '#125478';
            }
            nextStroopTrial();
        }, 500);
    }

    function showNBackPhase() {
        clearAllTimeouts();
        if (responseHandler) {
            document.removeEventListener('keydown', responseHandler);
        }
        
        container.innerHTML = `
            <div class="cognitive-test-container">
                <div class="block-title">N-Back Test</div>
                <div id="cognitive-feedback">Remember the letters from ${NBACK_N} steps back...</div>
                <div class="cognitive-progbar-outer">
                    <div id="cognitive-prog-bar"></div>
                </div>
                
                <div class="cognitive-stimulus" id="nback-stimulus"></div>
                
                <div class="cog-btn-row" id="nback-buttons" style="display: none;">
                    ${NBACK_BTNS.map(btn => `
                        <button class="cog-btn cog-${btn.type.replace('-', '')}" 
                                style="background: ${btn.bg}; color: ${btn.color}"
                                data-key="${btn.key}" data-type="${btn.type}">
                            ${btn.label}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        setupNBackEventListeners();
        setTimeout(() => nextNBackTrial(), 1500);
    }

    function setupNBackEventListeners() {
        const buttons = container.querySelectorAll('.cog-btn[data-key]');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => handleNBackResponse(btn.dataset.key));
        });

        responseHandler = (e) => {
            const key = e.key.toUpperCase();
            if (['M', 'N'].includes(key) && awaitingResponse) {
                e.preventDefault();
                handleNBackResponse(key);
            }
        };
        document.addEventListener('keydown', responseHandler);
    }

    function nextNBackTrial() {
        if (currentTrial >= NBACK_TRIALS) {
            clearAllTimeouts();
            if (responseHandler) {
                document.removeEventListener('keydown', responseHandler);
            }
            endTest();
            return;
        }

        clearAllTimeouts();
        const trial = nbackTrials[currentTrial];
        
        updateProgressBar((STROOP_TRIALS + currentTrial) / TOTAL_VISIBLE_TRIALS);
        
        const stimulus = document.getElementById('nback-stimulus');
        const feedback = document.getElementById('cognitive-feedback');
        const buttonsDiv = document.getElementById('nback-buttons');
        
        if (feedback) {
            if (currentTrial < NBACK_N) {
                feedback.textContent = `Remember this letter (${currentTrial + 1}/2)`;
                buttonsDiv.style.display = 'none'; // Hide buttons for first two trials
                awaitingResponse = false;
            } else {
                const actualTrialNumber = currentTrial - NBACK_N + 1;
                const totalResponseTrials = NBACK_TRIALS - NBACK_N;
                feedback.textContent = `Trial ${actualTrialNumber}/${totalResponseTrials} - Does this letter match ${NBACK_N} back? (3s limit)`;
                buttonsDiv.style.display = 'flex'; // Show buttons from trial 3 onwards
                awaitingResponse = true;
            }
        }
        
        if (stimulus) {
            stimulus.innerHTML = `<div class="nback-letter">${trial.letter}</div>`;
        }
        
        trialStartTime = performance.now();

        // Set timeout based on trial type
        if (currentTrial < NBACK_N) {
            // For first two trials (initialization), auto-advance after 3 seconds
            trialTimeout = setTimeout(() => {
                if (currentTrial < NBACK_N) { // Double check we're still in initialization
                    nbackTrials[currentTrial].response = null;
                    nbackTrials[currentTrial].reactionTime = TIME_LIMIT;
                    nbackTrials[currentTrial].correct = true; // No response needed for initialization
                    nbackTrials[currentTrial].timedOut = false;
                    currentTrial++;
                    nextNBackTrial();
                }
            }, TIME_LIMIT);
        } else {
            // For response trials, set timeout for user response
            trialTimeout = setTimeout(() => {
                if (awaitingResponse) {
                    handleNBackTimeout();
                }
            }, TIME_LIMIT);
        }
    }

    function handleNBackResponse(response) {
        if (currentTrial < NBACK_N || !awaitingResponse) return;

        awaitingResponse = false;
        clearAllTimeouts();

        const responseTime = performance.now() - trialStartTime;
        const trial = nbackTrials[currentTrial];
        const isCorrect = response === trial.correctResponse;
        
        // Record trial data
        nbackTrials[currentTrial].response = response;
        nbackTrials[currentTrial].reactionTime = responseTime;
        nbackTrials[currentTrial].correct = isCorrect;
        nbackTrials[currentTrial].timedOut = false;

        // Visual feedback
        const feedback = document.getElementById('cognitive-feedback');
        if (feedback) {
            feedback.textContent = isCorrect ? '✓ Correct' : '✗ Incorrect';
            feedback.style.color = isCorrect ? '#16a34a' : '#dc2626';
        }

        currentTrial++;
        setTimeout(() => {
            if (feedback) {
                feedback.style.color = '#125478';
            }
            nextNBackTrial();
        }, 500);
    }

    function handleNBackTimeout() {
        if (!awaitingResponse) return;
        
        awaitingResponse = false;
        clearAllTimeouts();
        
        const trial = nbackTrials[currentTrial];
        
        // Record timeout as incorrect
        nbackTrials[currentTrial].response = null;
        nbackTrials[currentTrial].reactionTime = TIME_LIMIT;
        nbackTrials[currentTrial].correct = false;
        nbackTrials[currentTrial].timedOut = true;

        // Visual feedback
        const feedback = document.getElementById('cognitive-feedback');
        if (feedback) {
            feedback.textContent = '⏱ Time up!';
            feedback.style.color = '#dc2626';
        }

        currentTrial++;
        setTimeout(() => {
            if (feedback) {
                feedback.style.color = '#125478';
            }
            nextNBackTrial();
        }, 500);
    }

    function endTest() {
        clearAllTimeouts();
        if (responseHandler) {
            document.removeEventListener('keydown', responseHandler);
        }
        
        const testDuration = (performance.now() - testStartTime) / 1000;
        const extractedData = extractCognitiveData(stroopTrials, nbackTrials, testDuration);
        
        showResults(extractedData);
    }

    function showResults(data) {
        updateProgressBar(1.0);
        
        container.innerHTML = `
            <div class="cognitive-results">
                <div class="block-title">Cognitive Test Complete</div>
                <div class="results-content">
                    <h3>Performance Summary</h3>
                    <div class="result-grid">
                        <div class="result-section">
                            <h4>Stroop Test (Incongruent Trials)</h4>
                            <div class="result-item">
                                <strong>Accuracy:</strong> ${(data.stroopAccuracy * 100).toFixed(1)}%
                            </div>
                            <div class="result-item">
                                <strong>Average RT:</strong> ${data.stroopReactionTime.toFixed(0)}ms
                            </div>
                        </div>
                        <div class="result-section">
                            <h4>N-Back Test (Letters)</h4>
                            <div class="result-item">
                                <strong>Accuracy:</strong> ${(data.nbackAccuracy * 100).toFixed(1)}%
                            </div>
                            <div class="result-item">
                                <strong>Average RT:</strong> ${data.nbackReactionTime.toFixed(0)}ms
                            </div>
                        </div>
                        <div class="result-section">
                            <h4>Overall</h4>
                            <div class="result-item">
                                <strong>Combined Score:</strong> ${(data.overallScore * 100).toFixed(1)}%
                            </div>
                        </div>
                    </div>
                    <button class="button primary" onclick="proceedToNext()">
                        ${blockIdx < 3 ? 'Continue' : 'Complete Session'}
                    </button>
                </div>
            </div>
        `;

        window.proceedToNext = () => onComplete(data);
    }

    function extractCognitiveData(stroopResults, nbackResults, testDuration) {
        // Process Stroop data (only valid trials with responses)
        const validStroopTrials = stroopResults.filter(r => r.reactionTime > 0);
        const stroopCorrect = validStroopTrials.filter(r => r.correct).length;
        const stroopAccuracy = validStroopTrials.length > 0 ? stroopCorrect / validStroopTrials.length : 0;
        const stroopMeanRT = validStroopTrials.length > 0 ? 
            validStroopTrials.reduce((sum, r) => sum + r.reactionTime, 0) / validStroopTrials.length : 0;

        // Process N-back data (exclude first two initialization trials)
        const validNBackTrials = nbackResults.filter((r, i) => i >= NBACK_N && r.reactionTime > 0);
        const nbackCorrect = validNBackTrials.filter(r => r.correct).length;
        const nbackAccuracy = validNBackTrials.length > 0 ? nbackCorrect / validNBackTrials.length : 0;
        const nbackMeanRT = validNBackTrials.length > 0 ? 
            validNBackTrials.reduce((sum, r) => sum + r.reactionTime, 0) / validNBackTrials.length : 0;

        const overallScore = (stroopAccuracy + nbackAccuracy) / 2;

        return {
            stroopAccuracy: stroopAccuracy,
            stroopReactionTime: stroopMeanRT,
            nbackAccuracy: nbackAccuracy,
            nbackReactionTime: nbackMeanRT,
            overallScore: overallScore,
            testDuration: testDuration,
            totalStroopTrials: validStroopTrials.length,
            totalNBackTrials: validNBackTrials.length,
            testTaken: true,
            physicalTestTaken: false
        };
    }
}
