// script.js - Complete fixed version with error handling
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
        
        // Use the data from content-loader.js
        this.content = window.surveyData;
        this.ui = this.content?.ui?.he;
        this.categoryMessages = this.content?.categoryMessages || CATEGORY_MESSAGES;
        
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
        
        // Initialize with fallback questions to prevent undefined errors
        this.questions = this.content?.questions || FALLBACK_QUESTIONS;
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
        try {
            console.log('Initializing PollApp...');
            console.log('Questions loaded:', this.questions.length);
            
            // Double-check we have questions
            if (this.questions.length === 0) {
                console.warn('No questions found, using fallback');
                this.questions = FALLBACK_QUESTIONS;
            }
            
            this.setupEventListeners();
            this.setupTouchEvents();
            this.displayCurrentQuestion();
        } catch (error) {
            console.error('Error initializing app:', error);
            this.showError(this.ui?.errors?.loadError || 'Failed to load questions. Please refresh the page.');
        }
    }

    async loadQuestions() {
        try {
            // Fallback to API if content not available
            const response = await fetch('/api/poll');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            this.questions = data.questions || [];
            
            if (this.questions.length === 0) {
                console.warn('No questions available');
            }
        } catch (error) {
            console.error('Error loading questions:', error);
            this.questions = [];
            throw error;
        }
    }

    setupTouchEvents() {
        if (!this.isMobile) return;
        
        const questionCard = document.querySelector('.question-card');
        if (!questionCard) return;
        
        questionCard.addEventListener('touchstart', (e) => {
            this.touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        questionCard.addEventListener('touchend', (e) => {
            this.touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        }, { passive: true });
    }

    handleSwipe() {
        const swipeThreshold = 50;
        const swipeDistance = this.touchEndX - this.touchStartX;
        
        if (Math.abs(swipeDistance) < swipeThreshold) return;
        
        if (swipeDistance > 0) {
            this.previousQuestion();
        } else {
            this.nextQuestion();
        }
    }

    setupEventListeners() {
        this.yesBtn?.addEventListener('click', () => this.selectAnswer('yes'));
        this.noBtn?.addEventListener('click', () => this.selectAnswer('no'));
        this.prevBtn?.addEventListener('click', () => this.previousQuestion());
        this.nextBtn?.addEventListener('click', () => this.nextQuestion());
        this.submitBtn?.addEventListener('click', () => this.submitAnswers());
        
        if (!this.isMobile) {
            document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        }
        
        this.copyBtn?.addEventListener('click', () => this.copyResultsToClipboard());
        this.shareEmailBtn?.addEventListener('click', () => this.showEmailInstructions());
        this.newVoteBtn?.addEventListener('click', () => this.restartSurvey());
        
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleResize();
            }, 300);
        });
        
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    handleResize() {
        this.isMobile = this.detectMobile();
        document.body.classList.toggle('mobile-layout', this.isMobile);
        this.updateMobileUI();
    }

    handleKeyboard(event) {
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
                if (this.submitBtn && !this.submitBtn.classList.contains('hidden')) {
                    event.preventDefault();
                    this.submitAnswers();
                }
                break;
        }
    }

    provideHapticFeedback() {
        if (!this.isMobile) return;
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }

    displayCurrentQuestion() {
        // ADD COMPREHENSIVE SAFETY CHECK
        if (!this.questions || this.questions.length === 0) {
            this.showError(this.ui?.errors?.loadError || 'No questions available. Please try refreshing the page.');
            return;
        }
        
        // Ensure current index is within bounds
        if (this.currentQuestionIndex >= this.questions.length) {
            console.warn('Current index out of bounds, resetting to 0');
            this.currentQuestionIndex = 0;
        }
        
        const question = this.questions[this.currentQuestionIndex];
        
        // ADD SAFETY CHECK FOR QUESTION OBJECT
        if (!question) {
            console.error('Invalid question at index:', this.currentQuestionIndex);
            this.showError('Invalid question data. Please refresh the page.');
            return;
        }
        
        const questionNumber = this.currentQuestionIndex + 1;
        const totalQuestions = this.questions.length;
        
        this.questionText.textContent = question.text || 'Question text not available';
        this.questionCategory.textContent = `${this.ui?.categories?.[question.category] || `קטגוריה ${question.category}`}`;
        this.questionCategory.className = `category-badge ${question.category?.toLowerCase()}-badge` || 'category-badge';
        this.questionCounter.textContent = `${questionNumber}/${totalQuestions}`;
        
        const progress = (questionNumber / totalQuestions) * 100;
        this.progressFill.style.width = `${progress}%`;
        
        // Use localized progress text
        if (this.ui?.voting?.progressText) {
            this.progressText.textContent = this.ui.voting.progressText
                .replace('{current}', questionNumber)
                .replace('{total}', totalQuestions);
        } else {
            this.progressText.textContent = `שאלה ${questionNumber} מתוך ${totalQuestions}`;
        }
        
        this.updateMobileUI();
        this.updateAnswerButtons();
        this.updateNavigationButtons();
    }

    updateMobileUI() {
        const desktopShortcuts = document.querySelectorAll('.desktop-only');
        const mobileShortcuts = document.querySelectorAll('.mobile-only');
        
        desktopShortcuts.forEach(el => {
            el.style.display = this.isMobile ? 'none' : 'flex';
        });
        
        mobileShortcuts.forEach(el => {
            el.style.display = this.isMobile ? 'flex' : 'none';
        });
        
        document.body.classList.toggle('mobile-mode', this.isMobile);
    }

    updateAnswerButtons() {
        // ADD SAFETY CHECK
        if (!this.questions || this.questions.length === 0 || this.currentQuestionIndex >= this.questions.length) {
            return;
        }
        
        const currentQuestion = this.questions[this.currentQuestionIndex];
        // ADD SAFETY CHECK FOR QUESTION OBJECT
        if (!currentQuestion || !currentQuestion.id) {
            console.error('Invalid question at index:', this.currentQuestionIndex, currentQuestion);
            return;
        }
        
        const currentQuestionId = currentQuestion.id;
        const currentAnswer = this.userAnswers[currentQuestionId];
        
        this.yesBtn?.classList.remove('selected');
        this.noBtn?.classList.remove('selected');
        
        if (currentAnswer === 'yes') {
            this.yesBtn?.classList.add('selected');
        } else if (currentAnswer === 'no') {
            this.noBtn?.classList.add('selected');
        }
    }

    updateNavigationButtons() {
        // ADD SAFETY CHECK
        if (!this.questions || this.questions.length === 0 || this.currentQuestionIndex >= this.questions.length) {
            return;
        }
        
        const currentQuestion = this.questions[this.currentQuestionIndex];
        // ADD SAFETY CHECK FOR QUESTION OBJECT
        if (!currentQuestion || !currentQuestion.id) {
            console.error('Invalid question at index:', this.currentQuestionIndex, currentQuestion);
            return;
        }
        
        const isFirstQuestion = this.currentQuestionIndex === 0;
        const isLastQuestion = this.currentQuestionIndex === this.questions.length - 1;
        const currentQuestionId = currentQuestion.id;
        const hasAnswer = this.userAnswers[currentQuestionId] !== undefined;
        
        if (this.prevBtn) {
            this.prevBtn.disabled = isFirstQuestion;
        }
        
        if (isLastQuestion) {
            this.nextBtn?.classList.add('hidden');
            this.submitBtn?.classList.remove('hidden');
            if (this.submitBtn) {
                this.submitBtn.disabled = !hasAnswer;
            }
        } else {
            this.nextBtn?.classList.remove('hidden');
            this.submitBtn?.classList.add('hidden');
            if (this.nextBtn) {
                this.nextBtn.disabled = !hasAnswer;
            }
        }
    }

    selectAnswer(answer) {
        // ADD SAFETY CHECK
        if (!this.questions || this.questions.length === 0 || this.currentQuestionIndex >= this.questions.length) {
            console.error('Cannot select answer: no questions available');
            return;
        }
        
        const question = this.questions[this.currentQuestionIndex];
        // ADD SAFETY CHECK FOR QUESTION OBJECT
        if (!question || !question.id) {
            console.error('Invalid question at index:', this.currentQuestionIndex, question);
            return;
        }
        
        this.userAnswers[question.id] = answer;
        
        this.provideHapticFeedback();
        this.updateAnswerButtons();
        this.updateNavigationButtons();
        
        // Auto-advance only if not on mobile (mobile users might want to review)
        if (!this.isMobile && this.currentQuestionIndex < this.questions.length - 1) {
            setTimeout(() => {
                this.nextQuestion();
            }, 300);
        }
    }

    nextQuestion() {
        // ADD COMPREHENSIVE SAFETY CHECK
        if (!this.questions || this.questions.length === 0) {
            console.error('Cannot navigate: no questions available');
            return;
        }
        
        if (this.currentQuestionIndex >= this.questions.length) {
            console.error('Current question index out of bounds:', this.currentQuestionIndex);
            this.currentQuestionIndex = 0; // Reset to safe value
            this.displayCurrentQuestion();
            return;
        }
        
        const currentQuestion = this.questions[this.currentQuestionIndex];
        // ADD SAFETY CHECK FOR QUESTION OBJECT
        if (!currentQuestion || !currentQuestion.id) {
            console.error('Invalid question at index:', this.currentQuestionIndex, currentQuestion);
            this.currentQuestionIndex = 0; // Reset to safe value
            this.displayCurrentQuestion();
            return;
        }
        
        const currentQuestionId = currentQuestion.id;
        
        if (this.userAnswers[currentQuestionId] !== undefined) {
            this.currentQuestionIndex++;
            // CHECK IF WE'RE STILL WITHIN BOUNDS AFTER INCREMENTING
            if (this.currentQuestionIndex >= this.questions.length) {
                this.currentQuestionIndex = this.questions.length - 1; // Stay at last question
            }
            this.displayCurrentQuestion();
            
            if (!this.isMobile) {
                this.yesBtn?.focus();
            }
        }
    }

    previousQuestion() {
        // ADD SAFETY CHECK
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.displayCurrentQuestion();
            
            if (!this.isMobile) {
                this.yesBtn?.focus();
            }
        }
    }

    async submitAnswers() {
        if (!this.questions || this.questions.length === 0) return;

        const userInfo = {
            name: document.getElementById('voter-name')?.value || '',
            email: document.getElementById('voter-email')?.value || ''
        };

        const unansweredQuestions = this.questions.filter(question => 
            this.userAnswers[question.id] === undefined
        );

        if (unansweredQuestions.length > 0) {
            alert(this.ui?.errors?.noAnswer || 'אנא ענה על כל השאלות לפני השליחה');
            const firstUnanswered = this.questions.findIndex(question => 
                this.userAnswers[question.id] === undefined
            );
            this.currentQuestionIndex = firstUnanswered;
            this.displayCurrentQuestion();
            return;
        }

        const answers = this.questions.map(question => ({
            questionId: question.id,
            questionText: question.text,
            category: question.category,
            answer: this.userAnswers[question.id]
        }));

        if (this.submitBtn) {
            this.submitBtn.disabled = true;
            this.submitBtn.innerHTML = `<span class="btn-icon">⏳</span> ${this.ui?.voting?.sending || 'שולח...'}`;
        }

        try {
            // For demo purposes, we'll simulate API response
            // In a real app, you would send this to your backend
            const mockResults = this.calculateResults(answers);
            
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this.currentResults = mockResults;
            this.showResults();
            
        } catch (error) {
            console.error('Error submitting answers:', error);
            alert(this.ui?.errors?.submitError || 'שגיאה בשליחת התשובות. אנא נסה שוב.');
        } finally {
            if (this.submitBtn) {
                this.submitBtn.disabled = false;
                const submitText = this.ui?.voting?.submitButton || 'שלח תשובות';
                this.submitBtn.innerHTML = `<span class="btn-icon">📤</span>${submitText}`;
            }
        }
    }

    // Calculate results locally for demo purposes
    calculateResults(answers) {
        const categoryScores = {
            A: { yes: 0, no: 0 },
            B: { yes: 0, no: 0 },
            C: { yes: 0, no: 0 }
        };

        // Count yes/no answers per category
        answers.forEach(answer => {
            if (categoryScores[answer.category]) {
                categoryScores[answer.category][answer.answer]++;
            }
        });

        // Calculate dominant category
        const categoryTotals = {
            A: categoryScores.A.yes,
            B: categoryScores.B.yes,
            C: categoryScores.C.yes
        };

        const maxScore = Math.max(categoryTotals.A, categoryTotals.B, categoryTotals.C);
        const dominantCategories = Object.keys(categoryTotals).filter(
            cat => categoryTotals[cat] === maxScore
        );

        return {
            summary: {
                totalResponses: answers.length,
                categoryScores: categoryScores,
                lastUpdated: new Date().toISOString()
            },
            dominantCategory: {
                dominant: dominantCategories,
                scores: categoryTotals
            },
            yourAnswers: answers
        };
    }

    showResults() {
        if (!this.currentResults) return;
        
        this.displayCategoryResults(this.currentResults.summary);
        this.displayYourAnswers(this.currentResults.yourAnswers);
        this.displayDominantCategory(this.currentResults.dominantCategory);
        this.votingSection.classList.add('hidden');
        this.resultsSection.classList.remove('hidden');
        this.resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    restartSurvey() {
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        this.currentResults = null;
        this.resultsSection.classList.add('hidden');
        this.votingSection.classList.remove('hidden');
        this.copySuccess.classList.add('hidden');
        
        const voterName = document.getElementById('voter-name');
        const voterEmail = document.getElementById('voter-email');
        if (voterName) voterName.value = '';
        if (voterEmail) voterEmail.value = '';
        
        this.displayCurrentQuestion();
        this.votingSection.scrollIntoView({ behavior: 'smooth' });
    }

    displayCategoryResults(summary) {
        if (!this.totalVotesElement || !this.categoryResults) return;
        
        // Use localized text for total votes
        if (this.ui?.results?.totalResponses) {
            this.totalVotesElement.textContent = this.ui.results.totalResponses.replace('{count}', summary.totalResponses);
        } else {
            this.totalVotesElement.textContent = `סה"כ תשובות: ${summary.totalResponses}`;
        }
        
        this.categoryResults.innerHTML = '';
        
        Object.entries(summary.categoryScores).forEach(([category, scores]) => {
            const total = scores.yes + scores.no;
            const yesPercentage = total > 0 ? ((scores.yes / total) * 100).toFixed(1) : 0;
            const noPercentage = total > 0 ? ((scores.no / total) * 100).toFixed(1) : 0;
            
            const categoryCard = document.createElement('div');
            categoryCard.className = 'category-card';
            
            const categoryName = this.ui?.categories?.[category] || `קטגוריה ${category}`;
            const yesLabel = this.ui?.categories?.yesAnswers || 'תשובות "כן"';
            const noLabel = this.ui?.categories?.noAnswers || 'תשובות "לא"';
            
            categoryCard.innerHTML = `
                <div class="category-header">
                    <div class="category-title">${categoryName}</div>
                    <div class="total-responses">סה"כ: ${total}</div>
                </div>
                <div class="category-stats">
                    <div class="stat-item stat-yes">
                        <div class="stat-count">${scores.yes}</div>
                        <div class="stat-label">${yesLabel}</div>
                        <div class="stat-percentage">${yesPercentage}%</div>
                    </div>
                    <div class="stat-item stat-no">
                        <div class="stat-count">${scores.no}</div>
                        <div class="stat-label">${noLabel}</div>
                        <div class="stat-percentage">${noPercentage}%</div>
                    </div>
                </div>
            `;
            
            this.categoryResults.appendChild(categoryCard);
        });
    }

    displayYourAnswers(answers) {
        if (!this.yourAnswersContainer) return;
        
        this.yourAnswersContainer.innerHTML = '';
        
        answers.forEach(answer => {
            const answerElement = document.createElement('div');
            answerElement.className = 'answer-item';
            
            const answerClass = answer.answer === 'yes' ? 'answer-yes' : 'answer-no';
            const answerText = answer.answer === 'yes' ? 
                (this.ui?.answers?.yes || 'כן') : 
                (this.ui?.answers?.no || 'לא');
            
            answerElement.innerHTML = `
                <div class="answer-text">${answer.questionText}</div>
                <div class="answer-value ${answerClass}">${answerText}</div>
            `;
            
            this.yourAnswersContainer.appendChild(answerElement);
        });
    }

    displayDominantCategory(dominantData) {
        const existingDominant = document.getElementById('dominant-category');
        if (existingDominant) {
            existingDominant.remove();
        }

        const dominantSection = document.createElement('div');
        dominantSection.id = 'dominant-category';
        dominantSection.className = 'dominant-category';

        const categories = dominantData.dominant;
        let messageConfig;
        
        if (categories.length === 1) {
            messageConfig = this.categoryMessages.find(msg => msg.id === categories[0]);
        } else if (categories.length === 2) {
            const tieId = categories.sort().join('');
            messageConfig = this.categoryMessages.find(msg => msg.id === tieId);
        } else {
            messageConfig = this.categoryMessages.find(msg => msg.id === 'ABC');
        }
        
        if (!messageConfig) {
            messageConfig = {
                title: `סגנון התקשרות דומיננטי: ${categories.join(' + ')}`,
                message: 'לא נמצאה הגדרה ספציפית לסגנון ההתקשרות שלך.',
                style: 'מעורב'
            };
        }

        const dominantClass = this.getDominantClass(categories);

        dominantSection.innerHTML = `
            <div class="dominant-header ${dominantClass}">
                <h3>${messageConfig.title}</h3>
                <div class="dominant-scores">
                    <span class="score-a">A: ${dominantData.scores.A}</span>
                    <span class="score-b">B: ${dominantData.scores.B}</span>
                    <span class="score-c">C: ${dominantData.scores.C}</span>
                </div>
            </div>
            <div class="dominant-description">
                <div class="message-header">
                    <span class="style-badge">סגנון: ${messageConfig.style}</span>
                </div>
                <p class="personal-message">${messageConfig.message}</p>
            </div>
            ${this.getCategoryBreakdown(dominantData.scores)}
        `;

        if (this.categoryResults && this.categoryResults.parentNode) {
            this.categoryResults.parentNode.insertBefore(dominantSection, this.categoryResults);
        }
    }

    getDominantClass(categories) {
        if (categories.length === 1) {
            switch(categories[0]) {
                case 'A': return 'dominant-a';
                case 'B': return 'dominant-b';
                case 'C': return 'dominant-c';
            }
        } else if (categories.length === 2) {
            if (categories.includes('A') && categories.includes('B')) return 'dominant-ab';
            if (categories.includes('A') && categories.includes('C')) return 'dominant-ac';
            if (categories.includes('B') && categories.includes('C')) return 'dominant-bc';
        }
        return 'dominant-abc';
    }

    getCategoryBreakdown(scores) {
        const total = scores.A + scores.B + scores.C;
        if (total === 0) return '';

        const aPercent = ((scores.A / total) * 100).toFixed(1);
        const bPercent = ((scores.B / total) * 100).toFixed(1);
        const cPercent = ((scores.C / total) * 100).toFixed(1);

        const breakdownLabel = this.ui?.categories?.breakdown || 'חלוקת התשובות שלך:';
        const styleALabel = this.ui?.categories?.styleA || 'סגנון A';
        const styleBLabel = this.ui?.categories?.styleB || 'סגנון B';
        const styleCLabel = this.ui?.categories?.styleC || 'סגנון C';

        return `
            <div class="breakdown">
                <h4>${breakdownLabel}</h4>
                <div class="breakdown-bars">
                    <div class="breakdown-bar">
                        <div class="breakdown-label">${styleALabel}</div>
                        <div class="breakdown-bar-container">
                            <div class="breakdown-fill breakdown-a" style="width: ${aPercent}%">
                                <span>${aPercent}%</span>
                            </div>
                        </div>
                        <div class="breakdown-count">${scores.A} תשובות</div>
                    </div>
                    <div class="breakdown-bar">
                        <div class="breakdown-label">${styleBLabel}</div>
                        <div class="breakdown-bar-container">
                            <div class="breakdown-fill breakdown-b" style="width: ${bPercent}%">
                                <span>${bPercent}%</span>
                            </div>
                        </div>
                        <div class="breakdown-count">${scores.B} תשובות</div>
                    </div>
                    <div class="breakdown-bar">
                        <div class="breakdown-label">${styleCLabel}</div>
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
            this.copyBtn.innerHTML = `<span class="btn-icon">✅</span> ${this.ui?.results?.copied || 'הועתק!'}`;
            
            this.copySuccess.scrollIntoView({ behavior: 'smooth' });
            
            setTimeout(() => {
                const copyText = this.ui?.results?.copyResults || 'העתק תוצאות';
                this.copyBtn.innerHTML = `<span class="btn-icon">📋</span>${copyText}`;
            }, 2000);
            
        } catch (error) {
            console.error('Failed to copy results:', error);
            alert(this.ui?.errors?.copyError || 'שגיאה בהעתקת התוצאות. אנא נסה שוב.');
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
            
            const categoryName = this.ui?.categories?.[category] || `קטגוריה ${category}`;
            const yesLabel = this.ui?.categories?.yesAnswers || 'תשובות "כן"';
            const noLabel = this.ui?.categories?.noAnswers || 'תשובות "לא"';
            
            text += `\n${categoryName}:\n`;
            text += `  ${yesLabel}: ${scores.yes} (${yesPercentage}%)\n`;
            text += `  ${noLabel}: ${scores.no} (${noPercentage}%)\n`;
            text += `  סה"כ: ${total}`;
        });
        
        text += `\n\nקישור לסקר: ${window.location.href}`;
        
        return text;
    }

    showEmailInstructions() {
        alert(this.ui?.results?.emailInstructions || 'התוצאות הועתקו ללוח. ניתן כעת לפתוח תיבת דואר ולהדביק את התוצאות.');
    }

    showError(message) {
        console.error('App Error:', message);
        alert(message);
    }
}

