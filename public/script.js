class PollApp {
    constructor() {
        this.votingSection = document.getElementById('voting-section');
        this.resultsSection = document.getElementById('results-section');
        this.questionsContainer = document.getElementById('question-container');
        this.categoryResults = document.getElementById('category-results');
        this.yourAnswersContainer = document.getElementById('your-answers-container');
        this.totalVotesElement = document.getElementById('total-votes');
        this.copyBtn = document.getElementById('copy-results-btn');
        this.shareEmailBtn = document.getElementById('share-email-btn');
        this.newVoteBtn = document.getElementById('new-vote-btn');
        this.copySuccess = document.getElementById('copy-success');
        
        // Single question elements
        this.questionText = document.getElementById('question-text');
        this.questionCategory = document.getElementById('question-category');
        this.questionCounter = document.getElementById('question-counter');
        this.progressFill = document.getElementById('progress-fill');
        this.progressText = document.getElementById('progress-text');
        this.yesBtn = document.getElementById('yes-btn');
        this.noBtn = document.getElementById('no-btn');
        this.prevBtn = document.getElementById('prev-btn');
        this.nextBtn = document.getElementById('next-btn');
        this.submitBtn = document.getElementById('submit-btn');
        
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        this.currentResults = null;
        
        this.isMobile = this.detectMobile();
        this.touchStartX = 0;
        this.touchEndX = 0;
        
        this.init();
    }

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               window.innerWidth <= 768;
    }

    async init() {
        await this.loadQuestions();
        this.setupEventListeners();
        this.setupTouchEvents();
        this.displayCurrentQuestion();
    }

    // ADD THIS MISSING METHOD
    async loadQuestions() {
        try {
            const response = await fetch('/api/poll');
            const data = await response.json();
            this.questions = data.questions;
        } catch (error) {
            console.error('Error loading questions:', error);
            // Fallback to empty questions if API fails
            this.questions = [];
        }
    }

    setupTouchEvents() {
        if (!this.isMobile) return;
        
        const questionCard = document.querySelector('.question-card');
        
        questionCard.addEventListener('touchstart', (e) => {
            this.touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        questionCard.addEventListener('touchend', (e) => {
            this.touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        }, { passive: true });
    }

    handleSwipe() {
        const swipeThreshold = 50; // minimum swipe distance in pixels
        const swipeDistance = this.touchEndX - this.touchStartX;
        
        if (Math.abs(swipeDistance) < swipeThreshold) return;
        
        if (swipeDistance > 0) {
            // Swipe right - previous question
            this.previousQuestion();
        } else {
            // Swipe left - next question
            this.nextQuestion();
        }
    }

    setupEventListeners() {
        // Answer buttons
        this.yesBtn.addEventListener('click', () => this.selectAnswer('yes'));
        this.noBtn.addEventListener('click', () => this.selectAnswer('no'));
        
        // Navigation buttons
        this.prevBtn.addEventListener('click', () => this.previousQuestion());
        this.nextBtn.addEventListener('click', () => this.nextQuestion());
        this.submitBtn.addEventListener('click', () => this.submitAnswers());
        
        // Keyboard navigation (only for desktop)
        if (!this.isMobile) {
            document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        }
        
        // Results buttons
        this.copyBtn.addEventListener('click', () => this.copyResultsToClipboard());
        this.shareEmailBtn.addEventListener('click', () => this.showEmailInstructions());
        this.newVoteBtn.addEventListener('click', () => this.restartSurvey());
        
        // Handle orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleResize();
            }, 300);
        });
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    handleResize() {
        // Update mobile detection on resize
        this.isMobile = this.detectMobile();
        
        // Add visual feedback for orientation changes
        document.body.classList.toggle('mobile-layout', this.isMobile);
        this.updateMobileUI();
    }

    handleKeyboard(event) {
        // Prevent default behavior only for our keys
        const key = event.key;
        
        switch(key) {
            case '1':
                event.preventDefault();
                this.selectAnswer('yes');
                break;
            case '0':
                event.preventDefault();
                this.selectAnswer('no');
                break;
            case 'ArrowRight':
                event.preventDefault();
                this.nextQuestion();
                break;
            case 'ArrowLeft':
                event.preventDefault();
                this.previousQuestion();
                break;
            case 'Enter':
                if (!this.submitBtn.classList.contains('hidden')) {
                    event.preventDefault();
                    this.submitAnswers();
                }
                break;
        }
    }

    provideHapticFeedback() {
        if (!this.isMobile) return;
        
        // Check if vibration API is available
        if (navigator.vibrate) {
            // Short vibration for feedback
            navigator.vibrate(50);
        }
    }

    displayCurrentQuestion() {
        if (this.questions.length === 0) return;
        
        const question = this.questions[this.currentQuestionIndex];
        const questionNumber = this.currentQuestionIndex + 1;
        const totalQuestions = this.questions.length;
        
        // Update question display
        this.questionText.textContent = question.text;
        this.questionCategory.textContent = `קטגוריה ${question.category}`;
        this.questionCategory.className = `category-badge ${question.category.toLowerCase()}-badge`;
        this.questionCounter.textContent = `${questionNumber}/${totalQuestions}`;
        
        // Update progress
        const progress = (questionNumber / totalQuestions) * 100;
        this.progressFill.style.width = `${progress}%`;
        this.progressText.textContent = `שאלה ${questionNumber} מתוך ${totalQuestions}`;
        
        // Update mobile-specific UI
        this.updateMobileUI();
        
        // Update answer buttons based on current selection
        this.updateAnswerButtons();
        
        // Update navigation buttons
        this.updateNavigationButtons();
    }

    updateMobileUI() {
        // Show/hide mobile-specific elements
        const desktopShortcuts = document.querySelectorAll('.desktop-only');
        const mobileShortcuts = document.querySelectorAll('.mobile-only');
        
        desktopShortcuts.forEach(el => {
            el.style.display = this.isMobile ? 'none' : 'flex';
        });
        
        mobileShortcuts.forEach(el => {
            el.style.display = this.isMobile ? 'flex' : 'none';
        });
        
        // Add mobile-specific classes
        document.body.classList.toggle('mobile-mode', this.isMobile);
    }

    updateAnswerButtons() {
        const currentQuestionId = this.questions[this.currentQuestionIndex].id;
        const currentAnswer = this.userAnswers[currentQuestionId];
        
        // Remove selected class from both buttons
        this.yesBtn.classList.remove('selected');
        this.noBtn.classList.remove('selected');
        
        // Add selected class to current answer
        if (currentAnswer === 'yes') {
            this.yesBtn.classList.add('selected');
        } else if (currentAnswer === 'no') {
            this.noBtn.classList.add('selected');
        }
    }

    updateNavigationButtons() {
        const isFirstQuestion = this.currentQuestionIndex === 0;
        const isLastQuestion = this.currentQuestionIndex === this.questions.length - 1;
        const currentQuestionId = this.questions[this.currentQuestionIndex].id;
        const hasAnswer = this.userAnswers[currentQuestionId] !== undefined;
        
        // Previous button
        this.prevBtn.disabled = isFirstQuestion;
        
        // Next/Submit button
        if (isLastQuestion) {
            this.nextBtn.classList.add('hidden');
            this.submitBtn.classList.remove('hidden');
            this.submitBtn.disabled = !hasAnswer;
        } else {
            this.nextBtn.classList.remove('hidden');
            this.submitBtn.classList.add('hidden');
            this.nextBtn.disabled = !hasAnswer;
        }
    }

    selectAnswer(answer) {
        const question = this.questions[this.currentQuestionIndex];
        this.userAnswers[question.id] = answer;
        
        // Provide haptic feedback on mobile
        this.provideHapticFeedback();
        
        // Update button appearance
        this.updateAnswerButtons();
        
        // Enable navigation
        this.updateNavigationButtons();
        
        // Auto-advance to next question if not the last one
        if (this.currentQuestionIndex < this.questions.length - 1) {
            setTimeout(() => {
                this.nextQuestion();
            }, 300);
        }
    }

    nextQuestion() {
        const currentQuestionId = this.questions[this.currentQuestionIndex].id;
        
        // Only proceed if current question is answered
        if (this.userAnswers[currentQuestionId] !== undefined) {
            this.currentQuestionIndex++;
            this.displayCurrentQuestion();
            
            // Focus on the question for keyboard navigation (desktop only)
            if (!this.isMobile) {
                this.yesBtn.focus();
            }
        }
    }

    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.displayCurrentQuestion();
            
            // Focus on the question for keyboard navigation (desktop only)
            if (!this.isMobile) {
                this.yesBtn.focus();
            }
        }
    }

    async submitAnswers() {
        const userInfo = {
            name: document.getElementById('voter-name').value,
            email: document.getElementById('voter-email').value
        };

        // Validate all questions are answered
        const unansweredQuestions = this.questions.filter(question => 
            this.userAnswers[question.id] === undefined
        );

        if (unansweredQuestions.length > 0) {
            alert('אנא ענה על כל השאלות לפני השליחה');
            // Go to first unanswered question
            const firstUnanswered = this.questions.findIndex(question => 
                this.userAnswers[question.id] === undefined
            );
            this.currentQuestionIndex = firstUnanswered;
            this.displayCurrentQuestion();
            return;
        }

        // Prepare answers for submission
        const answers = this.questions.map(question => ({
            questionId: question.id,
            questionText: question.text,
            category: question.category,
            answer: this.userAnswers[question.id]
        }));

        this.submitBtn.disabled = true;
        this.submitBtn.innerHTML = '<span class="btn-icon">⏳</span> שולח...';

        try {
            const response = await fetch('/api/vote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    answers: answers,
                    userInfo: userInfo
                })
            });

            const result = await response.json();

            if (result.success) {
                this.currentResults = result.results;
                this.userAnswers = result.results.yourAnswers;
                this.showResults();
            } else {
                alert('שגיאה בשליחת התשובות: ' + result.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('שגיאה בשליחת התשובות. אנא נסה שוב.');
        } finally {
            this.submitBtn.disabled = false;
            this.submitBtn.innerHTML = '<span class="btn-icon">📤</span> שלח תשובות (Enter)';
        }
    }

    showResults() {
        this.displayCategoryResults(this.currentResults.summary);
        this.displayYourAnswers(this.userAnswers);
        this.displayDominantCategory(this.currentResults.dominantCategory, this.currentResults.categoryDescriptions);
        this.votingSection.classList.add('hidden');
        this.resultsSection.classList.remove('hidden');
        this.resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    restartSurvey() {
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        this.resultsSection.classList.add('hidden');
        this.votingSection.classList.remove('hidden');
        this.copySuccess.classList.add('hidden');
        document.getElementById('voter-name').value = '';
        document.getElementById('voter-email').value = '';
        this.displayCurrentQuestion();
        this.votingSection.scrollIntoView({ behavior: 'smooth' });
    }

    displayCategoryResults(summary) {
        this.totalVotesElement.textContent = `סה"כ תשובות: ${summary.totalResponses}`;
        
        this.categoryResults.innerHTML = '';
        
        Object.entries(summary.categoryScores).forEach(([category, scores]) => {
            const total = scores.yes + scores.no;
            const yesPercentage = total > 0 ? ((scores.yes / total) * 100).toFixed(1) : 0;
            const noPercentage = total > 0 ? ((scores.no / total) * 100).toFixed(1) : 0;
            
            const categoryCard = document.createElement('div');
            categoryCard.className = 'category-card';
            
            categoryCard.innerHTML = `
                <div class="category-header">
                    <div class="category-title">קטגוריה ${category}</div>
                    <div class="total-responses">סה"כ: ${total}</div>
                </div>
                <div class="category-stats">
                    <div class="stat-item stat-yes">
                        <div class="stat-count">${scores.yes}</div>
                        <div class="stat-label">תשובות "כן"</div>
                        <div class="stat-percentage">${yesPercentage}%</div>
                    </div>
                    <div class="stat-item stat-no">
                        <div class="stat-count">${scores.no}</div>
                        <div class="stat-label">תשובות "לא"</div>
                        <div class="stat-percentage">${noPercentage}%</div>
                    </div>
                </div>
            `;
            
            this.categoryResults.appendChild(categoryCard);
        });
    }

    displayYourAnswers(answers) {
        this.yourAnswersContainer.innerHTML = '';
        
        answers.forEach(answer => {
            const answerElement = document.createElement('div');
            answerElement.className = 'answer-item';
            
            const answerClass = answer.answer === 'yes' ? 'answer-yes' : 'answer-no';
            const answerText = answer.answer === 'yes' ? 'כן' : 'לא';
            
            answerElement.innerHTML = `
                <div class="answer-text">${answer.questionText}</div>
                <div class="answer-value ${answerClass}">${answerText}</div>
            `;
            
            this.yourAnswersContainer.appendChild(answerElement);
        });
    }

    displayDominantCategory(dominantData, descriptions) {
        const existingDominant = document.getElementById('dominant-category');
        if (existingDominant) {
            existingDominant.remove();
        }

        const dominantSection = document.createElement('div');
        dominantSection.id = 'dominant-category';
        dominantSection.className = 'dominant-category';

        const categories = dominantData.dominant;
        const isTie = categories.length > 1;

        let title, description, dominantClass;
        
        if (isTie) {
            title = `שילוב סגנונות: ${categories.join(' + ')}`;
            description = 'נראה שיש לך מאפיינים מכמה סגנונות התקשרות.';
            dominantClass = 'dominant-tie';
        } else {
            const mainCategory = categories[0];
            title = `סגנון התקשרות דומיננטי: ${mainCategory}`;
            description = descriptions[mainCategory];
            
            switch(mainCategory) {
                case 'A':
                    dominantClass = 'dominant-a';
                    break;
                case 'B':
                    dominantClass = 'dominant-b';
                    break;
                case 'C':
                    dominantClass = 'dominant-c';
                    break;
                default:
                    dominantClass = 'dominant-tie';
            }
        }

        dominantSection.innerHTML = `
            <div class="dominant-header ${dominantClass}">
                <h3>${title}</h3>
                <div class="dominant-scores">
                    <span class="score-a">A: ${dominantData.scores.A}</span>
                    <span class="score-b">B: ${dominantData.scores.B}</span>
                    <span class="score-c">C: ${dominantData.scores.C}</span>
                </div>
            </div>
            <div class="dominant-description">
                <p>${description}</p>
            </div>
            ${this.getCategoryBreakdown(dominantData.scores)}
        `;

        this.categoryResults.parentNode.insertBefore(dominantSection, this.categoryResults);
    }

    getCategoryBreakdown(scores) {
        const total = scores.A + scores.B + scores.C;
        if (total === 0) return '';

        const aPercent = ((scores.A / total) * 100).toFixed(1);
        const bPercent = ((scores.B / total) * 100).toFixed(1);
        const cPercent = ((scores.C / total) * 100).toFixed(1);

        return `
            <div class="breakdown">
                <h4>חלוקת התשובות שלך:</h4>
                <div class="breakdown-bars">
                    <div class="breakdown-bar">
                        <div class="breakdown-label">סגנון A</div>
                        <div class="breakdown-bar-container">
                            <div class="breakdown-fill breakdown-a" style="width: ${aPercent}%">
                                <span>${aPercent}%</span>
                            </div>
                        </div>
                        <div class="breakdown-count">${scores.A} תשובות</div>
                    </div>
                    <div class="breakdown-bar">
                        <div class="breakdown-label">סגנון B</div>
                        <div class="breakdown-bar-container">
                            <div class="breakdown-fill breakdown-b" style="width: ${bPercent}%">
                                <span>${bPercent}%</span>
                            </div>
                        </div>
                        <div class="breakdown-count">${scores.B} תשובות</div>
                    </div>
                    <div class="breakdown-bar">
                        <div class="breakdown-label">סגנון C</div>
                        <div class="breakdown-bar-container">
                            <div class="breakdown-fill breakdown-c" style="width: ${cPercent}%">
                                <span>${cPercent}%</span>
                            </div>
                        </div>
                        <div class="breakdown-count">${scores.C} תשובות</div>
                    </div>
                </div>
            </div>
        `;
    }

    async copyResultsToClipboard() {
        if (!this.currentResults) return;

        const resultsText = this.formatResultsForClipboard(this.currentResults.summary);
        
        try {
            await navigator.clipboard.writeText(resultsText);
            
            this.copySuccess.classList.remove('hidden');
            
            const originalText = this.copyBtn.innerHTML;
            this.copyBtn.innerHTML = '<span class="btn-icon">✅</span> הועתק!';
            
            this.copySuccess.scrollIntoView({ behavior: 'smooth' });
            
            setTimeout(() => {
                this.copyBtn.innerHTML = originalText;
            }, 2000);
            
        } catch (error) {
            console.error('Failed to copy results:', error);
            alert('שגיאה בהעתקת התוצאות. אנא נסה שוב.');
        }
    }

    formatResultsForClipboard(summary) {
        let text = `תוצאות סקר יחסים\n\n`;
        text += `סה"כ תשובות: ${summary.totalResponses}\n`;
        text += `עודכן לאחרונה: ${new Date(summary.lastUpdated).toLocaleDateString('he-IL')}\n\n`;
        
        text += `סיכום קטגוריות:\n`;
        
        Object.entries(summary.categoryScores).forEach(([category, scores]) => {
            const total = scores.yes + scores.no;
            const yesPercentage = total > 0 ? ((scores.yes / total) * 100).toFixed(1) : 0;
            const noPercentage = total > 0 ? ((scores.no / total) * 100).toFixed(1) : 0;
            
            text += `\nקטגוריה ${category}:\n`;
            text += `  כן: ${scores.yes} (${yesPercentage}%)\n`;
            text += `  לא: ${scores.no} (${noPercentage}%)\n`;
            text += `  סה"כ: ${total}`;
        });
        
        text += `\n\nקישור לסקר: ${window.location.href}`;
        
        return text;
    }

    showEmailInstructions() {
        alert('התוצאות הועתקו ללוח. ניתן כעת לפתוח תיבת דואר ולהדביק את התוצאות.');
    }
}

// Add CSS for mobile-specific layout
const mobileStyles = `
    .mobile-mode .answer-options {
        gap: 15px;
    }
    
    .mobile-mode .navigation-buttons {
        gap: 10px;
    }
    
    .mobile-mode .keyboard-help {
        margin-top: 20px;
    }
    
    /* Hide keyboard shortcuts on mobile by default */
    .desktop-only {
        display: flex;
    }
    
    .mobile-only {
        display: none;
    }
    
    @media (max-width: 768px) {
        .desktop-only {
            display: none !important;
        }
        
        .mobile-only {
            display: flex !important;
        }
    }
`;

// Inject mobile styles
const styleSheet = document.createElement('style');
styleSheet.textContent = mobileStyles;
document.head.appendChild(styleSheet);

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PollApp();
});