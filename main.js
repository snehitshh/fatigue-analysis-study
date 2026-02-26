// Global Configuration
const TOTAL_BLOCKS = 3;
const BREAK_DURATION = 120; // 2 minutes (120 seconds)
const PHYSICAL_FATIGUE_DURATION = 720; // 12 minutes (720 seconds)

let currentStep = 'demographics'; 
let currentBlock = 1;
let sessionTrack = null; // Stores the randomly assigned track

let sessionData = {
    demographics: {},
    blocks: [],
    startTime: null,
    endTime: null
};

const mainContent = document.getElementById('main-content');
const progressBar = document.getElementById('progress-bar');

document.addEventListener('DOMContentLoaded', function() {
    sessionData.startTime = new Date().toISOString();
    showDemographics();
});

function updateProgress() {
    const stepName = {
        'demographics': 'Participant Info',
        'track-assignment': 'Experiment Track',
        'fitts': 'Circular Tapping Test',
        'nasatlx': 'NASA-TLX Assessment',
        'break': 'Rest Period',
        'cognitive': 'Cognitive Battery',
        'physical': 'Physical Fatigue',
        'complete': 'Finished'
    }[currentStep] || currentStep;
    
    progressBar.textContent = `Block ${currentBlock}/${TOTAL_BLOCKS} - ${stepName}`;
}

// 1. Demographics
function showDemographics() {
    currentStep = 'demographics';
    updateProgress();
    
    // Fallback if demographics.js isn't loaded properly
    if (typeof mountDemographicsForm === "function") {
        mountDemographicsForm(mainContent, (data) => {
            sessionData.demographics = data;
            assignRandomTrack(); 
        });
    } else {
        console.warn("Demographics form not found. Skipping to Track Assignment.");
        sessionData.demographics = { participantId: "TEST_" + Math.floor(Math.random() * 1000) };
        assignRandomTrack();
    }
}

// 2. NEW: Randomly Assign Track instead of asking
function assignRandomTrack() {
    // 50% chance for cognitive, 50% chance for physical
    sessionTrack = Math.random() < 0.5 ? 'cognitive' : 'physical';
    
    currentStep = 'track-assignment';
    updateProgress();
    
    const trackTitle = sessionTrack === 'cognitive' ? 'Cognitive Battery Track' : 'Physical Fatigue Track';
    const trackDesc = sessionTrack === 'cognitive' 
        ? 'You will complete Circular Tapping Tests paired with memory and attention tasks (Stroop & AX-CPT).'
        : 'You will complete Circular Tapping Tests paired with physical exercise routines.';

    mainContent.innerHTML = `
        <div class="test-selection-container" style="text-align: center; margin-top: 40px;">
            <div class="block-title">Track Assignment</div>
            <p style="margin-bottom: 20px; font-size: 1.2em; color: #374151;">
                You have been randomly assigned to the:<br>
                <strong style="color: #2563eb; font-size: 1.3em; display: inline-block; margin-top: 10px;">${trackTitle}</strong>
            </p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; max-width: 500px; margin: 0 auto 30px auto;">
                <p style="margin: 0; color: #4b5563;">${trackDesc}</p>
            </div>
            
            <button class="button primary" onclick="startBlock(1)">
                Begin Experiment
            </button>
        </div>
    `;
}

// 3. Block Initialization
function startBlock(blockNum) {
    if (blockNum > TOTAL_BLOCKS) {
        showCompletion();
        return;
    }
    currentBlock = blockNum; 
    
    sessionData.blocks[currentBlock - 1] = {
        blockNumber: currentBlock,
        startTime: new Date().toISOString(),
        testType: sessionTrack // Automatically log the assigned track
    };
    
    showFittsTest();
}

// 4. Fitts Test
function showFittsTest() {
    currentStep = 'fitts';
    updateProgress();
    mountFittsTest(mainContent, onFittsComplete);
}

function onFittsComplete(data) {
    sessionData.blocks[currentBlock - 1].fittsData = data;
    showNASATLX();
}

// 5. NASA-TLX
function showNASATLX() {
    currentStep = 'nasatlx';
    updateProgress();
    
    if (typeof mountNASATLX === "function") {
        mountNASATLX(mainContent, (data) => {
            sessionData.blocks[currentBlock - 1].nasatlxData = data;
            showBreak();
        });
    } else {
        showBreak(); // Safe bypass
    }
}

// 6. Break Period
function showBreak() {
    currentStep = 'break';
    updateProgress();
    let timeRemaining = BREAK_DURATION;
    
    const renderBreak = () => {
        const mins = Math.floor(timeRemaining / 60);
        const secs = timeRemaining % 60;
        mainContent.innerHTML = `
            <div class="break-container">
                <div class="block-title">Rest Period (${mins}:${secs.toString().padStart(2, '0')})</div>
                <p>Take a break before your ${sessionTrack === 'cognitive' ? 'Cognitive Battery' : 'Physical Exercise'}.</p>
                <button class="button primary" onclick="skipBreak()">Skip Break</button>
            </div>`;
    };

    const interval = setInterval(() => {
        timeRemaining--;
        if (timeRemaining <= 0) { 
            clearInterval(interval); 
            proceedToFatigueTest(); 
        } else {
            renderBreak();
        }
    }, 1000);

    window.skipBreak = () => { 
        clearInterval(interval); 
        proceedToFatigueTest(); 
    };
    
    renderBreak();
}

// 7. Automatic Routing based on Random Assignment
function proceedToFatigueTest() {
    if (sessionTrack === 'cognitive') {
        showCognitiveTest();
    } else {
        showPhysicalFatigueTest();
    }
}

