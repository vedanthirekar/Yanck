/**
 * Wizard Flow JavaScript for RAG Chatbot Platform
 * Handles step navigation, form submission, file upload, and testing
 */

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Display error message in a form field
 */
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

/**
 * Clear error message from a form field
 */
function clearError(elementId) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
}

/**
 * Clear all error messages on the page
 */
function clearAllErrors() {
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
    });
}

/**
 * Navigate to a specific wizard step
 */
function navigateToStep(stepNumber) {
    window.location.href = `/create/step/${stepNumber}`;
}

/**
 * Get chatbot data from sessionStorage
 */
function getChatbotData() {
    const chatbotId = sessionStorage.getItem('chatbotId');
    const chatbotName = sessionStorage.getItem('chatbotName');
    return { chatbotId, chatbotName };
}

/**
 * Save chatbot data to sessionStorage
 */
function saveChatbotData(chatbotId, chatbotName) {
    sessionStorage.setItem('chatbotId', chatbotId);
    sessionStorage.setItem('chatbotName', chatbotName);
}

// ============================================================================
// STEP 1: BASIC SETTINGS
// ============================================================================

function initStep1() {
    const form = document.getElementById('step1-form');
    if (!form) return;

    // Clear any previous errors
    clearAllErrors();

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAllErrors();

        // Get form values
        const name = document.getElementById('chatbot-name').value.trim();
        const systemPrompt = document.getElementById('system-prompt').value.trim();

        // Validate inputs
        let hasError = false;

        if (!name) {
            showError('name-error', 'Chatbot name is required');
            hasError = true;
        }

        if (!systemPrompt) {
            showError('prompt-error', 'System prompt is required');
            hasError = true;
        }

        if (hasError) return;

        // Disable submit button
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating...';

        try {
            // Call API to create chatbot
            const response = await fetch('/api/chatbot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name,
                    system_prompt: systemPrompt
                })
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle error response
                const errorMessage = data.error?.message || 'Failed to create chatbot';
                showError('prompt-error', errorMessage);
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                return;
            }

            // Save chatbot data to session storage
            saveChatbotData(data.id, data.name);

            // Navigate to step 2
            navigateToStep(2);

        } catch (error) {
            console.error('Error creating chatbot:', error);
            showError('prompt-error', 'Network error. Please check your connection and try again.');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
}

// ============================================================================
// STEP 2: DATA UPLOAD
// ============================================================================

