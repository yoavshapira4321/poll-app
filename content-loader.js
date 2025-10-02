// content-loader.js
document.addEventListener('DOMContentLoaded', function() {
    // Load the content from content.json
    fetch('content.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            injectContent(data);
            // After content is loaded, initialize the main app
            initializeApp();
        })
        .catch(error => {
            console.error('Error loading content:', error);
            // Fallback to default content if JSON fails to load
            injectFallbackContent();
            initializeApp();
        });

    function injectContent(data) {
        const lang = 'he'; // Default to Hebrew
        const ui = data.ui[lang];
        const system = data.system;

        // Inject header content
        document.querySelector('header h1').textContent = ui.header.title;
        document.querySelector('header p').textContent = ui.header.subtitle;

        // Inject voting section content
        document.querySelector('#voting-section .voter-info h3').textContent = ui.voting.personalInfo;
        document.querySelector('#voter-name').placeholder = ui.voting.namePlaceholder;
        document.querySelector('#voter-email').placeholder = ui.voting.emailPlaceholder;
        document.querySelector('#submit-btn').innerHTML = `<span class="btn-icon">📤</span>${ui.voting.submitButton}`;
        document.querySelector('#progress-text').textContent = system.defaultProgress;
        document.querySelector('.keyboard-help h4').textContent = ui.voting.keyboardHelp;

        // Inject navigation content
        document.querySelector('#prev-btn').innerHTML = `<span class="btn-icon">←</span>${ui.navigation.previous}`;
        document.querySelector('#next-btn').innerHTML = `${ui.navigation.next}<span class="btn-icon">→</span>`;
        
        // Inject answer buttons content
        document.querySelector('#yes-btn').innerHTML = `<span class="btn-icon">✅</span>${ui.answers.yes}`;
        document.querySelector('#no-btn').innerHTML = `<span class="btn-icon">❌</span>${ui.answers.no}`;

        // Inject keyboard shortcuts
        const shortcutsContainer = document.querySelector('.shortcuts');
        shortcutsContainer.innerHTML = '';
        
        // Desktop shortcuts
        data.keyboardShortcuts.desktop.forEach(shortcut => {
            const shortcutEl = document.createElement('span');
            shortcutEl.className = 'shortcut desktop-only';
            shortcutEl.textContent = `${shortcut.key} - ${shortcut.action}`;
            shortcutsContainer.appendChild(shortcutEl);
        });

        // Mobile instructions
        data.keyboardShortcuts.mobile.forEach(instruction => {
            const shortcutEl = document.createElement('span');
            shortcutEl.className = 'shortcut mobile-only';
            shortcutEl.textContent = instruction;
            shortcutsContainer.appendChild(shortcutEl);
        });

        // Inject results section content
        document.querySelector('#results-section h2').textContent = ui.results.title;
        document.querySelector('#results-section .results-header h3').textContent = ui.results.summary;
        document.querySelector('#total-votes').textContent = system.defaultTotalVotes;
        document.querySelector('#copy-results-btn').innerHTML = `<span class="btn-icon">📋</span>${ui.results.copyResults}`;
        document.querySelector('#share-email-btn').innerHTML = `<span class="btn-icon">📧</span>${ui.results.shareEmail}`;
        document.querySelector('#new-vote-btn').innerHTML = `<span class="btn-icon">🗳️</span>${ui.results.newVote}`;
        document.querySelector('#copy-success').innerHTML = `<span class="success-icon">✅</span>${ui.results.copySuccess}`;

        // Inject footer content
        document.querySelector('footer p').textContent = data.footer.text;

        // Store the data for later use
        window.surveyData = data;
    }

    function injectFallbackContent() {
        // Basic fallback content in case JSON fails to load
        const fallbackContent = {
            questions: [
                // Basic fallback questions would go here
            ],
            ui: {
                he: {
                    header: {
                        title: "סקר יחסים - Relationship Survey",
                        subtitle: "אנא ענה על השאלות הבאות בנוגע לרגשותיך במערכות יחסים"
                    },
                    voting: {
                        personalInfo: "מידע אישי (אופציונלי)",
                        namePlaceholder: "שמך",
                        emailPlaceholder: "אימייל",
                        submitButton: "שלח תשובות",
                        keyboardHelp: "קיצורי דרך:"
                    },
                    navigation: {
                        previous: "הקודם",
                        next: "הבא",
                        submit: "שלח תשובות"
                    },
                    answers: {
                        yes: "כן",
                        no: "לא"
                    },
                    results: {
                        title: "תוצאות הסקר",
                        summary: "סיכום קטגוריות",
                        copyResults: "העתק תוצאות",
                        shareEmail: "שתף באימייל",
                        newVote: "מלא שוב",
                        copySuccess: "התוצאות הועתקו!"
                    }
                }
            },
            footer: {
                text: "© 2024 סקר יחסים. כל התשובות אנונימיות."
            }
        };

        injectContent(fallbackContent);
    }

    function initializeApp() {
        // This function will be called after content is loaded
        // The main app logic from script.js will use the window.surveyData
        console.log('Content loaded successfully. Ready to initialize main app.');
    }
});