// Complete Category messages configuration
const CATEGORY_MESSAGES = [
  //{
  //  "id": "A",
  //  "style": "חרד",
  //  "title": "A דומיננטי – חרד",
  //  "message": "נראה שסגנון ההתקשרות החרד בולט אצלך. אתה נוטה להשקיע הרבה רגש במערכות יחסים ולעיתים קרובות חושש לאבד את הקרבה עם בן/בת הזוג. הרגישות שלך יכולה לסייע לך לקלוט שינויים במצב הרוח של האחר, אך לעיתים היא מובילה לדאגות מיותרות. עבודה על ביטחון עצמי ובניית אמון הדדי תסייע לך להרגיש רגוע ויציב יותר במערכות יחסים."
  //},
  //{
  //  "id": "B",
  //  "style": "בטוח",
  //  "title": "B דומיננטי – בטוח",
  //  "message": "סגנון ההתקשרות הבטוח דומיננטי אצלך. יש לך יכולת טבעית ליצור קרבה וחום במערכות יחסים, ואתה נוטה לשמור על איזון רגשי גם במצבי לחץ. אתה מסוגל לבטא את רגשותיך ולתמוך בבן/בת הזוג בפתיחות. זהו בסיס מצוין להמשך קשרים בריאים ומספקים."
  //},
  //{
  //  "id": "C",
  //  "style": "נמנע",
  //  "title": "C דומיננטי – נמנע",
  //  "message": "נראה שסגנון ההתקשרות הנמנע דומיננטי אצלך. אתה מעריך מאוד את העצמאות שלך ולעיתים מתקשה להרגיש בנוח עם קרבה רגשית עמוקה. ייתכן שאתה שומר מרחק כדי להגן על עצמך, אך זה עלול להקשות על חוויית אינטימיות במערכת היחסים. למידה לשתף יותר את עולמך הפנימי יכולה להעשיר את מערכות היחסים שלך."
  //},
  //{
  //  "id": "AB",
  //  "style": "חרד-בטוח",
  //  "title": "A–B דומיננטיים – חרד ובטוח (תיקו)",
  //  "message": "יש לך שילוב בין מאפייני סגנון חרד לסגנון בטוח. אתה מעריך קרבה רגשית ומודע לצרכים שלך ושל האחרים, אך לעיתים עולה חשש או חוסר ביטחון בנוגע ליציבות הקשר. טיפוח הביטחון העצמי ושמירה על תקשורת פתוחה יכולים לעזור לך להטות את הכף לכיוון סגנון בטוח יותר."
  //},
  //{
  //  "id": "AC",
  //  "style": "חרד-נמנע",
  //  "title": "A–C דומיננטיים – חרד ונמנע (תיקו)",
  //  "message": "אצלך מופיעים גם מאפיינים חרדתיים וגם מאפיינים נמנעים – שילוב שיכול ליצור מתח פנימי בין הרצון בקרבה לצורך לשמור מרחק. לעיתים אתה עשוי לחוות בלבול במערכות יחסים ולשלוח מסרים מעורבים. מודעות לדפוס זה ועבודה על ויסות רגשי ותקשורת ברורה עם בן/בת הזוג יכולים להביא לשיפור בתחושת הביטחון בקשר."
  //},
  //{
  //  "id": "BC",
  //  "style": "בטוח-נמנע",
  //  "title": "B–C דומיננטיים – בטוח ונמנע (תיקו)",
  //  "message": "נראה שאתה מאזן בין הצורך בעצמאות ובקרבה. לרוב אתה מרגיש בטוח בקשרים אך לעיתים יש נטייה לשמור על גבולות ברורים מדי ולצמצם אינטימיות. טיפוח נכונות לשתף רגשות ולשמור על גמישות רגשית יחזק את האמון ואת הקרבה עם בן/בת הזוג."
  //},
  //{
  //  "id": "ABC",
  //  "style": "מעורב",
  //  "title": "A–B–C מאוזנים – תיקו משולש",
  //  "message": "אין סגנון התקשרות אחד שמוביל בבירור אצלך – אתה מגלה חלקים חרדתיים, בטוחים ונמנעים במינונים דומים. המשמעות היא שהתגובות שלך במערכות יחסים עשויות להשתנות לפי נסיבות, בן/בת הזוג והקשר הספציפי. פיתוח מודעות עצמית ועקביות בתקשורת ובגבולות יכול לסייע לך לבחור את ההתנהלות שמקדמת מערכות יחסים יציבות ובריאות."
  //}
];

