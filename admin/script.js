let contentData = {};
let isAuthenticated = false;
let authToken = '';
// Check if already logged in (from session storage)
document.addEventListener('DOMContentLoaded', function() {
    const savedToken = sessionStorage.getItem('adminAuthToken');
    if (savedToken) {
        verifyToken(savedToken);
    }
});
async function login() {
    const password = document.getElementById('adminPassword').value;
    
    if (!password) {
        showLoginError('Please enter a password');
        return;
    }
    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password })
        });
        const result = await response.json();
        if (result.success) {
            authToken = result.token;
            sessionStorage.setItem('adminAuthToken', authToken);
            isAuthenticated = true;
            showAdminInterface();
            loadContent();
        } else {
            showLoginError(result.error || 'Invalid password');
        }
    } catch (error) {
        showLoginError('Login failed: ' + error.message);
    }
}
async function verifyToken(token) {
    try {
        const response = await fetch('/api/admin/verify', {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        if (response.ok) {
            authToken = token;
            isAuthenticated = true;
            showAdminInterface();
            loadContent();
        } else {
            sessionStorage.removeItem('adminAuthToken');
        }
    } catch (error) {
        sessionStorage.removeItem('adminAuthToken');
    }
}
function logout() {
    isAuthenticated = false;
    authToken = '';
    sessionStorage.removeItem('adminAuthToken');
    showLoginInterface();
}
function showLoginInterface() {
    document.getElementById('loginContainer').style.display = 'flex';
    document.getElementById('adminContainer').style.display = 'none';
    document.getElementById('adminPassword').value = '';
    document.getElementById('loginError').style.display = 'none';
}
function showAdminInterface() {
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('adminContainer').style.display = 'block';
}
function showLoginError(message) {
    const errorEl = document.getElementById('loginError');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}
// Handle Enter key in password field
document.getElementById('adminPassword').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        login();
    }
});
// Rest of the admin functions remain the same as previous version
function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(sectionId).classList.add('active');
    event.target.classList.add('active');
}
function showStatus(message, type = 'success') {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.className = `status-message status-${type}`;
    statusEl.style.display = 'block';
    
    setTimeout(() => {
        statusEl.style.display = 'none';
    }, 5000);
}
async function loadContent() {
    if (!isAuthenticated) return;
    
    try {
        const response = await fetch('/api/admin/content', {
            headers: {
                'Authorization': 'Bearer ' + authToken
            }
        });
        
        if (!response.ok) throw new Error('Failed to load content');
        
        contentData = await response.json();
        populateForms();
        showStatus('Content loaded successfully!', 'success');
    } catch (error) {
        showStatus('Error loading content: ' + error.message, 'error');
    }
}
function populateForms() {
    if (!contentData.ui?.he) return;
    const ui = contentData.ui.he;
    
    document.getElementById('headerTitle').value = ui.header?.title || '';
    document.getElementById('headerSubtitle').value = ui.header?.subtitle || '';
    document.getElementById('personalInfo').value = ui.voting?.personalInfo || '';
    document.getElementById('namePlaceholder').value = ui.voting?.namePlaceholder || '';
    document.getElementById('emailPlaceholder').value = ui.voting?.emailPlaceholder || '';
    document.getElementById('submitButton').value = ui.voting?.submitButton || '';
    document.getElementById('progressText').value = ui.voting?.progressText || '';
    document.getElementById('categoryA').value = ui.categories?.A || '';
    document.getElementById('categoryB').value = ui.categories?.B || '';
    document.getElementById('categoryC').value = ui.categories?.C || '';
    populateQuestions();
    populateCategories();
    populateShortcuts();
    updatePreview();
}
function populateQuestions() {
    const container = document.getElementById('questionsList');
    container.innerHTML = '';
    
    if (!contentData.questions) contentData.questions = [];
    
    contentData.questions.forEach((question, index) => {
        const questionEl = document.createElement('div');
        questionEl.className = 'question-item';
        questionEl.innerHTML = `
            <div class="question-header">
                <div class="question-number">Question ${question.id}</div>
                <button class="btn-danger" onclick="deleteQuestion(${index})">🗑️ Delete</button>
            </div>
            <div class="form-grid">
                <div class="form-group-full">
                    <label>Question Text</label>
                    <textarea onchange="updateQuestion(${index}, 'text', this.value)">${question.text || ''}</textarea>
                </div>
                <div class="form-group-full">
                    <label>Category</label>
                    <select onchange="updateQuestion(${index}, 'category', this.value)">
                        <option value="A" ${question.category === 'A' ? 'selected' : ''}>A</option>
                        <option value="B" ${question.category === 'B' ? 'selected' : ''}>B</option>
                        <option value="C" ${question.category === 'C' ? 'selected' : ''}>C</option>
                    </select>
                </div>
            </div>
        `;
        container.appendChild(questionEl);
    });
}
function populateCategories() {
    const container = document.getElementById('categoriesList');
    container.innerHTML = '';
    
    if (!contentData.categoryMessages) contentData.categoryMessages = [];
    
    contentData.categoryMessages.forEach((category, index) => {
        const categoryEl = document.createElement('div');
        categoryEl.className = 'question-item';
        categoryEl.innerHTML = `
            <div class="question-header">
                <div class="question-number">${category.id} - ${category.style}</div>
            </div>
            <div class="form-grid">
                <div class="form-group-full">
                    <label>Title</label>
                    <input type="text" value="${category.title || ''}" onchange="updateCategory(${index}, 'title', this.value)">
                </div>
                <div class="form-group-full">
                    <label>Style</label>
                    <input type="text" value="${category.style || ''}" onchange="updateCategory(${index}, 'style', this.value)">
                </div>
                <div class="form-group-full full-width">
                    <label>Message</label>
                    <textarea onchange="updateCategory(${index}, 'message', this.value)">${category.message || ''}</textarea>
                </div>
            </div>
        `;
        container.appendChild(categoryEl);
    });
}
function populateShortcuts() {
    const container = document.getElementById('shortcutsList');
    container.innerHTML = '';
    
    if (!contentData.keyboardShortcuts) {
        contentData.keyboardShortcuts = { desktop: [], mobile: [] };
    }
    
    contentData.keyboardShortcuts.desktop.forEach((shortcut, index) => {
        const shortcutEl = document.createElement('div');
        shortcutEl.className = 'shortcut-item';
        shortcutEl.innerHTML = `
            <strong>Desktop Shortcut ${index + 1}</strong><br>
            <input type="text" value="${shortcut.key}" placeholder="Key" onchange="updateShortcut('desktop', ${index}, 'key', this.value)" style="width: 100px; display: inline-block; margin-right: 10px;">
            <input type="text" value="${shortcut.action}" placeholder="Action" onchange="updateShortcut('desktop', ${index}, 'action', this.value)" style="width: calc(100% - 120px); display: inline-block;">
        `;
        container.appendChild(shortcutEl);
    });
}
function updateQuestion(index, field, value) {
    if (contentData.questions[index]) {
        contentData.questions[index][field] = value;
        updatePreview();
    }
}
function updateCategory(index, field, value) {
    if (contentData.categoryMessages[index]) {
        contentData.categoryMessages[index][field] = value;
        updatePreview();
    }
}
function updateShortcut(type, index, field, value) {
    if (contentData.keyboardShortcuts[type] && contentData.keyboardShortcuts[type][index]) {
        contentData.keyboardShortcuts[type][index][field] = value;
        updatePreview();
    }
}
function addQuestion() {
    if (!isAuthenticated) return;
    
    const newId = contentData.questions.length > 0 ? 
        Math.max(...contentData.questions.map(q => q.id)) + 1 : 1;
    
    contentData.questions.push({
        id: newId,
        text: "New question text...",
        category: "A",
        type: "yesno"
    });
    
    populateQuestions();
    updatePreview();
    showStatus('New question added!', 'success');
}
function deleteQuestion(index) {
    if (!isAuthenticated) return;
    
    if (confirm('Are you sure you want to delete this question?')) {
        contentData.questions.splice(index, 1);
        populateQuestions();
        updatePreview();
        showStatus('Question deleted!', 'success');
    }
}
function updatePreview() {
    document.getElementById('jsonPreview').textContent = 
        JSON.stringify(contentData, null, 2);
}
async function saveContent() {
    if (!isAuthenticated) {
        showStatus('Please login first', 'error');
        return;
    }
    try {
        updateContentFromForms();
        
        const response = await fetch('/api/admin/save-content', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + authToken
            },
            body: JSON.stringify(contentData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showStatus('Content saved successfully!', 'success');
        } else {
            throw new Error(result.error || 'Save failed');
        }
    } catch (error) {
        showStatus('Error saving content: ' + error.message, 'error');
    }
}
function updateContentFromForms() {
    if (!contentData.ui) contentData.ui = {};
    if (!contentData.ui.he) contentData.ui.he = {};
    
    contentData.ui.he.header = {
        title: document.getElementById('headerTitle').value,
        subtitle: document.getElementById('headerSubtitle').value
    };
    
    contentData.ui.he.voting = {
        personalInfo: document.getElementById('personalInfo').value,
        namePlaceholder: document.getElementById('namePlaceholder').value,
        emailPlaceholder: document.getElementById('emailPlaceholder').value,
        submitButton: document.getElementById('submitButton').value,
        progressText: document.getElementById('progressText').value
    };
    
    contentData.ui.he.categories = {
        A: document.getElementById('categoryA').value,
        B: document.getElementById('categoryB').value,
        C: document.getElementById('categoryC').value
    };
}
function exportJSON() {
    if (!isAuthenticated) return;
    
    updateContentFromForms();
    const dataStr = JSON.stringify(contentData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = 'content.json';
    link.click();
    
    showStatus('JSON file downloaded!', 'success');
}