function initStep2() {
    const form = document.getElementById('step2-form');
    if (!form) return;

    // Get chatbot data
    const { chatbotId, chatbotName } = getChatbotData();

    // Display chatbot name
    const nameDisplay = document.getElementById('chatbot-name-display');
    if (nameDisplay && chatbotName) {
        nameDisplay.textContent = chatbotName;
    }

    // Redirect to step 1 if no chatbot ID
    if (!chatbotId) {
        window.location.href = '/create';
        return;
    }

    // File upload elements
    const fileInput = document.getElementById('file-input');
    const fileUploadArea = document.getElementById('file-upload-area');
    const fileList = document.getElementById('file-list');
    const nextBtn = document.getElementById('next-btn');
    const backBtn = document.getElementById('back-btn');

    let selectedFiles = [];

    // Click to browse files
    fileUploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    // Handle file selection
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    // Drag and drop handlers
    fileUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUploadArea.classList.add('drag-over');
    });

    fileUploadArea.addEventListener('dragleave', () => {
        fileUploadArea.classList.remove('drag-over');
    });

    fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadArea.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files);
    });

    // Handle selected files
    function handleFiles(files) {
        clearError('file-error');

        // Convert FileList to Array
        const filesArray = Array.from(files);

        // Validate file count
        if (selectedFiles.length + filesArray.length > 10) {
            showError('file-error', 'Maximum 10 files allowed per chatbot');
            return;
        }

        // Validate each file
        const allowedExtensions = ['.pdf', '.txt', '.docx'];
        const maxSize = 50 * 1024 * 1024; // 50MB

        for (const file of filesArray) {
            // Check file extension
            const fileName = file.name.toLowerCase();
            const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

            if (!hasValidExtension) {
                showError('file-error', `Invalid file type: ${file.name}. Supported formats: PDF, TXT, DOCX`);
                continue;
            }

            // Check file size
            if (file.size > maxSize) {
                showError('file-error', `File too large: ${file.name}. Maximum size is 50MB`);
                continue;
            }

            // Add to selected files
            selectedFiles.push(file);
        }

        // Update file list display
        updateFileList();

        // Enable next button if files are selected
        if (selectedFiles.length > 0) {
            nextBtn.disabled = false;
        }
    }

    // Update file list display
    function updateFileList() {
        fileList.innerHTML = '';

        selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <span class="file-name">📄 ${file.name}</span>
                <span class="file-size">${formatFileSize(file.size)}</span>
                <button type="button" class="btn-remove" data-index="${index}">✕</button>
            `;
            fileList.appendChild(fileItem);
        });

        // Add remove button handlers
        fileList.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                selectedFiles.splice(index, 1);
                updateFileList();

                if (selectedFiles.length === 0) {
                    nextBtn.disabled = true;
                }
            });
        });
    }

    // Format file size
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    // Handle form submission (file upload)
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearError('file-error');

        if (selectedFiles.length === 0) {
            showError('file-error', 'Please select at least one file');
            return;
        }

        // Disable buttons during upload
        nextBtn.disabled = true;
        backBtn.disabled = true;

        // Show upload progress
        const progressContainer = document.getElementById('upload-progress');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        progressContainer.style.display = 'block';

        try {
            // Create FormData
            const formData = new FormData();
            selectedFiles.forEach(file => {
                formData.append('files', file);
            });

            // Upload files
            const response = await fetch(`/api/chatbot/${chatbotId}/documents`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMessage = data.error?.message || 'Failed to upload files';
                showError('file-error', errorMessage);
                progressContainer.style.display = 'none';
                nextBtn.disabled = false;
                backBtn.disabled = false;
                return;
            }

            // Update progress to 100%
            progressFill.style.width = '100%';
            progressText.textContent = 'Upload complete! Processing documents...';

            // Hide upload progress and show processing status
            setTimeout(() => {
                progressContainer.style.display = 'none';
                const processingStatus = document.getElementById('processing-status');
                processingStatus.style.display = 'block';

                // Start polling for status
                pollProcessingStatus(chatbotId);
            }, 1000);

        } catch (error) {
            console.error('Error uploading files:', error);
            showError('file-error', 'Network error. Please check your connection and try again.');
            progressContainer.style.display = 'none';
            nextBtn.disabled = false;
            backBtn.disabled = false;
        }
    });

    // Poll processing status
    async function pollProcessingStatus(chatbotId) {
        const maxAttempts = 60; // 5 minutes (5 seconds interval)
        let attempts = 0;

        const pollInterval = setInterval(async () => {
            attempts++;

            try {
                const response = await fetch(`/api/chatbot/${chatbotId}/status`);
                const data = await response.json();

                if (!response.ok) {
                    clearInterval(pollInterval);
                    showError('file-error', 'Failed to check processing status');
                    document.getElementById('processing-status').style.display = 'none';
                    backBtn.disabled = false;
                    return;
                }

                // Check if processing is complete
                if (data.chatbot_status === 'ready') {
                    clearInterval(pollInterval);
                    document.getElementById('processing-status').style.display = 'none';

                    // Navigate to step 3
                    navigateToStep(3);
                } else if (data.chatbot_status === 'error') {
                    clearInterval(pollInterval);
                    showError('file-error', 'Error processing documents. Please try again.');
                    document.getElementById('processing-status').style.display = 'none';
                    backBtn.disabled = false;
                }

                // Timeout after max attempts
                if (attempts >= maxAttempts) {
                    clearInterval(pollInterval);
                    showError('file-error', 'Processing is taking longer than expected. Please check back later.');
                    document.getElementById('processing-status').style.display = 'none';
                    backBtn.disabled = false;
                }

            } catch (error) {
                console.error('Error polling status:', error);
                clearInterval(pollInterval);
                showError('file-error', 'Failed to check processing status');
                document.getElementById('processing-status').style.display = 'none';
                backBtn.disabled = false;
            }
        }, 5000); // Poll every 5 seconds
    }

    // Back button handler
    backBtn.addEventListener('click', () => {
        navigateToStep(1);
    });
}

// ============================================================================
// STEP 3: PREVIEW & TEST
// ============================================================================

function initStep3() {
    const testQueryForm = document.getElementById('test-query-form');
    if (!testQueryForm) return;

    // Get chatbot data
    const { chatbotId, chatbotName } = getChatbotData();

    // Display chatbot name
    const nameDisplay = document.getElementById('chatbot-name-display');
    if (nameDisplay && chatbotName) {
        nameDisplay.textContent = chatbotName;
    }

    // Redirect to step 1 if no chatbot ID
    if (!chatbotId) {
        window.location.href = '/create';
        return;
    }

    // Get status to display document count
    fetchChatbotStatus(chatbotId);

    // Chat elements
    const chatMessages = document.getElementById('test-chat-messages');
    const queryInput = document.getElementById('test-query-input');
    const sendBtn = document.getElementById('send-btn');
    const deployBtn = document.getElementById('deploy-btn');
    const backBtn = document.getElementById('back-btn');

    // Chat history for this session
    let chatHistory = [];

    // Handle test query submission
    testQueryForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const question = queryInput.value.trim();
        if (!question) return;

        // Disable input and button
        queryInput.disabled = true;
        sendBtn.disabled = true;

        // Add user message to chat
        addMessage('user', question);

        // Clear input
        queryInput.value = '';

        // Add loading indicator
        const loadingId = addLoadingMessage();

        try {
            // Send query to API
            const response = await fetch(`/api/chatbot/${chatbotId}/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    question: question,
                    chat_history: chatHistory
                })
            });

            const data = await response.json();

            // Remove loading indicator
            removeLoadingMessage(loadingId);

            if (!response.ok) {
                const errorMessage = data.error?.message || 'Failed to get response';
                addMessage('error', errorMessage);
            } else {
                // Add assistant response
                addMessage('assistant', data.response);

                // Update chat history
                chatHistory.push({ role: 'user', content: question });
                chatHistory.push({ role: 'assistant', content: data.response });
            }

        } catch (error) {
            console.error('Error querying chatbot:', error);
            removeLoadingMessage(loadingId);
            addMessage('error', 'Network error. Please check your connection and try again.');
        } finally {
            // Re-enable input and button
            queryInput.disabled = false;
            sendBtn.disabled = false;
            queryInput.focus();
        }
    });

    // Add message to chat
    function addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${role}-message`;

        if (role === 'user') {
            messageDiv.innerHTML = `<div class="message-content">${escapeHtml(content)}</div>`;
        } else if (role === 'assistant') {
            messageDiv.innerHTML = `<div class="message-content">${escapeHtml(content)}</div>`;
        } else if (role === 'error') {
            messageDiv.innerHTML = `<div class="message-content error">⚠️ ${escapeHtml(content)}</div>`;
        }

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Add loading message
    function addLoadingMessage() {
        const loadingId = 'loading-' + Date.now();
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message assistant-message';
        messageDiv.id = loadingId;
        messageDiv.innerHTML = `
            <div class="message-content">
                <span class="loading-dots">Thinking<span>.</span><span>.</span><span>.</span></span>
            </div>
        `;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return loadingId;
    }

    // Remove loading message
    function removeLoadingMessage(loadingId) {
        const loadingMsg = document.getElementById(loadingId);
        if (loadingMsg) {
            loadingMsg.remove();
        }
    }

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Fetch chatbot status
    async function fetchChatbotStatus(chatbotId) {
        try {
            const response = await fetch(`/api/chatbot/${chatbotId}/status`);
            const data = await response.json();

            if (response.ok) {
                const docCountDisplay = document.getElementById('document-count');
                if (docCountDisplay) {
                    docCountDisplay.textContent = data.total_documents || 0;
                }
            }
        } catch (error) {
            console.error('Error fetching status:', error);
        }
    }

    // Deploy button handler
    deployBtn.addEventListener('click', () => {
        navigateToStep(4);
    });

    // Back button handler
    backBtn.addEventListener('click', () => {
        navigateToStep(2);
    });

    // Enable enter key to send
    queryInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            testQueryForm.dispatchEvent(new Event('submit'));
        }
    });
}

// ============================================================================
// STEP 4: DEPLOY
// ============================================================================

function initStep4() {
    // Get chatbot data
    const { chatbotId, chatbotName } = getChatbotData();

    // Display chatbot name
    const nameDisplay = document.getElementById('chatbot-name-display');
    if (nameDisplay && chatbotName) {
        nameDisplay.textContent = chatbotName;
    }

    // Redirect to step 1 if no chatbot ID
    if (!chatbotId) {
        window.location.href = '/create';
        return;
    }

    // Get status to display document count
    fetchChatbotStatus(chatbotId);

    // Fetch chatbot status
    async function fetchChatbotStatus(chatbotId) {
        try {
            const response = await fetch(`/api/chatbot/${chatbotId}/status`);
            const data = await response.json();

            if (response.ok) {
                const docCountDisplay = document.getElementById('document-count');
                if (docCountDisplay) {
                    docCountDisplay.textContent = data.total_documents || 0;
                }
            }
        } catch (error) {
            console.error('Error fetching status:', error);
        }
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize appropriate step based on current page
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    if (path.includes('/create/step/1') || path === '/create') {
        initStep1();
    } else if (path.includes('/create/step/2')) {
        initStep2();
    } else if (path.includes('/create/step/3')) {
        initStep3();
    } else if (path.includes('/create/step/4')) {
        initStep4();
    }
});