// Comprehensive fallback questions
const FALLBACK_QUESTIONS = [
  //{id: 1, text: "אני לעתים קרובות דואג/ת שבן/בת הזוג שלי יפסיק/ה לאהוב אותי.", category: "A", type: "yesno"},
  //{id: 2, text: "אני מוצא/ת שקל לי להיות חיבה כלפי בן/בת הזוג שלי.", category: "B", type: "yesno"},
  //{id: 3, text: "אני חושש/ת שברגע שמישהו/י יכיר את עצמי האמיתי/ת, הוא/היא לא יאהב/ה אותי.", category: "A", type: "yesno"},
  //{id: 4, text: "אני מוצא/ת שאני מתאושש/ת מהר אחרי פרידה – זה מוזר איך אני יכול/ה פשוט להוציא מישהו/י מהראש שלי.", category: "C", type: "yesno"},
  //{id: 5, text: "כשאני לא במערכת יחסים, אני מרגיש/ה קצת חרד/ת ולא שלם/ה.", category: "A", type: "yesno"},
  //{id: 6, text: "אני מוצא/ת שקשה לי לתמוך רגשית בבן/בת הזוג שלי כשהוא/היא מדוכא/ת.", category: "C", type: "yesno"},
  //{id: 7, text: "כשבן/בת הזוג שלי רחוק/ה, אני חושש/ת שהוא/היא עלול/ה להתעניין במישהו/י אחר/ת.", category: "A", type: "yesno"},
  //{id: 8, text: "אני מרגיש/ה בנוח להיות תלוי/ה בבני זוג רומנטיים.", category: "B", type: "yesno"},
  //{id: 9, text: "העצמאות שלי חשובה לי יותר ממערכות היחסים שלי.", category: "C", type: "yesno"},
  //{id: 10, text: "אני מעדיף/ה לא לשתף את בן/בת הזוג שלי ברגשותיי הפנימיים ביותר.", category: "C", type: "yesno"},
  //{id: 11, text: "כשאני מראה/ה לבן/בת הזוג שלי איך אני מרגיש/ה, אני חושש/ת שהוא/היא לא ירגיש/ה אותו דבר כלפיי.", category: "A", type: "yesno"},
  //{id: 12, text: "אני בדרך כלל מרוצה/ת ממערכות היחסים הרומנטיות שלי.", category: "B", type: "yesno"},
  //{id: 13, text: "אני לא מרגיש/ה צורך להתנהג בצורה יוצאת דופן במערכות היחסים הרומנטיות שלי.", category: "B", type: "yesno"},
  //{id: 14, text: "אני חושב/ת הרבה על מערכות היחסים שלי.", category: "A", type: "yesno"},
  //{id: 15, text: "אני מתקשה להיות תלוי/ה בבני/בנות זוג רומנטיים.", category: "C", type: "yesno"},
  //{id: 16, text: "אני נוטה להיקשר מהר מאוד לבן/בת זוג רומנטי/ת.", category: "A", type: "yesno"},
  //{id: 17, text: "יש לי מעט קושי לבטא את הצרכים והרצונות שלי לבן/בת הזוג שלי.", category: "C", type: "yesno"},
  //{id: 18, text: "לפעמים אני מרגיש/ה כועס/ת או מוטרד/ת על בן/בת הזוג שלי בלי לדעת למה.", category: "A", type: "yesno"},
  //{id: 19, text: "אני מאוד רגיש/ה למצבי הרוח של בן/בת הזוג שלי.", category: "A", type: "yesno"},
  //{id: 20, text: "אני מאמין/ה שרוב האנשים הם במהותם כנים ואמינים.", category: "B", type: "yesno"},
  //{id: 21, text: "אני מעדיף/ה סקס מזדמן עם בני זוג לא מחויבים על פני סקס אינטימי עם אדם אחד.", category: "C", type: "yesno"},
  //{id: 22, text: "אני מרגיש/ה בנוח לשתף את המחשבות והרגשות האישיים שלי עם בן/בת הזוג שלי.", category: "B", type: "yesno"},
  //{id: 23, text: "אני דואג/ת שאם מישהו/י יעזוב אותי, לעולם לא אמצא מישהו/י אחר/ת.", category: "A", type: "yesno"},
  //{id: 24, text: "זה גורם לי להתעצבן כשבן/בת הזוג שלי נהיה/ית כל כך רגיש/ה.", category: "C", type: "yesno"},
  //{id: 25, text: "במהלך קונפליקט, אני נוטה להתעלם מהנושאים שלי בצורה רפויה, במקום להתמודד איתם ישירות.", category: "C", type: "yesno"},
  //{id: 26, text: "ויכוח עם בן/בת הזוג שלי בדרך כלל לא גורם לי להטיל ספק בכל מערכת היחסים שלנו.", category: "B", type: "yesno"},
  //{id: 27, text: "בני הזוג שלי רוצים לעתים קרובות שאהיה יותר אינטימי/ת ממה שנוח לי להיות.", category: "C", type: "yesno"},
  //{id: 28, text: "אני דואג/ת שאני לא מספיק מושך/ת.", category: "A", type: "yesno"},
  //{id: 29, text: "לפעמים אנשים רואים אותי משעמם/ת כי אני יוצר/ת מעט דרמה במערכות יחסים.", category: "B", type: "yesno"},
  //{id: 30, text: "אני מתגעגע/ת לבן/בת הזוג שלי כשאנחנו נפרדים, אבל כשאנחנו ביחד אני מרגיש/ה צורך לברוח.", category: "C", type: "yesno"},
  //{id: 31, text: "כשאני לא מסכים/ה עם מישהו/י, אני מרגיש/ה בנוח להביע את דעותיי.", category: "B", type: "yesno"},
  //{id: 32, text: "אני שונא/ת להרגיש שאנשים אחרים תלויים בי.", category: "C", type: "yesno"},
  //{id: 33, text: "אם אני שם/ה לב שמישהו/י שאני מעוניין/ת בו/ה בודק/ת אנשים אחרים, אני לא נותן/ת לזה להטריד אותי – אולי ארגיש צביטה של קנאה, אבל היא חולפת.", category: "B", type: "yesno"},
  //{id: 34, text: "אם אני שם/ה לב שמישהו/י שאני מעוניין/ת בו/ה בודק/ת אנשים אחרים, אני מרגיש/ה הקלה – זה אומר שהוא/היא לא מחפש/ת להפוך את הדברים לאקסקלוסיביים.", category: "C", type: "yesno"},
  //{id: 35, text: "אם אני שם/ה לב שמישהו/י שאני מעוניין/ת בו/ה בודק/ת אנשים אחרים, זה גורם לי להרגיש מדוכא/ת.", category: "A", type: "yesno"},
  //{id: 36, text: "אם מישהו/י שיצאתי איתו/ה מתחיל/ה להתנהג בקרירות ובמרחק, אני אולי תוהה מה קרה, אבל אדע שזה כנראה לא קשור אליי.", category: "B", type: "yesno"},
  //{id: 37, text: "אם מישהו/י שיצאתי איתו/ה מתחיל/ה להתנהג בקרירות ובמרחק, כנראה אהיה אדיש/ה – אולי אפילו ארגיש הקלה.", category: "C", type: "yesno"},
  //{id: 38, text: "אם מישהו/י שיצאתי איתו/ה מתחיל/ה להתנהג בקרירות ובמרחק, אדאג שעשיתי משהו לא בסדר.", category: "A", type: "yesno"},
  //{id: 39, text: "אם בן/בת זוגי היה/תה נפרד/ת ממני, הייתי מנסה להראות לו/ה מה הוא/היא מפספס/ת (קצת קנאה לא תזיק).", category: "A", type: "yesno"},
  //{id: 40, text: "אם מישהו/י שיצאתי איתו/ה כבר כמה חודשים אומר/ת שהוא/היא רוצה להפסיק להיפגש איתי, הייתי מרגיש/ה פגוע/ה בהתחלה, אבל הייתי מתגבר/ת על זה.", category: "B", type: "yesno"},
  //{id: 41, text: "לפעמים כשאני מקבל/ת את מה שאני רוצה במערכת יחסים, אני כבר לא בטוח/ה מה אני רוצה.", category: "C", type: "yesno"},
  //{id: 42, text: "לא תהיה לי בעיה לשמור על קשר עם האקס שלי (אפלטוני לחלוטין) – אחרי הכול, יש לנו הרבה במשותף.", category: "B", type: "yesno"}
];

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

// Initialize the app when DOM is loaded and content is ready
function initializeAppWhenReady() {
    console.log('DOM loaded, checking for survey data...');
    if (window.surveyData) {
        console.log('Survey data found, initializing app...');
        new PollApp();
    } else {
        console.log('Survey data not ready, waiting...');
        // Wait for content to be loaded
        setTimeout(initializeAppWhenReady, 100);
    }
}

document.addEventListener('DOMContentLoaded', initializeAppWhenReady);