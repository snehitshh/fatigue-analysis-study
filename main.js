const TOTAL_BLOCKS = 3;
const BREAK_DURATION = 120; // 2 minutes in seconds
const PHYSICAL_FATIGUE_DURATION = 600; // 10 minutes in seconds

let currentStep = 'demographics'; // demographics, fitts, nasatlx, break, test-selection, cognitive/physical, complete
let currentBlock = 1;
let sessionData = {
    demographics: {},
    blocks: [],
    startTime: null,
    endTime: null
};

const mainContent = document.getElementById('main-content');
const progressBar = document.getElementById('progress-bar');

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    sessionData.startTime = new Date().toISOString();
    showDemographics();
});

// ----- Progress Updates -----
function updateProgress() {
    let totalSteps = 1 + (TOTAL_BLOCKS * 5); // demographics + (fitts + nasatlx + break + test-selection + cognitive/physical) * 3
    let currentStepNum = 1; // demographics
    
    if (currentStep !== 'demographics') {
        currentStepNum = 1 + ((currentBlock - 1) * 5);
        if (currentStep === 'nasatlx') currentStepNum += 1;
        else if (currentStep === 'break') currentStepNum += 2;
        else if (currentStep === 'test-selection') currentStepNum += 3;
        else if (currentStep === 'cognitive' || currentStep === 'physical') currentStepNum += 4;
        else if (currentStep === 'complete') currentStepNum = totalSteps;
    }
    
    let progressText = '';
    if (currentStep === 'demographics') {
        progressText = 'Demographics Form';
    } else if (currentStep === 'complete') {
        progressText = 'Session Complete';
    } else {
        progressText = `Block ${currentBlock} - ${getStepDisplayName(currentStep)}`;
    }
    
    progressBar.textContent = `${progressText} (${currentStepNum}/${totalSteps})`;
}

function getStepDisplayName(step) {
    const names = {
        'fitts': 'Moving Targets Test',
        'nasatlx': 'NASA-TLX Questionnaire',
        'break': 'Break Period',
        'test-selection': 'Test Selection',
        'cognitive': 'Cognitive Test',
        'physical': 'Physical Fatigue Test'
    };
    return names[step] || step;
}

// ----- Step Navigation -----
function showDemographics() {
    currentStep = 'demographics';
    updateProgress();
    mountDemographicsForm(mainContent, onDemographicsComplete);
}

function onDemographicsComplete(data) {
    sessionData.demographics = data;
    startBlock(1);
}

function startBlock(blockNum) {
    currentBlock = blockNum;
    sessionData.blocks[blockNum - 1] = {
        blockNumber: blockNum,
        startTime: new Date().toISOString(),
        fittsData: null,
        nasatlxData: null,
        testType: null, // 'cognitive' or 'physical'
        cognitiveData: null,
        physicalData: null
    };
    
    showFittsTest();
}

function showFittsTest() {
    currentStep = 'fitts';
    updateProgress();
    mountFittsTest(mainContent, onFittsComplete);
}

function onFittsComplete(data) {
    sessionData.blocks[currentBlock - 1].fittsData = data;
    showNASATLX();
}

function showNASATLX() {
    currentStep = 'nasatlx';
    updateProgress();
    mountNASATLX(mainContent, onNASATLXComplete);
}

function onNASATLXComplete(data) {
    sessionData.blocks[currentBlock - 1].nasatlxData = data;
    showBreak();
}

function showBreak() {
    currentStep = 'break';
    updateProgress();
    showBreakScreen();
}

