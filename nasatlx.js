function mountNASATLX(container, onComplete) {
    const questions = [
        {
            id: 'mentalDemand',
            title: 'Mental Demand',
            question: 'How mentally demanding was the task?',
            scale: '(1 = Very Low, 20 = Very High)'
        },
        {
            id: 'physicalDemand',
            title: 'Physical Demand',
            question: 'How physically demanding was the task?',
            scale: '(1 = Very Low, 20 = Very High)'
        },
        {
            id: 'temporalDemand',
            title: 'Temporal Demand',
            question: 'How hurried or rushed was the pace of the task?',
            scale: '(1 = Very Low, 20 = Very High)'
        },
        {
            id: 'performance',
            title: 'Performance',
            question: 'How successful were you in accomplishing what you were asked to do?',
            scale: '(1 = Perfect, 20 = Failure)'
        },
        {
            id: 'effort',
            title: 'Effort',
            question: 'How hard did you have to work to accomplish your level of performance?',
            scale: '(1 = Very Low, 20 = Very High)'
        },
        {
            id: 'frustration',
            title: 'Frustration',
            question: 'How insecure, discouraged, irritated, stressed, and annoyed were you?',
            scale: '(1 = Very Low, 20 = Very High)'
        }
    ];
    
    container.innerHTML = `
        <div class="nasatlx-container">
            <div class="block-title">NASA-TLX Workload Assessment</div>
            <p class="nasatlx-instruction">Please rate your experience with the previous task on a scale of 1-20:</p>
            
            <div id="nasatlx-warning" class="nasatlx-warning" style="display: none;">
                <strong>⚠️ Warning:</strong> Please enter values between 1 and 20 only.
            </div>
            
            <form id="nasatlx-form">
                ${questions.map(q => `
                    <div class="nasatlx-question">
                        <label class="nasatlx-label">
                            <strong>${q.title}</strong><br>
                            ${q.question}<br>
                            <span class="scale-note">${q.scale}</span>
                        </label>
                        <input type="number" name="${q.id}" min="1" max="20" step="1" required class="nasatlx-input" data-question-id="${q.id}">
                        <div class="input-warning" id="warning-${q.id}" style="display: none;">
                            Please enter a value between 1 and 20
                        </div>
                    </div>
                `).join('')}
                
                <button type="submit" class="button primary" id="submit-btn">Submit Assessment</button>
            </form>
        </div>
    `;

    // Add CSS for warning styles if not already present
    if (!window.__nasatlxWarningCSS) {
        const style = document.createElement('style');
        style.textContent = `
            .nasatlx-warning {
                background: #fef2f2;
                border: 2px solid #fca5a5;
                border-radius: 8px;
                padding: 1em;
                margin: 1em 0;
                color: #dc2626;
                font-weight: 600;
                text-align: center;
            }
            
            .input-warning {
                color: #dc2626;
                font-size: 0.9em;
                font-weight: 500;
                margin-top: 0.5em;
                padding: 0.3em 0.5em;
                background: #fef2f2;
                border-radius: 4px;
                border-left: 3px solid #dc2626;
            }
            
            .nasatlx-input.invalid {
                border-color: #dc2626;
                background-color: #fef2f2;
            }
            
            .nasatlx-input.valid {
                border-color: #16a34a;
                background-color: #f0fdf4;
            }
        `;
        document.head.appendChild(style);
        window.__nasatlxWarningCSS = true;
    }

    // Set up real-time validation
    const inputs = container.querySelectorAll('.nasatlx-input');
    const warningDiv = document.getElementById('nasatlx-warning');
    const submitBtn = document.getElementById('submit-btn');
    
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            validateInput(this);
            updateGlobalWarning();
            updateSubmitButton();
        });
        
        input.addEventListener('blur', function() {
            validateInput(this);
            updateGlobalWarning();
            updateSubmitButton();
        });
    });

    function validateInput(input) {
        const value = parseFloat(input.value);
        const questionId = input.dataset.questionId;
        const warningElement = document.getElementById(`warning-${questionId}`);
        
        if (input.value === '') {
            // Empty input - hide warning but don't mark as valid
            input.classList.remove('invalid', 'valid');
            warningElement.style.display = 'none';
            return false;
        }
        
        if (isNaN(value) || value < 1 || value > 20) {
            // Invalid input - show warning
            input.classList.add('invalid');
            input.classList.remove('valid');
            warningElement.style.display = 'block';
            return false;
        } else {
            // Valid input - hide warning and mark as valid
            input.classList.remove('invalid');
            input.classList.add('valid');
            warningElement.style.display = 'none';
            return true;
        }
    }

    function updateGlobalWarning() {
        const hasInvalidInputs = Array.from(inputs).some(input => {
            const value = parseFloat(input.value);
            return input.value !== '' && (isNaN(value) || value < 1 || value > 20);
        });
        
        if (hasInvalidInputs) {
            warningDiv.style.display = 'block';
        } else {
            warningDiv.style.display = 'none';
        }
    }

    function updateSubmitButton() {
        const allValid = Array.from(inputs).every(input => {
            if (input.value === '') return false; // Required field is empty
            const value = parseFloat(input.value);
            return !isNaN(value) && value >= 1 && value <= 20;
        });
        
        if (allValid) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
        } else {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.6';
            submitBtn.style.cursor = 'not-allowed';
        }
    }

    // Initial state - disable submit button
    updateSubmitButton();
    
    const form = document.getElementById('nasatlx-form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Final validation before submission
        let allValid = true;
        const responses = {};
        let totalScore = 0;
        let count = 0;
        
        for (let input of inputs) {
            if (!validateInput(input)) {
                allValid = false;
            } else {
                const value = parseInt(input.value);
                responses[input.name] = value;
                totalScore += value;
                count++;
            }
        }
        
        updateGlobalWarning();
        
        if (!allValid) {
            // Show error message and prevent submission
            warningDiv.style.display = 'block';
            warningDiv.innerHTML = '<strong>⚠️ Error:</strong> Please correct the highlighted fields before submitting.';
            return;
        }
        
        if (count < questions.length) {
            // Not all fields completed
            warningDiv.style.display = 'block';
            warningDiv.innerHTML = '<strong>⚠️ Error:</strong> Please complete all fields before submitting.';
            return;
        }
        
        responses.overallScore = totalScore / count;
        onComplete(responses);
    });
}
