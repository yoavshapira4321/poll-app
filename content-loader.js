class ContentLoader {
    constructor() {
        this.content = null;
        this.init();
    }

    async init() {
        try {
            await this.loadContent();
            this.injectContent();
            this.setupDynamicUpdaters();
        } catch (error) {
            console.error('Error loading content:', error);
        }
    }

    async loadContent() {
        try {
            const response = await fetch('/content.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.content = await response.json();
            console.log('Content loaded successfully');
        } catch (error) {
            console.error('Failed to load content.json:', error);
            // Fallback to empty content to prevent crashes
            this.content = {
                ui: { he: {} },
                questions: [],
                categoryMessages: [],
                keyboardShortcuts: {},
                footer: {},
                system: {}
            };
        }
    }

    injectContent() {
        if (!this.content) return;

        // Inject header content
        this.injectHeaderContent();
        
        // Inject voting section content
        this.injectVotingContent();
        
        // Inject results section content
        this.injectResultsContent();
        
        // Inject footer content
        this.injectFooterContent();
        
        // Inject keyboard shortcuts
        this.injectKeyboardShortcuts();
    }

    injectHeaderContent() {
        const header = this.content.ui?.he?.header;
        if (!header) return;

        const headerTitle = document.querySelector('header h1');
        const headerSubtitle = document.querySelector('header p');

        if (headerTitle && header.title) {
            headerTitle.textContent = header.title;
        }
        if (headerSubtitle && header.subtitle) {
            headerSubtitle.textContent = header.subtitle;
        }
    }

    injectVotingContent() {
        const voting = this.content.ui?.he?.voting;
        if (!voting) return;

        // Personal info section
        const personalInfoTitle = document.querySelector('.voter-info h3');
        if (personalInfoTitle && voting.personalInfo) {
            personalInfoTitle.textContent = voting.personalInfo;
        }

        // Input placeholders
        const nameInput = document.getElementById('voter-name');
        const emailInput = document.getElementById('voter-email');
        if (nameInput && voting.namePlaceholder) {
            nameInput.placeholder = voting.namePlaceholder;
        }
        if (emailInput && voting.emailPlaceholder) {
            emailInput.placeholder = voting.emailPlaceholder;
        }

        // Answer buttons
        const yesBtn = document.getElementById('yes-btn');
        const noBtn = document.getElementById('no-btn');
        if (yesBtn && this.content.ui?.he?.answers?.yes) {
            yesBtn.innerHTML = `<span class="btn-icon">✅</span> ${this.content.ui.he.answers.yes}`;
        }
        if (noBtn && this.content.ui?.he?.answers?.no) {
            noBtn.innerHTML = `<span class="btn-icon">❌</span> ${this.content.ui.he.answers.no}`;
        }

        // Navigation buttons
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const submitBtn = document.getElementById('submit-btn');
        
        if (prevBtn && this.content.ui?.he?.navigation?.previous) {
            prevBtn.innerHTML = `<span class="btn-icon">←</span> ${this.content.ui.he.navigation.previous}`;
        }
        if (nextBtn && this.content.ui?.he?.navigation?.next) {
            nextBtn.innerHTML = `${this.content.ui.he.navigation.next} <span class="btn-icon">→</span>`;
        }
        if (submitBtn && this.content.ui?.he?.navigation?.submit) {
            submitBtn.innerHTML = `<span class="btn-icon">📤</span> ${this.content.ui.he.navigation.submit}`;
        }

        // Progress text (set initial value)
        const progressText = document.getElementById('progress-text');
        if (progressText && this.content.system?.defaultProgress) {
            progressText.textContent = this.content.system.defaultProgress;
        }

        // Question counter (set initial value)
        const questionCounter = document.getElementById('question-counter');
        if (questionCounter && this.content.system?.defaultQuestionCounter) {
            questionCounter.textContent = this.content.system.defaultQuestionCounter;
        }

        // Category badge (set initial value)
        const questionCategory = document.getElementById('question-category');
        if (questionCategory && this.content.system?.defaultCategory) {
            questionCategory.textContent = this.content.system.defaultCategory;
        }
    }

    injectResultsContent() {
        const results = this.content.ui?.he?.results;
        if (!results) return;

        // Results title
        const resultsTitle = document.querySelector('#results-section h2');
        if (resultsTitle && results.title) {
            resultsTitle.textContent = results.title;
        }

        // Summary title
        const summaryTitle = document.querySelector('.results-header h3');
        if (summaryTitle && results.summary) {
            summaryTitle.textContent = results.summary;
        }

        // Your answers title
        const yourAnswersTitle = document.querySelector('.your-answers h3');
        if (yourAnswersTitle && results.yourAnswers) {
            yourAnswersTitle.textContent = results.yourAnswers;
        }

        // Action buttons
        const copyBtn = document.getElementById('copy-results-btn');
        const shareEmailBtn = document.getElementById('share-email-btn');
        const newVoteBtn = document.getElementById('new-vote-btn');
        
        if (copyBtn && results.copyResults) {
            copyBtn.innerHTML = `<span class="btn-icon">📋</span> ${results.copyResults}`;
        }
        if (shareEmailBtn && results.shareEmail) {
            shareEmailBtn.innerHTML = `<span class="btn-icon">📧</span> ${results.shareEmail}`;
        }
        if (newVoteBtn && results.newVote) {
            newVoteBtn.innerHTML = `<span class="btn-icon">🗳️</span> ${results.newVote}`;
        }

        // Success message
        const copySuccess = document.getElementById('copy-success');
        if (copySuccess && results.copySuccess) {
            copySuccess.innerHTML = `<span class="success-icon">✅</span> ${results.copySuccess}`;
        }

        // Total votes (set initial value)
        const totalVotes = document.getElementById('total-votes');
        if (totalVotes && this.content.system?.defaultTotalVotes) {
            totalVotes.textContent = this.content.system.defaultTotalVotes;
        }
    }

    injectFooterContent() {
        const footer = this.content.footer;
        if (!footer?.text) return;

        const footerElement = document.querySelector('footer p');
        if (footerElement) {
            footerElement.textContent = footer.text;
        }
    }

    injectKeyboardShortcuts() {
        const keyboardHelp = document.querySelector('.keyboard-help h4');
        if (keyboardHelp && this.content.ui?.he?.voting?.keyboardHelp) {
            keyboardHelp.textContent = this.content.ui.he.voting.keyboardHelp;
        }

        const shortcuts = this.content.keyboardShortcuts;
        if (!shortcuts) return;

        const desktopShortcuts = document.querySelectorAll('.desktop-only');
        const mobileShortcuts = document.querySelectorAll('.mobile-only');

        // Desktop shortcuts
        if (desktopShortcuts.length > 0 && shortcuts.desktop) {
            shortcuts.desktop.forEach((shortcut, index) => {
                if (desktopShortcuts[index]) {
                    desktopShortcuts[index].innerHTML = `<kbd>${shortcut.key}</kbd> - ${shortcut.action}`;
                }
            });
        }

        // Mobile shortcuts
        if (mobileShortcuts.length > 0 && shortcuts.mobile) {
            shortcuts.mobile.forEach((text, index) => {
                if (mobileShortcuts[index]) {
                    mobileShortcuts[index].textContent = text;
                }
            });
        }
    }

    setupDynamicUpdaters() {
        // This method sets up content that might need to be updated dynamically
        // For now, it's a placeholder for future dynamic content updates
    }

    // Public method to get content (can be used by other scripts)
    getContent() {
        return this.content;
    }

    // Public method to get specific content section
    getSection(section) {
        return this.content?.[section];
    }

    // Public method to get UI text
    getUIText(key) {
        const keys = key.split('.');
        let value = this.content.ui?.he;
        
        for (const k of keys) {
            value = value?.[k];
        }
        
        return value || '';
    }

    // Public method to format template strings
    formatTemplate(template, data) {
        return template.replace(/{(\w+)}/g, (match, key) => {
            return data[key] !== undefined ? data[key] : match;
        });
    }
}

// Initialize content loader when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.contentLoader = new ContentLoader();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ContentLoader;
}