// 8A. Cognitive Test Route
function showCognitiveTest() {
    currentStep = 'cognitive';
    updateProgress();
    mountCognitiveTest(mainContent, (data) => {
        sessionData.blocks[currentBlock - 1].cognitiveData = data;
        finishBlock();
    }, currentBlock);
}

// 8B. Physical Test Route
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
                <div class="block-title">Physical Fatigue Exercise - Block ${currentBlock}</div>
                <div class="physical-test-content" style="text-align: center; margin-top: 20px;">
                    <div style="font-size: 4em; font-weight: bold; margin: 20px 0; color: #1f2937;">
                        ${timeStr}
                    </div>
                    
                    <div class="timer-controls" style="margin-bottom: 30px;">
                        ${!timerRunning ? 
                            '<button class="button primary" onclick="startTimer()">Start Exercise</button>' :
                            '<button class="button secondary" onclick="stopTimer()">Pause</button>'
                        }
                        <button class="button" onclick="finishPhysicalTest()" style="background: #dc2626; color: white; border: none; margin-left: 10px;">
                            Finish Early
                        </button>
                    </div>
                    
                    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; display: inline-block; text-align: left;">
                        <h4 style="margin-top: 0;">Instructions:</h4>
                        <ul style="margin-bottom: 0;">
                            <li>Perform physical exercises (jumping jacks, push-ups, running in place).</li>
                            <li>Use Start/Pause to control the timer.</li>
                            <li>Exercise for the full duration or until adequately fatigued.</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }
    
    window.startTimer = function() {
        if (!timerRunning) {
            timerRunning = true;
            if (!testStartTime) testStartTime = performance.now();
            
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
        if (timerInterval) clearInterval(timerInterval);
        
        const timeUsed = PHYSICAL_FATIGUE_DURATION - timeRemaining;
        sessionData.blocks[currentBlock - 1].physicalData = {
            timeUsed: timeUsed,
            targetDuration: PHYSICAL_FATIGUE_DURATION,
            completed: true
        };
        
        finishBlock();
    };
    
    updateDisplay();
}

// 9. End of Block / Inter-block Screen
function finishBlock() {
    sessionData.blocks[currentBlock - 1].endTime = new Date().toISOString();
    
    if (currentBlock < TOTAL_BLOCKS) {
        mainContent.innerHTML = `
            <div class="completion-container" style="text-align: center; margin-top: 50px;">
                <h3 class="block-title">Block ${currentBlock} Complete</h3>
                <p>Take a deep breath. You are doing great.</p>
                <button class="button primary" style="margin-top: 20px;" onclick="startBlock(${currentBlock + 1})">
                    Begin Block ${currentBlock + 1}
                </button>
            </div>`;
    } else {
        showCompletion();
    }
}

// 10. Final Completion & Download
function showCompletion() {
    currentStep = 'complete';
    updateProgress();
    sessionData.endTime = new Date().toISOString();
    
    // Auto Download
    setTimeout(() => { downloadResults(); }, 500);
    
    mainContent.innerHTML = `
        <div class="completion-container" style="text-align: center; margin-top: 50px;">
            <h3 class="block-title">Experiment Complete</h3>
            <p>Thank you for participating! All ${TOTAL_BLOCKS} blocks are done.</p>
            <p style="color: #16a34a; font-weight: bold; margin: 20px 0;">
                ✓ Your final report has been downloaded automatically.
            </p>
            <button class="button primary" onclick="downloadResults()" style="background: #6b7280; border-color: #6b7280;">
                Download Again
            </button>
        </div>`;
}

// 11. CSV Generation
function downloadResults() {
    const csvData = generateCSVData();
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fatigue_analysis_${sessionData.demographics.participantId || 'participant'}_${new Date().getTime()}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
}

function generateCSVData() {
    const rows = [];
    const headers = [
        'participant_id', 'age', 'gender', 'input_device', 'dominant_hand', 'eye_correction',
        'session_start', 'session_end', 'session_track',
        'block_number', 'block_start', 'block_end',
        'nasa_mental_demand', 'nasa_physical_demand', 'nasa_temporal_demand', 
        'nasa_performance', 'nasa_effort', 'nasa_frustration', 'nasa_overall_score',
        'physical_time_used', 'physical_target_duration'
    ];
    
    rows.push(headers.join(','));
    
    for (let i = 0; i < TOTAL_BLOCKS; i++) {
        const block = sessionData.blocks[i];
        if (!block) continue;
        
        const row = [
            sessionData.demographics.participantId || '',
            sessionData.demographics.age || '',
            sessionData.demographics.gender || '',
            sessionData.demographics.inputDevice || '',
            sessionData.demographics.dominantHand || '',
            sessionData.demographics.eyeCorrection || '',
            sessionData.startTime || '',
            sessionData.endTime || '',
            sessionTrack || '', // Logs the randomized track!
            block.blockNumber || '',
            block.startTime || '',
            block.endTime || '',
            block.nasatlxData?.mentalDemand || '',
            block.nasatlxData?.physicalDemand || '',
            block.nasatlxData?.temporalDemand || '',
            block.nasatlxData?.performance || '',
            block.nasatlxData?.effort || '',
            block.nasatlxData?.frustration || '',
            block.nasatlxData?.overallScore || '',
            block.physicalData?.timeUsed || '',
            block.physicalData?.targetDuration || ''
        ];
        
        rows.push(row.join(','));
    }
    
    return rows.join('\n');
}