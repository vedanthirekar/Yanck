// Chat Interface JavaScript
// Handles message sending, display, and conversation history management

class ChatInterface {
    constructor(chatbotId) {
        this.chatbotId = chatbotId;
        this.chatMessages = document.getElementById('chat-messages');
        this.chatForm = document.getElementById('chat-form');
        this.chatInput = document.getElementById('chat-input');
        this.sendBtn = document.getElementById('send-btn');
        this.loadingIndicator = document.getElementById('loading-indicator');
        this.errorMessage = document.getElementById('error-message');
        this.errorText = document.getElementById('error-text');
        
        this.conversationHistory = [];
        this.isLoading = false;
        
        this.init();
    }
    
    init() {
        // Load conversation history from session storage
        this.loadConversationHistory();
        
        // Set up event listeners
        this.chatForm.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Enable enter key to send message
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.chatForm.dispatchEvent(new Event('submit'));
            }
        });
        
        // Display loaded conversation history
        this.displayConversationHistory();
    }
    
    async handleSubmit(e) {
        e.preventDefault();
        
        if (this.isLoading) {
            return;
        }
        
        const message = this.chatInput.value.trim();
        
        if (!message) {
            return;
        }
        
        // Clear input
        this.chatInput.value = '';
        
        // Hide error message if visible
        this.hideError();
        
        // Add user message to UI and history
        this.addMessage('user', message);
        
        // Show loading indicator
        this.setLoading(true);
        
        try {
            // Send query to API
            const response = await this.sendQuery(message);
            
            // Add assistant response to UI and history
            this.addMessage('assistant', response.response, response.sources);
            
        } catch (error) {
            console.error('Error sending query:', error);
            this.showError(error.message || 'Failed to get response. Please try again.');
            
            // Remove the user message from history if request failed
            this.conversationHistory.pop();
            this.saveConversationHistory();
        } finally {
            this.setLoading(false);
        }
    }
    
    async sendQuery(message) {
        const response = await fetch(`/api/chatbot/${this.chatbotId}/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                question: message,
                chat_history: this.conversationHistory
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            
            if (response.status === 503) {
                throw new Error('The AI service is currently unavailable. Please try again later.');
            } else if (errorData.error) {
                throw new Error(errorData.error.message || 'An error occurred');
            } else {
                throw new Error(`Server error: ${response.status}`);
            }
        }
        
        return await response.json();
    }
    
    addMessage(role, content, sources = null) {
        // Remove empty state if it exists
        const emptyState = this.chatMessages.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }
        
        // Create message element
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        // Create avatar
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = role === 'user' ? '<span>👤</span>' : '<span>🤖</span>';
        
        // Create content
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        // Format content (preserve line breaks)
        const formattedContent = this.formatMessageContent(content);
        messageContent.innerHTML = formattedContent;
        
        // Add sources if available
        if (sources && sources.length > 0) {
            const sourcesDiv = document.createElement('div');
            sourcesDiv.className = 'message-sources';
            sourcesDiv.textContent = `Sources: ${sources.join(', ')}`;
            messageContent.appendChild(sourcesDiv);
        }
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        
        // Add to chat messages
        this.chatMessages.appendChild(messageDiv);
        
        // Add to conversation history
        this.conversationHistory.push({
            role: role,
            content: content,
            timestamp: new Date().toISOString()
        });
        
        // Save to session storage
        this.saveConversationHistory();
        
        // Auto-scroll to latest message
        this.scrollToBottom();
    }
    
    formatMessageContent(content) {
        // Escape HTML to prevent XSS
        const escaped = content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        
        // Convert line breaks to <br>
        return escaped.replace(/\n/g, '<br>');
    }
    
    displayConversationHistory() {
        if (this.conversationHistory.length === 0) {
            return;
        }
        
        // Remove empty state
        const emptyState = this.chatMessages.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }
        
        // Display each message
        this.conversationHistory.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${msg.role}`;
            
            const avatar = document.createElement('div');
            avatar.className = 'message-avatar';
            avatar.innerHTML = msg.role === 'user' ? '<span>👤</span>' : '<span>🤖</span>';
            
            const messageContent = document.createElement('div');
            messageContent.className = 'message-content';
            messageContent.innerHTML = this.formatMessageContent(msg.content);
            
            messageDiv.appendChild(avatar);
            messageDiv.appendChild(messageContent);
            
            this.chatMessages.appendChild(messageDiv);
        });
        
        // Auto-scroll to latest message
        this.scrollToBottom();
    }
    
    setLoading(loading) {
        this.isLoading = loading;
        
        if (loading) {
            this.loadingIndicator.classList.add('active');
            this.chatInput.disabled = true;
            this.sendBtn.disabled = true;
            this.scrollToBottom();
        } else {
            this.loadingIndicator.classList.remove('active');
            this.chatInput.disabled = false;
            this.sendBtn.disabled = false;
            this.chatInput.focus();
        }
    }
    
    showError(message) {
        this.errorText.textContent = message;
        this.errorMessage.classList.add('active');
        
        // Auto-hide error after 5 seconds
        setTimeout(() => {
            this.hideError();
        }, 5000);
    }
    
    hideError() {
        this.errorMessage.classList.remove('active');
    }
    
    scrollToBottom() {
        // Use setTimeout to ensure DOM has updated
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 100);
    }
    
    loadConversationHistory() {
        const storageKey = `chat_history_${this.chatbotId}`;
        const stored = sessionStorage.getItem(storageKey);
        
        if (stored) {
            try {
                this.conversationHistory = JSON.parse(stored);
            } catch (error) {
                console.error('Error loading conversation history:', error);
                this.conversationHistory = [];
            }
        }
    }
    
    saveConversationHistory() {
        const storageKey = `chat_history_${this.chatbotId}`;
        try {
            sessionStorage.setItem(storageKey, JSON.stringify(this.conversationHistory));
        } catch (error) {
            console.error('Error saving conversation history:', error);
        }
    }
}

// Initialize chat interface when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (typeof chatbotId !== 'undefined') {
        new ChatInterface(chatbotId);
    } else {
        console.error('Chatbot ID not found');
    }
});