function showBreakScreen() {
    let timeRemaining = BREAK_DURATION;
    let breakInterval = null;
    let breakSkipped = false;
    
    function updateBreakDisplay() {
        if (breakSkipped) return; // Don't update if break was skipped
        
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        mainContent.innerHTML = `
            <div class="break-container">
                <div class="block-title">Break Period - Block ${currentBlock}</div>
                <div class="break-message">
                    <p>Please take a break before continuing to the next test.</p>
                    <div class="break-timer">${timeStr}</div>
                    <p class="break-instruction">Relax and rest your eyes. The test will continue automatically when the timer reaches zero.</p>
                </div>
                <div class="break-controls">
                    <button class="button primary" onclick="skipBreak()">Skip Break & Continue</button>
                    <p class="skip-note">You can skip the break if you feel ready to continue immediately.</p>
                </div>
            </div>
        `;
    }
    
    // Set up skip break function
    window.skipBreak = function() {
        if (breakSkipped) return; // Prevent multiple calls
        
        breakSkipped = true;
        
        if (breakInterval) {
            clearInterval(breakInterval);
            breakInterval = null;
        }
        
        // Show confirmation message briefly before proceeding
        mainContent.innerHTML = `
            <div class="break-container">
                <div class="block-title">Break Skipped</div>
                <div class="break-message">
                    <p>✓ Break skipped. Proceeding to test selection...</p>
                </div>
            </div>
        `;
        
        setTimeout(() => {
            showTestSelection();
        }, 1000);
    };
    
    // Initial display
    updateBreakDisplay();
    
    // Start countdown
    breakInterval = setInterval(() => {
        if (breakSkipped) {
            clearInterval(breakInterval);
            return;
        }
        
        timeRemaining--;
        updateBreakDisplay();
        
        if (timeRemaining <= 0) {
            clearInterval(breakInterval);
            breakInterval = null;
            
            if (!breakSkipped) {
                showTestSelection();
            }
        }
    }, 1000);
}

