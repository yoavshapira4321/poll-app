class PollApp {
    constructor() {
        this.form = document.getElementById('pollForm');
        this.submitBtn = document.getElementById('submitBtn');
        this.messageEl = document.getElementById('message');
        
        // Auto-detect API URL based on current domain
        this.apiBaseUrl = window.location.hostname === 'localhost' 
            ? 'http://localhost:5000/api' 
            : '/api'; // Use relative path for production

        this.init();
    }

    init() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(this.form);
        const selectedOption = formData.get('pollOption');
        
        if (!selectedOption) {
            this.showMessage('Please select an option before submitting.', 'error');
            return;
        }

        this.setLoading(true);

        try {
            const response = await fetch(`${this.apiBaseUrl}/poll/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question: 'How satisfied are you with our service?',
                    selectedOption: selectedOption
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                this.showMessage('Thank you! Your response has been recorded successfully.', 'success');
                this.form.reset();
            } else {
                throw new Error(result.message || 'Failed to submit poll');
            }

        } catch (error) {
            console.error('Submission error:', error);
            this.showMessage('Sorry, there was an error submitting your response. Please try again.', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(loading) {
        this.submitBtn.disabled = loading;
        this.submitBtn.textContent = loading ? 'Submitting...' : 'Submit Response';
    }

    showMessage(text, type) {
        this.messageEl.textContent = text;
        this.messageEl.className = `message ${type}`;
        this.messageEl.style.display = 'block';

        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                this.messageEl.style.display = 'none';
            }, 5000);
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PollApp();
});