class PollApp {
    constructor() {
        this.form = document.getElementById('poll-form');
        this.resultsDiv = document.getElementById('results');
        this.resultsContainer = document.getElementById('results-container');
        
        this.init();
    }

    init() {
        this.loadResults();
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    async loadResults() {
        try {
            const response = await fetch('/api/poll');
            const data = await response.json();
            this.displayResults(data);
        } catch (error) {
            console.error('Error loading results:', error);
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const selectedOption = document.querySelector('input[name="poll-option"]:checked');
        if (!selectedOption) {
            alert('Please select an option before submitting!');
            return;
        }

        const voterInfo = {
            name: document.getElementById('voter-name').value,
            email: document.getElementById('voter-email').value
        };

        const submitBtn = this.form.querySelector('.submit-btn');
        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/api/vote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    selectedOption: selectedOption.value,
                    voterInfo: voterInfo
                })
            });

            const result = await response.json();

            if (result.success) {
                this.displayResults(result.results);
                this.resultsDiv.classList.remove('hidden');
                this.form.reset();
                alert('Thank you for your vote! Results have been updated.');
            } else {
                alert('Error submitting vote: ' + result.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error submitting vote. Please try again.');
        } finally {
            submitBtn.textContent = 'Submit Vote';
            submitBtn.disabled = false;
        }
    }

    displayResults(data) {
        this.resultsContainer.innerHTML = '';
        
        Object.entries(data.options).forEach(([option, votes]) => {
            const percentage = data.totalVotes > 0 
                ? ((votes / data.totalVotes) * 100).toFixed(1) 
                : 0;
            
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            
            resultItem.innerHTML = `
                <div class="result-info">
                    <span>${option}</span>
                    <span>${votes} votes (${percentage}%)</span>
                </div>
                <div class="result-bar">
                    <div class="bar-fill" style="width: ${percentage}%">
                        ${percentage}%
                    </div>
                </div>
            `;
            
            this.resultsContainer.appendChild(resultItem);
        });

        const totalVotes = document.createElement('div');
        totalVotes.className = 'total-votes';
        totalVotes.innerHTML = `<strong>Total Votes: ${data.totalVotes}</strong>`;
        totalVotes.style.marginTop = '15px';
        totalVotes.style.paddingTop = '15px';
        totalVotes.style.borderTop = '1px solid #e9ecef';
        
        this.resultsContainer.appendChild(totalVotes);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PollApp();
});