class PollApp {
    constructor() {
        this.votingSection = document.getElementById('voting-section');
        this.resultsSection = document.getElementById('results-section');
        this.form = document.getElementById('poll-form');
        this.resultsContainer = document.getElementById('results-container');
        this.copyBtn = document.getElementById('copy-results-btn');
        this.shareEmailBtn = document.getElementById('share-email-btn');
        this.newVoteBtn = document.getElementById('new-vote-btn');
        this.copySuccess = document.getElementById('copy-success');
        this.emailInstructions = document.getElementById('email-instructions');
        this.totalVotesElement = document.getElementById('total-votes');
        this.resultsQuestion = document.getElementById('results-question');
        
        this.currentResults = null;
        
        this.init();
    }

    init() {
        this.loadResults();
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.copyBtn.addEventListener('click', () => this.copyResultsToClipboard());
        this.shareEmailBtn.addEventListener('click', () => this.showEmailInstructions());
        this.newVoteBtn.addEventListener('click', () => this.showVotingForm());
    }
    displayResults(data) {
    this.resultsQuestion.textContent = data.question;
    this.totalVotesElement.textContent = `Total Votes: ${data.totalVotes}`;
    
    this.resultsContainer.innerHTML = '';
    
    // Sort options by vote count (descending)
    const sortedOptions = Object.entries(data.options)
        .sort(([, votesA], [, votesB]) => votesB - votesA);
    
    sortedOptions.forEach(([option, votes], index) => {
        const percentage = data.totalVotes > 0 
            ? ((votes / data.totalVotes) * 100).toFixed(1) 
            : 0;
        
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        
        // Add ranking indicator
        const rank = index + 1;
        const rankClass = rank === 1 ? 'rank-first' : 
                         rank === 2 ? 'rank-second' : 
                         rank === 3 ? 'rank-third' : 'rank-other';
        
        resultItem.innerHTML = `
            <div class="result-header">
                <div class="rank-badge ${rankClass}">#${rank}</div>
                <div class="result-info">
                    <span class="option-name">${option}</span>
                    <span class="vote-count">${votes} votes (${percentage}%)</span>
                </div>
            </div>
            <div class="result-bar">
                <div class="bar-fill" style="width: ${percentage}%">
                    <span>${percentage}%</span>
                </div>
            </div>
            ${this.getTrendingInfo(rank, percentage)}
        `;
        
        this.resultsContainer.appendChild(resultItem);
    });
}

getTrendingInfo(rank, percentage) {
    if (rank === 1 && percentage > 50) {
        return '<div class="trending-info trending-popular">🌟 Most Popular Choice</div>';
    } else if (rank === 1) {
        return '<div class="trending-info trending-leading">🔥 Currently Leading</div>';
    } else if (percentage < 10) {
        return '<div class="trending-info trending-rare">💎 Rare Choice</div>';
    }
    return '';
}

formatResultsForClipboard(data) {
    let text = `Poll Results: ${data.question}\n\n`;
    text += `Total Votes: ${data.totalVotes}\n\n`;
    
    // Sort by votes descending
    const sortedOptions = Object.entries(data.options)
        .sort(([, votesA], [, votesB]) => votesB - votesA);
    
    sortedOptions.forEach(([option, votes], index) => {
        const percentage = data.totalVotes > 0 
            ? ((votes / data.totalVotes) * 100).toFixed(1) 
            : 0;
        const rank = index + 1;
        text += `#${rank} ${option}: ${votes} votes (${percentage}%)\n`;
    });
    
    text += `\nGenerated on: ${new Date().toLocaleDateString()}\n`;
    text += `Poll URL: ${window.location.href}`;
    
    return text;
}

    async loadResults() {
        try {
            const response = await fetch('/api/poll');
            const data = await response.json();
            this.currentResults = data;
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
                this.currentResults = result.results;
                this.showResults();
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

    showResults() {
        this.displayResults(this.currentResults);
        this.votingSection.classList.add('hidden');
        this.resultsSection.classList.remove('hidden');
        // Scroll to results
        this.resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    showVotingForm() {
        this.resultsSection.classList.add('hidden');
        this.votingSection.classList.remove('hidden');
        this.copySuccess.classList.add('hidden');
        this.emailInstructions.classList.add('hidden');
        this.form.reset();
        // Scroll to voting form
        this.votingSection.scrollIntoView({ behavior: 'smooth' });
    }

    displayResults(data) {
        this.resultsQuestion.textContent = data.question;
        this.totalVotesElement.textContent = `Total Votes: ${data.totalVotes}`;
        
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
                        <span>${percentage}%</span>
                    </div>
                </div>
            `;
            
            this.resultsContainer.appendChild(resultItem);
        });
    }

    async copyResultsToClipboard() {
        if (!this.currentResults) return;

        const resultsText = this.formatResultsForClipboard(this.currentResults);
        
        try {
            await navigator.clipboard.writeText(resultsText);
            
            // Show success message
            this.copySuccess.classList.remove('hidden');
            this.emailInstructions.classList.remove('hidden');
            
            // Change button text temporarily
            const originalText = this.copyBtn.innerHTML;
            this.copyBtn.innerHTML = '<span class="btn-icon">✅</span> Copied!';
            
            // Scroll to success message
            this.copySuccess.scrollIntoView({ behavior: 'smooth' });
            
            // Reset button after 2 seconds
            setTimeout(() => {
                this.copyBtn.innerHTML = originalText;
            }, 2000);
            
        } catch (error) {
            console.error('Failed to copy results:', error);
            alert('Failed to copy results to clipboard. Please try again.');
        }
    }

    formatResultsForClipboard(data) {
        let text = `Poll Results: ${data.question}\n\n`;
        text += `Total Votes: ${data.totalVotes}\n\n`;
        
        Object.entries(data.options).forEach(([option, votes]) => {
            const percentage = data.totalVotes > 0 
                ? ((votes / data.totalVotes) * 100).toFixed(1) 
                : 0;
            text += `${option}: ${votes} votes (${percentage}%)\n`;
        });
        
        text += `\nGenerated on: ${new Date().toLocaleDateString()}\n`;
        text += `Poll URL: ${window.location.href}`;
        
        return text;
    }

    showEmailInstructions() {
        this.emailInstructions.classList.remove('hidden');
        this.emailInstructions.scrollIntoView({ behavior: 'smooth' });
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PollApp();
});