function showTestSelection() {
    currentStep = 'test-selection';
    updateProgress();
    
    mainContent.innerHTML = `
        <div class="test-selection-container">
            <div class="block-title">Choose Your Next Test - Block ${currentBlock}</div>
            <p class="selection-instruction">Please select which test you would like to complete:</p>
            
            <div class="test-options">
                <div class="test-option">
                    <div class="test-card cognitive-card">
                        <h3>Cognitive Test</h3>
                        <p>Complete Stroop and N-back cognitive tasks</p>
                        <ul>
                            <li>Tests attention and working memory</li>
                            <li>Takes approximately 3-4 minutes</li>
                            <li>Involves color recognition and memory tasks</li>
                        </ul>
                        <button class="button primary" onclick="selectCognitiveTest()">
                            Start Cognitive Test
                        </button>
                    </div>
                </div>
                
                <div class="test-option">
                    <div class="test-card physical-card">
                        <h3>Physical Fatigue Test</h3>
                        <p>Complete physical exercise for 10 minutes</p>
                        <ul>
                            <li>10-minute timer with start/stop controls</li>
                            <li>You control when to finish the exercise</li>
                            <li>Designed to induce physical fatigue</li>
                        </ul>
                        <button class="button primary" onclick="selectPhysicalTest()">
                            Start Physical Fatigue Test
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    window.selectCognitiveTest = function() {
        sessionData.blocks[currentBlock - 1].testType = 'cognitive';
        showCognitiveTest();
    };
    
    window.selectPhysicalTest = function() {
        sessionData.blocks[currentBlock - 1].testType = 'physical';
        showPhysicalFatigueTest();
    };
}

function showCognitiveTest() {
    currentStep = 'cognitive';
    updateProgress();
    mountCognitiveTest(mainContent, onCognitiveComplete, currentBlock);
}

function onCognitiveComplete(data) {
    sessionData.blocks[currentBlock - 1].cognitiveData = data;
    sessionData.blocks[currentBlock - 1].endTime = new Date().toISOString();
    
    if (currentBlock < TOTAL_BLOCKS) {
        showInterBlockScreen();
    } else {
        showCompletion();
    }
}

function showPhysicalFatigueTest() {
    currentStep = 'physical';
    updateProgress();
    
    let timeRemaining = PHYSICAL_FATIGUE_DURATION;
    let timerInterval = null;
    let timerRunning = false;
    let testStartTime = null;
    
    function updateDisplay() {
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        mainContent.innerHTML = `
            <div class="physical-test-container">
                <div class="block-title">Physical Fatigue Test - Block ${currentBlock}</div>
                <div class="physical-test-content">
                    <div class="timer-section">
                        <h3>Exercise Timer</h3>
                        <div class="timer-display">
                            <div class="main-timer">${timeStr}</div>
                            <div class="timer-label">Time Remaining</div>
                        </div>
                    </div>
                    
                    <div class="timer-controls">
                        ${!timerRunning ? 
                            '<button class="button primary timer-btn" onclick="startTimer()">Start Exercise</button>' :
                            '<button class="button secondary timer-btn" onclick="stopTimer()">Pause Exercise</button>'
                        }
                        <button class="button" onclick="finishPhysicalTest()" style="background: #dc2626; border-color: #dc2626;">
                            Finished Physical Fatigue Exercise
                        </button>
                    </div>
                    
                    <div class="exercise-instructions">
                        <h4>Exercise Instructions:</h4>
                        <ul>
                            <li>Perform physical exercises of your choice (jumping jacks, push-ups, running in place, etc.)</li>
                            <li>Use the Start/Pause button to control the timer</li>
                            <li>Exercise for up to 10 minutes or until you feel adequately fatigued</li>
                            <li>Click "Finished Physical Fatigue Exercise" when you're done</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }
    
    window.startTimer = function() {
        if (!timerRunning) {
            timerRunning = true;
            if (!testStartTime) {
                testStartTime = performance.now();
            }
            
            timerInterval = setInterval(() => {
                timeRemaining = Math.max(0, timeRemaining - 1);
                updateDisplay();
                
                if (timeRemaining <= 0) {
                    clearInterval(timerInterval);
                    timerRunning = false;
                    finishPhysicalTest();
                }
            }, 1000);
            
            updateDisplay();
        }
    };
    
    window.stopTimer = function() {
        if (timerRunning && timerInterval) {
            clearInterval(timerInterval);
            timerRunning = false;
            updateDisplay();
        }
    };
    
    window.finishPhysicalTest = function() {
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        
        const totalTestTime = testStartTime ? (performance.now() - testStartTime) / 1000 : 0;
        const timeUsed = PHYSICAL_FATIGUE_DURATION - timeRemaining;
        
        // Record physical test data
        const physicalData = {
            timeRemaining: timeRemaining,
            timeUsed: timeUsed,
            completed: true,
            testDuration: totalTestTime
        };
        
        // Set cognitive data to indicate physical test was taken instead
        const cognitiveData = {
            stroopAccuracy: 0,
            stroopReactionTime: 0,
            nbackAccuracy: 0,
            nbackReactionTime: 0,
            overallScore: 0,
            testTaken: false,
            physicalTestTaken: true
        };
        
        sessionData.blocks[currentBlock - 1].physicalData = physicalData;
        sessionData.blocks[currentBlock - 1].cognitiveData = cognitiveData;
        sessionData.blocks[currentBlock - 1].endTime = new Date().toISOString();
        
        // Show completion message
        mainContent.innerHTML = `
            <div class="physical-test-container">
                <div class="block-title">Physical Fatigue Test Complete</div>
                <div class="completion-message">
                    <h3>Exercise Complete!</h3>
                    <p>You exercised for ${Math.floor(timeUsed / 60)} minutes and ${Math.floor(timeUsed % 60)} seconds.</p>
                    <p>Proceeding to next block...</p>
                </div>
            </div>
        `;
        
        setTimeout(() => {
            if (currentBlock < TOTAL_BLOCKS) {
                showInterBlockScreen();
            } else {
                showCompletion();
            }
        }, 2000);
    };
    
    // Initial display
    updateDisplay();
}

function showInterBlockScreen() {
    mainContent.innerHTML = `
        <div class="completion-container">
            <div class="block-title">Block ${currentBlock} Complete</div>
            <p>You have completed block ${currentBlock} of ${TOTAL_BLOCKS}.</p>
            <p>When you're ready, click the button below to start block ${currentBlock + 1}.</p>
            <button class="button primary" onclick="startBlock(${currentBlock + 1})">
                Start Block ${currentBlock + 1}
            </button>
        </div>
    `;
}

