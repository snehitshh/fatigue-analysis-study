// Global Configuration
const TOTAL_BLOCKS = 3;
const BREAK_DURATION = 120; // 2 minutes
const PHYSICAL_FATIGUE_DURATION = 720; // 12 minutes (synced with cognitive)

let currentStep = 'demographics'; 
let currentBlock = 1;
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
        'fitts': 'Circular Tapping Test',
        'nasatlx': 'NASA-TLX Assessment',
        'break': 'Rest Period',
        'cognitive': 'Cognitive Battery',
        'physical': 'Physical Fatigue'
    }[currentStep] || currentStep;
    
    progressBar.textContent = `Block ${currentBlock}/${TOTAL_BLOCKS} - ${stepName}`;
}

function showDemographics() {
    currentStep = 'demographics';
    updateProgress();
    mountDemographicsForm(mainContent, (data) => {
        sessionData.demographics = data;
        startBlock(1);
    });
}

function startBlock(blockNum) {
    if (blockNum > TOTAL_BLOCKS) {
        showCompletion();
        return;
    }
    currentBlock = blockNum; 
    sessionData.blocks[currentBlock - 1] = {
        blockNumber: currentBlock,
        startTime: new Date().toISOString()
    };
    showFittsTest();
}

function showFittsTest() {
    currentStep = 'fitts';
    updateProgress();
    // Passing the block index helps fitts.js log correctly
    mountFittsTest(mainContent, onFittsComplete);
}

function onFittsComplete(data) {
    sessionData.blocks[currentBlock - 1].fittsData = data;
    showNASATLX();
}

function showNASATLX() {
    currentStep = 'nasatlx';
    updateProgress();
    mountNASATLX(mainContent, (data) => {
        sessionData.blocks[currentBlock - 1].nasatlxData = data;
        showBreak();
    });
}

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
                <p>Take a break before the next test phase.</p>
                <button class="button primary" onclick="skipBreak()">Skip Break</button>
            </div>`;
    };

    const interval = setInterval(() => {
        timeRemaining--;
        if (timeRemaining <= 0) { clearInterval(interval); showTestSelection(); }
        else renderBreak();
    }, 1000);

    window.skipBreak = () => { clearInterval(interval); showTestSelection(); };
    renderBreak();
}

function showTestSelection() {
    currentStep = 'test-selection';
    updateProgress();
    mainContent.innerHTML = `
        <div class="test-selection-container">
            <div class="block-title">Choose Your Next Test</div>
            <div class="test-options">
                <div class="test-card">
                    <h3>Cognitive Battery</h3>
                    <p>12-minute Stroop and AX-CPT session.</p>
                    <button class="button primary" onclick="selectTest('cognitive')">Start Cognitive</button>
                </div>
                <div class="test-card">
                    <h3>Physical Fatigue</h3>
                    <p>12-minute physical exercise task.</p>
                    <button class="button primary" onclick="selectTest('physical')">Start Physical</button>
                </div>
            </div>
        </div>`;
    
    window.selectTest = (type) => {
        sessionData.blocks[currentBlock - 1].testType = type;
        type === 'cognitive' ? showCognitiveTest() : showPhysicalFatigueTest();
    };
}

function showCognitiveTest() {
    currentStep = 'cognitive';
    updateProgress();
    mountCognitiveTest(mainContent, (data) => {
        sessionData.blocks[currentBlock - 1].cognitiveData = data;
        finishBlock();
    }, currentBlock);
}

function finishBlock() {
    if (currentBlock < TOTAL_BLOCKS) {
        mainContent.innerHTML = `
            <div class="completion-container">
                <h3>Block ${currentBlock} Complete</h3>
                <button class="button primary" onclick="startBlock(${currentBlock + 1})">Next Block</button>
            </div>`;
    } else {
        showCompletion();
    }
}

function showCompletion() {
    currentStep = 'complete';
    updateProgress();
    mainContent.innerHTML = `
        <div class="completion-container">
            <h3>Experiment Complete</h3>
            <button class="button primary" onclick="downloadResults()">Download Final Report</button>
        </div>`;
}