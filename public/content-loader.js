// content-loader.js
document.addEventListener('DOMContentLoaded', function() {
    console.log('Content loader started...');
    
    fetch('/api/content')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok: ' + response.status);
            }
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Expected JSON but got: ' + contentType);
            }
            return response.json();
        })
        .then(data => {
            console.log('Content loaded successfully:', data);
            injectContent(data);
        })
        .catch(error => {
            console.error('Error loading content:', error);
            console.log('Using fallback content...');
            injectFallbackContent();
        });

    function injectContent(data) {
        try {
            const lang = 'he'; // Default to Hebrew
            const ui = data.ui[lang];
            const system = data.system;

            if (!ui) {
                throw new Error('UI content not found for language: ' + lang);
            }

            // Inject header content
            const headerTitle = document.querySelector('header h1');
            const headerSubtitle = document.querySelector('header p');
            if (headerTitle) headerTitle.textContent = ui.header?.title || 'סקר יחסים';
            if (headerSubtitle) headerSubtitle.textContent = ui.header?.subtitle || 'אנא ענה על השאלות הבאות';

            // Inject voting section content
            const personalInfo = document.querySelector('#voting-section .voter-info h3');
            const voterName = document.querySelector('#voter-name');
            const voterEmail = document.querySelector('#voter-email');
            const submitBtn = document.querySelector('#submit-btn');
            const progressText = document.querySelector('#progress-text');
            const keyboardHelp = document.querySelector('.keyboard-help h4');

            if (personalInfo) personalInfo.textContent = ui.voting?.personalInfo || 'מידע אישי';
            if (voterName) voterName.placeholder = ui.voting?.namePlaceholder || 'שמך';
            if (voterEmail) voterEmail.placeholder = ui.voting?.emailPlaceholder || 'אימייל';
            if (submitBtn) submitBtn.innerHTML = `<span class="btn-icon">📤</span>${ui.voting?.submitButton || 'שלח תשובות'}`;
            if (progressText) progressText.textContent = system?.defaultProgress || 'שאלה 1 מתוך 21';
            if (keyboardHelp) keyboardHelp.textContent = ui.voting?.keyboardHelp || 'קיצורי דרך:';

            // Inject navigation content
            const prevBtn = document.querySelector('#prev-btn');
            const nextBtn = document.querySelector('#next-btn');
            
            if (prevBtn) prevBtn.innerHTML = `<span class="btn-icon">←</span>${ui.navigation?.previous || 'הקודם'}`;
            if (nextBtn) nextBtn.innerHTML = `${ui.navigation?.next || 'הבא'}<span class="btn-icon">→</span>`;
            
            // Inject answer buttons content
            const yesBtn = document.querySelector('#yes-btn');
            const noBtn = document.querySelector('#no-btn');
            
            if (yesBtn) yesBtn.innerHTML = `<span class="btn-icon">✅</span>${ui.answers?.yes || 'כן'}`;
            if (noBtn) noBtn.innerHTML = `<span class="btn-icon">❌</span>${ui.answers?.no || 'לא'}`;

            // Inject keyboard shortcuts
            const shortcutsContainer = document.querySelector('.shortcuts');
            if (shortcutsContainer && data.keyboardShortcuts) {
                shortcutsContainer.innerHTML = '';
                
                // Desktop shortcuts
                if (data.keyboardShortcuts.desktop) {
                    data.keyboardShortcuts.desktop.forEach(shortcut => {
                        const shortcutEl = document.createElement('span');
                        shortcutEl.className = 'shortcut desktop-only';
                        shortcutEl.textContent = `${shortcut.key} - ${shortcut.action}`;
                        shortcutsContainer.appendChild(shortcutEl);
                    });
                }

                // Mobile instructions
                if (data.keyboardShortcuts.mobile) {
                    data.keyboardShortcuts.mobile.forEach(instruction => {
                        const shortcutEl = document.createElement('span');
                        shortcutEl.className = 'shortcut mobile-only';
                        shortcutEl.textContent = instruction;
                        shortcutsContainer.appendChild(shortcutEl);
                    });
                }
            }

            // Inject results section content
            const resultsTitle = document.querySelector('#results-section h2');
            const resultsHeader = document.querySelector('#results-section .results-header h3');
            const totalVotes = document.querySelector('#total-votes');
            const copyResultsBtn = document.querySelector('#copy-results-btn');
            const shareEmailBtn = document.querySelector('#share-email-btn');
            const newVoteBtn = document.querySelector('#new-vote-btn');
            const copySuccess = document.querySelector('#copy-success');

            if (resultsTitle) resultsTitle.textContent = ui.results?.title || 'תוצאות הסקר';
            if (resultsHeader) resultsHeader.textContent = ui.results?.summary || 'סיכום קטגוריות';
            if (totalVotes) totalVotes.textContent = system?.defaultTotalVotes || 'סה"כ תשובות: 0';
            if (copyResultsBtn) copyResultsBtn.innerHTML = `<span class="btn-icon">📋</span>${ui.results?.copyResults || 'העתק תוצאות'}`;
            if (shareEmailBtn) shareEmailBtn.innerHTML = `<span class="btn-icon">📧</span>${ui.results?.shareEmail || 'שתף באימייל'}`;
            if (newVoteBtn) newVoteBtn.innerHTML = `<span class="btn-icon">🗳️</span>${ui.results?.newVote || 'מלא שוב'}`;
            if (copySuccess) copySuccess.innerHTML = `<span class="success-icon">✅</span>${ui.results?.copySuccess || 'התוצאות הועתקו!'}`;

            // Inject footer content
            const footer = document.querySelector('footer p');
            if (footer) footer.textContent = data.footer?.text || '© 2024 סקר יחסים. כל התשובות אנונימיות.';

            // Store the data for later use
            window.surveyData = data;
            console.log('Content injected successfully');

        } catch (error) {
            console.error('Error injecting content:', error);
            injectFallbackContent();
        }
    }

    function injectFallbackContent() {
        console.log('Injecting fallback content...');
        // Basic fallback content
        const fallbackContent = {
            questions: [],
            ui: {
                he: {
                    header: {
                        title: "סקר יחסים",
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
                        next: "הבא"
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

        // Store fallback data
        window.surveyData = fallbackContent;
        
        // Simple fallback injection
        const elements = {
            'header h1': 'סקר יחסים',
            'header p': 'אנא ענה על השאלות הבאות בנוגע לרגשותיך במערכות יחסים',
            '#voting-section .voter-info h3': 'מידע אישי (אופציונלי)',
            '#voter-name': 'שמך',
            '#voter-email': 'אימייל',
            '#submit-btn': '📤 שלח תשובות',
            '.keyboard-help h4': 'קיצורי דרך:',
            '#prev-btn': '← הקודם',
            '#next-btn': 'הבא →',
            '#yes-btn': '✅ כן',
            '#no-btn': '❌ לא',
            '#results-section h2': 'תוצאות הסקר',
            '#results-section .results-header h3': 'סיכום קטגוריות',
            '#copy-results-btn': '📋 העתק תוצאות',
            '#share-email-btn': '📧 שתף באימייל',
            '#new-vote-btn': '🗳️ מלא שוב',
            'footer p': '© 2024 סקר יחסים. כל התשובות אנונימיות.'
        };

        Object.entries(elements).forEach(([selector, text]) => {
            const element = document.querySelector(selector);
            if (element) {
                if (selector.includes('-btn')) {
                    element.innerHTML = text;
                } else if (selector.includes('placeholder')) {
                    element.placeholder = text;
                } else {
                    element.textContent = text;
                }
            }
        });
    }
});