function showCompletion() {
    currentStep = 'complete';
    updateProgress();
    sessionData.endTime = new Date().toISOString();
    
    mainContent.innerHTML = `
        <div class="completion-container">
            <div class="block-title">Session Complete</div>
            <p>Thank you for participating! You have completed all ${TOTAL_BLOCKS} blocks.</p>
            <p>Your data is ready for download.</p>
            <button class="button primary" onclick="downloadResults()">
                Download Results (CSV)
            </button>
        </div>
    `;
}

// ----- Data Export -----
function downloadResults() {
    const csvData = generateCSVData();
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fatigue_analysis_${sessionData.demographics.participantId || 'participant'}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
}

function generateCSVData() {
    const rows = [];
    const headers = [
        // Demographics
        'participant_id', 'age', 'gender', 'input_device', 'dominant_hand', 'eye_correction',
        'session_start', 'session_end',
        // Block info
        'block_number', 'block_start', 'block_end', 'test_type',
        // Fitts data
        'fitts_success_rate', 'fitts_mean_trial_time', 'fitts_mean_target_time', 'fitts_total_misclicks', 
        'fitts_throughput', 'fitts_mean_blue_target_time', 'fitts_mean_blue_to_first_green_time', 
        'fitts_test_duration', 'fitts_total_trials', 'fitts_successful_trials', 'fitts_terminated_trials', 
        'fitts_trials_with_blue_clicked',
        // NASA-TLX data
        'nasa_mental_demand', 'nasa_physical_demand', 'nasa_temporal_demand', 
        'nasa_performance', 'nasa_effort', 'nasa_frustration', 'nasa_overall_score',
        // Cognitive data (0 if physical test was taken)
        'cognitive_stroop_accuracy', 'cognitive_stroop_rt', 'cognitive_nback_accuracy', 
        'cognitive_nback_rt', 'cognitive_overall_score',
        // Physical test data
        'physical_time_used', 'physical_test_duration'
    ];
    
    rows.push(headers.join(','));
    
    for (let i = 0; i < TOTAL_BLOCKS; i++) {
        const block = sessionData.blocks[i];
        if (!block) continue;
        
        const row = [
            // Demographics
            sessionData.demographics.participantId || '',
            sessionData.demographics.age || '',
            sessionData.demographics.gender || '',
            sessionData.demographics.inputDevice || '',
            sessionData.demographics.dominantHand || '',
            sessionData.demographics.eyeCorrection || '',
            sessionData.startTime || '',
            sessionData.endTime || '',
            // Block info
            block.blockNumber || '',
            block.startTime || '',
            block.endTime || '',
            block.testType || '',
            // Fitts data
            block.fittsData?.successRate || '',
            block.fittsData?.meanTrialTime || '',
            block.fittsData?.meanTargetTime || '',
            block.fittsData?.totalMisclicks || '',
            block.fittsData?.throughput || '',
            block.fittsData?.meanBlueTargetTime || '',
            block.fittsData?.meanBlueToFirstGreenTime || '',
            block.fittsData?.testDuration || '',
            block.fittsData?.totalTrials || '',
            block.fittsData?.successfulTrials || '',
            block.fittsData?.terminatedTrials || '',
            block.fittsData?.trialsWithBlueClicked || '',
            // NASA-TLX data
            block.nasatlxData?.mentalDemand || '',
            block.nasatlxData?.physicalDemand || '',
            block.nasatlxData?.temporalDemand || '',
            block.nasatlxData?.performance || '',
            block.nasatlxData?.effort || '',
            block.nasatlxData?.frustration || '',
            block.nasatlxData?.overallScore || '',
            // Cognitive data
            block.cognitiveData?.stroopAccuracy || '',
            block.cognitiveData?.stroopReactionTime || '',
            block.cognitiveData?.nbackAccuracy || '',
            block.cognitiveData?.nbackReactionTime || '',
            block.cognitiveData?.overallScore || '',
            // Physical test data
            block.physicalData?.timeUsed || '',
            block.physicalData?.testDuration || ''
        ];
        
        rows.push(row.join(','));
    }
    
    return rows.join('\n');
}
