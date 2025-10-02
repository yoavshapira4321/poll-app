document.addEventListener("DOMContentLoaded", () => {
  fetch("content.json")
    .then(res => res.json())
    .then(content => {
      // Header
      document.querySelector("header h1").textContent = content.header.title;
      document.querySelector("header p").textContent = content.header.subtitle;

      // Voter info
      document.querySelector(".voter-info h3").textContent = content.voterInfo.title;
      document.getElementById("voter-name").placeholder = content.voterInfo.namePlaceholder;
      document.getElementById("voter-email").placeholder = content.voterInfo.emailPlaceholder;

      // Progress bar
      document.getElementById("progress-text").textContent =
        content.progress.textTemplate.replace("{{current}}", "1").replace("{{total}}", "21");

      // Buttons
      document.getElementById("yes-btn").innerHTML = `<span class="btn-icon">✅</span> ${content.questionSection.yes}`;
      document.getElementById("no-btn").innerHTML = `<span class="btn-icon">❌</span> ${content.questionSection.no}`;
      document.getElementById("prev-btn").innerHTML = `<span class="btn-icon">←</span> ${content.navigation.prev}`;
      document.getElementById("next-btn").innerHTML = `${content.navigation.next} <span class="btn-icon">→</span>`;
      document.getElementById("submit-btn").innerHTML = `<span class="btn-icon">📤</span> ${content.navigation.submit}`;

      // Shortcuts
      document.querySelector(".keyboard-help h4").textContent = content.shortcuts.title;
      const shortcuts = document.querySelector(".shortcuts");
      shortcuts.innerHTML = `
        <span class="shortcut desktop-only"><kbd>1</kbd> - ${content.questionSection.yes}</span>
        <span class="shortcut desktop-only"><kbd>0</kbd> - ${content.questionSection.no}</span>
        <span class="shortcut desktop-only"><kbd>→</kbd> - ${content.navigation.next}</span>
        <span class="shortcut desktop-only"><kbd>←</kbd> - ${content.navigation.prev}</span>
        <span class="shortcut desktop-only"><kbd>Enter</kbd> - ${content.navigation.submit}</span>
        <span class="shortcut mobile-only">${content.shortcuts.mobile.tap}</span>
        <span class="shortcut mobile-only">${content.shortcuts.mobile.mobileReady}</span>
      `;

      // Results
      document.querySelector("#results-section h2").textContent = content.results.title;
      document.querySelector(".results-header h3").textContent = content.results.summaryTitle;
      document.getElementById("total-votes").textContent = content.results.totalVotes + "0";
      document.querySelector(".your-answers h3").textContent = content.results.yourAnswers;

      document.getElementById("copy-results-btn").innerHTML = `<span class="btn-icon">📋</span> ${content.results.copyResults}`;
      document.getElementById("share-email-btn").innerHTML = `<span class="btn-icon">📧</span> ${content.results.shareEmail}`;
      document.getElementById("new-vote-btn").innerHTML = `<span class="btn-icon">🗳️</span> ${content.results.newVote}`;

      document.getElementById("copy-success").innerHTML = `<span class="success-icon">✅</span> ${content.results.copySuccess}`;

      // Footer
      document.querySelector("footer p").textContent = content.footer.copyright;
    })
    .catch(err => console.error("Failed to load content.json:", err));
});



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
        try {
            await this.loadQuestions();
            this.setupEventListeners();
            this.setupTouchEvents();
            this.displayCurrentQuestion();
        } catch (error) {
            console.error('Error initializing app:', error);
            this.showError('Failed to load questions. Please refresh the page.');
        }
    }

    async loadQuestions() {
        try {
            console.log('Loading questions from API...');
            const response = await fetch('/api/poll');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Questions loaded:', data.questions?.length || 0);
            this.questions = data.questions || [];
            
            if (this.questions.length === 0) {
                console.warn('No questions received from API');
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
        if (!this.questions || this.questions.length === 0) {
            this.showError('No questions available. Please try refreshing the page.');
            return;
        }
        
        const question = this.questions[this.currentQuestionIndex];
        const questionNumber = this.currentQuestionIndex + 1;
        const totalQuestions = this.questions.length;
        
        this.questionText.textContent = question.text;
        this.questionCategory.textContent = `קטגוריה ${question.category}`;
        this.questionCategory.className = `category-badge ${question.category.toLowerCase()}-badge`;
        this.questionCounter.textContent = `${questionNumber}/${totalQuestions}`;
        
        const progress = (questionNumber / totalQuestions) * 100;
        this.progressFill.style.width = `${progress}%`;
        this.progressText.textContent = `שאלה ${questionNumber} מתוך ${totalQuestions}`;
        
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
        if (!this.questions || this.questions.length === 0) return;
        
        const currentQuestionId = this.questions[this.currentQuestionIndex].id;
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
        if (!this.questions || this.questions.length === 0) return;
        
        const isFirstQuestion = this.currentQuestionIndex === 0;
        const isLastQuestion = this.currentQuestionIndex === this.questions.length - 1;
        const currentQuestionId = this.questions[this.currentQuestionIndex].id;
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
        if (!this.questions || this.questions.length === 0) return;
        
        const question = this.questions[this.currentQuestionIndex];
        this.userAnswers[question.id] = answer;
        
        this.provideHapticFeedback();
        this.updateAnswerButtons();
        this.updateNavigationButtons();
        
        if (this.currentQuestionIndex < this.questions.length - 1) {
            setTimeout(() => {
                this.nextQuestion();
            }, 300);
        }
    }

    nextQuestion() {
        if (!this.questions || this.questions.length === 0) return;
        
        const currentQuestionId = this.questions[this.currentQuestionIndex].id;
        
        if (this.userAnswers[currentQuestionId] !== undefined) {
            this.currentQuestionIndex++;
            this.displayCurrentQuestion();
            
            if (!this.isMobile) {
                this.yesBtn?.focus();
            }
        }
    }

    previousQuestion() {
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
            alert('אנא ענה על כל השאלות לפני השליחה');
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
            this.submitBtn.innerHTML = '<span class="btn-icon">⏳</span> שולח...';
        }

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

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                this.currentResults = result.results;
                this.userAnswers = result.results.yourAnswers;
                this.showResults();
            } else {
                throw new Error(result.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Error submitting answers:', error);
            alert('שגיאה בשליחת התשובות. אנא נסה שוב.');
        } finally {
            if (this.submitBtn) {
                this.submitBtn.disabled = false;
                this.submitBtn.innerHTML = '<span class="btn-icon">📤</span> שלח תשובות (Enter)';
            }
        }
    }

    showResults() {
        if (!this.currentResults) return;
        
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
        
        const voterName = document.getElementById('voter-name');
        const voterEmail = document.getElementById('voter-email');
        if (voterName) voterName.value = '';
        if (voterEmail) voterEmail.value = '';
        
        this.displayCurrentQuestion();
        this.votingSection.scrollIntoView({ behavior: 'smooth' });
    }

    displayCategoryResults(summary) {
        if (!this.totalVotesElement || !this.categoryResults) return;
        
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
        if (!this.yourAnswersContainer) return;
        
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
        let messageConfig;
        
        if (categories.length === 1) {
            messageConfig = CATEGORY_MESSAGES.find(msg => msg.id === categories[0]);
        } else if (categories.length === 2) {
            const tieId = categories.sort().join('');
            messageConfig = CATEGORY_MESSAGES.find(msg => msg.id === tieId);
        } else {
            messageConfig = CATEGORY_MESSAGES.find(msg => msg.id === 'ABC');
        }
        
        if (!messageConfig) {
            messageConfig = {
                title: `סגנון התקשרות דומיננטי: ${categories.join(' + ')}`,
                message: descriptions[categories[0]] || 'לא נמצאה הגדרה ספציפית לסגנון ההתקשרות שלך.'
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

    showError(message) {
        console.error('App Error:', message);
        alert(message);
    }
}

// Complete Category messages configuration
const CATEGORY_MESSAGES = [
  {
    "id": "A",
    "style": "חרד",
    "title": "A דומיננטי – חרד",
    "message": "נראה שסגנון ההתקשרות החרד בולט אצלך. אתה נוטה להשקיע הרבה רגש במערכות יחסים ולעיתים קרובות חושש לאבד את הקרבה עם בן/בת הזוג. הרגישות שלך יכולה לסייע לך לקלוט שינויים במצב הרוח של האחר, אך לעיתים היא מובילה לדאגות מיותרות. עבודה על ביטחון עצמי ובניית אמון הדדי תסייע לך להרגיש רגוע ויציב יותר במערכות יחסים."
  },
  {
    "id": "B",
    "style": "בטוח",
    "title": "B דומיננטי – בטוח",
    "message": "סגנון ההתקשרות הבטוח דומיננטי אצלך. יש לך יכולת טבעית ליצור קרבה וחום במערכות יחסים, ואתה נוטה לשמור על איזון רגשי גם במצבי לחץ. אתה מסוגל לבטא את רגשותיך ולתמוך בבן/בת הזוג בפתיחות. זהו בסיס מצוין להמשך קשרים בריאים ומספקים."
  },
  {
    "id": "C",
    "style": "נמנע",
    "title": "C דומיננטי – נמנע",
    "message": "נראה שסגנון ההתקשרות הנמנע דומיננטי אצלך. אתה מעריך מאוד את העצמאות שלך ולעיתים מתקשה להרגיש בנוח עם קרבה רגשית עמוקה. ייתכן שאתה שומר מרחק כדי להגן על עצמך, אך זה עלול להקשות על חוויית אינטימיות במערכת היחסים. למידה לשתף יותר את עולמך הפנימי יכולה להעשיר את מערכות היחסים שלך."
  },
  {
    "id": "AB",
    "style": "חרד-בטוח",
    "title": "A–B דומיננטיים – חרד ובטוח (תיקו)",
    "message": "יש לך שילוב בין מאפייני סגנון חרד לסגנון בטוח. אתה מעריך קרבה רגשית ומודע לצרכים שלך ושל האחרים, אך לעיתים עולה חשש או חוסר ביטחון בנוגע ליציבות הקשר. טיפוח הביטחון העצמי ושמירה על תקשורת פתוחה יכולים לעזור לך להטות את הכף לכיוון סגנון בטוח יותר."
  },
  {
    "id": "AC",
    "style": "חרד-נמנע",
    "title": "A–C דומיננטיים – חרד ונמנע (תיקו)",
    "message": "אצלך מופיעים גם מאפיינים חרדתיים וגם מאפיינים נמנעים – שילוב שיכול ליצור מתח פנימי בין הרצון בקרבה לצורך לשמור מרחק. לעיתים אתה עשוי לחוות בלבול במערכות יחסים ולשלוח מסרים מעורבים. מודעות לדפוס זה ועבודה על ויסות רגשי ותקשורת ברורה עם בן/בת הזוג יכולים להביא לשיפור בתחושת הביטחון בקשר."
  },
  {
    "id": "BC",
    "style": "בטוח-נמנע",
    "title": "B–C דומיננטיים – בטוח ונמנע (תיקו)",
    "message": "נראה שאתה מאזן בין הצורך בעצמאות ובקרבה. לרוב אתה מרגיש בטוח בקשרים אך לעיתים יש נטייה לשמור על גבולות ברורים מדי ולצמצם אינטימיות. טיפוח נכונות לשתף רגשות ולשמור על גמישות רגשית יחזק את האמון ואת הקרבה עם בן/בת הזוג."
  },
  {
    "id": "ABC",
    "style": "מעורב",
    "title": "A–B–C מאוזנים – תיקו משולש",
    "message": "אין סגנון התקשרות אחד שמוביל בבירור אצלך – אתה מגלה חלקים חרדתיים, בטוחים ונמנעים במינונים דומים. המשמעות היא שהתגובות שלך במערכות יחסים עשויות להשתנות לפי נסיבות, בן/בת הזוג והקשר הספציפי. פיתוח מודעות עצמית ועקביות בתקשורת ובגבולות יכול לסייע לך לבחור את ההתנהלות שמקדמת מערכות יחסים יציבות ובריאות."
  }
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

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PollApp();
});