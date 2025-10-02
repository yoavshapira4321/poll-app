class PollApp {

    displayResults() {
    this.displayCategoryResults(this.currentResults.summary);
    this.displayYourAnswers(this.userAnswers);
    this.displayDominantCategory(this.currentResults.dominantCategory, this.currentResults.categoryDescriptions);
    this.votingSection.classList.add('hidden');
    this.resultsSection.classList.remove('hidden');
    this.resultsSection.scrollIntoView({ behavior: 'smooth' });
}

displayDominantCategory(dominantData, descriptions) {
    // Remove existing dominant category if any
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

    // Insert after category results
    this.categoryResults.parentNode.insertBefore(dominantSection, this.categoryResults.nextSibling);
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
    constructor() {
        this.votingSection = document.getElementById('voting-section');
        this.resultsSection = document.getElementById('results-section');
        this.form = document.getElementById('poll-form');
        this.questionsContainer = document.getElementById('questions-container');
        this.categoryResults = document.getElementById('category-results');
        this.yourAnswersContainer = document.getElementById('your-answers-container');
        this.totalVotesElement = document.getElementById('total-votes');
        this.copyBtn = document.getElementById('copy-results-btn');
        this.shareEmailBtn = document.getElementById('share-email-btn');
        this.newVoteBtn = document.getElementById('new-vote-btn');
        this.copySuccess = document.getElementById('copy-success');
        
        this.questions = [];
        this.currentResults = null;
        this.userAnswers = [];
        
        this.init();
    }

    async init() {
        await this.loadQuestions();
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.copyBtn.addEventListener('click', () => this.copyResultsToClipboard());
        this.shareEmailBtn.addEventListener('click', () => this.showEmailInstructions());
        this.newVoteBtn.addEventListener('click', () => this.showVotingForm());
    }

    async loadQuestions() {
        try {
            const response = await fetch('/api/poll');
            const data = await response.json();
            this.questions = data.questions;
            this.displayQuestions();
        } catch (error) {
            console.error('Error loading questions:', error);
        }
    }

    displayQuestions() {
    this.questionsContainer.innerHTML = '';
    
    this.questions.forEach(question => {
        const questionElement = document.createElement('div');
        questionElement.className = 'question-item';
        
        const badgeClass = `category-badge ${question.category.toLowerCase()}-badge`;
        
        questionElement.innerHTML = `
            <div class="question-header">
                <div class="question-text">${question.text}</div>
                <div class="${badgeClass}">קטגוריה ${question.category}</div>
            </div>
            <div class="yesno-options">
                <div class="yesno-option">
                    <input type="radio" id="q${question.id}-yes" name="q${question.id}" value="yes" required>
                    <label for="q${question.id}-yes" class="yesno-label">כן</label>
                </div>
                <div class="yesno-option">
                    <input type="radio" id="q${question.id}-no" name="q${question.id}" value="no" required>
                    <label for="q${question.id}-no" class="yesno-label">לא</label>
                </div>
            </div>
        `;
        
        this.questionsContainer.appendChild(questionElement);
    });
}

    async handleSubmit(e) {
        e.preventDefault();
        
        // Validate that all questions are answered
        const unansweredQuestions = this.questions.filter(question => {
            return !document.querySelector(`input[name="q${question.id}"]:checked`);
        });
        
        if (unansweredQuestions.length > 0) {
            alert('אנא ענה על כל השאלות לפני השליחה');
            return;
        }

        const userInfo = {
            name: document.getElementById('voter-name').value,
            email: document.getElementById('voter-email').value
        };

        // Collect answers
        const answers = this.questions.map(question => {
            const selectedValue = document.querySelector(`input[name="q${question.id}"]:checked`).value;
            return {
                questionId: question.id,
                questionText: question.text,
                category: question.category,
                answer: selectedValue
            };
        });

        const submitBtn = this.form.querySelector('.submit-btn');
        submitBtn.textContent = 'שולח...';
        submitBtn.disabled = true;

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
            submitBtn.textContent = 'שלח תשובות';
            submitBtn.disabled = false;
        }
    }

    showResults() {
        this.displayCategoryResults(this.currentResults.summary);
        this.displayYourAnswers(this.userAnswers);
        this.votingSection.classList.add('hidden');
        this.resultsSection.classList.remove('hidden');
        this.resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    showVotingForm() {
        this.resultsSection.classList.add('hidden');
        this.votingSection.classList.remove('hidden');
        this.copySuccess.classList.add('hidden');
        this.form.reset();
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

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PollApp();
});