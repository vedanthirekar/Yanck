/**
 * Wizard Flow JavaScript for RAG Chatbot Platform
 * Handles 3-step chatbot creation: Data, Playground, Deploy
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
    const chatbotModel = sessionStorage.getItem('chatbotModel');
    return { chatbotId, chatbotName, chatbotModel };
}

/**
 * Save chatbot data to sessionStorage
 */
function saveChatbotData(chatbotId, chatbotName, chatbotModel) {
    sessionStorage.setItem('chatbotId', chatbotId);
    sessionStorage.setItem('chatbotName', chatbotName);
    if (chatbotModel) {
        sessionStorage.setItem('chatbotModel', chatbotModel);
    }
}

// ============================================================================
// STEP 1: DATA (Combined name, system prompt, and file upload)
// ============================================================================

function initStep1() {
    const form = document.getElementById('step1-form');
    if (!form) return;

    clearAllErrors();

    // File upload elements
    const fileInput = document.getElementById('file-input');
    const fileUploadArea = document.getElementById('file-upload-area');
    const fileList = document.getElementById('file-list');
    const nextBtn = document.getElementById('next-btn');

    let selectedFiles = [];
    let chatbotId = null;
    let uploadedDocuments = [];

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

        const filesArray = Array.from(files);

        // Validate file count
        const totalFiles = selectedFiles.length + uploadedDocuments.length + filesArray.length;
        if (totalFiles > 10) {
            showError('file-error', 'Maximum 10 files allowed per chatbot');
            return;
        }

        // Validate each file
        const allowedExtensions = ['.pdf', '.txt', '.docx'];
        const maxSize = 50 * 1024 * 1024; // 50MB

        for (const file of filesArray) {
            const fileName = file.name.toLowerCase();
            const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

            if (!hasValidExtension) {
                showError('file-error', `Invalid file type: ${file.name}. Supported formats: PDF, TXT, DOCX`);
                continue;
            }

            if (file.size > maxSize) {
                showError('file-error', `File too large: ${file.name}. Maximum size is 50MB`);
                continue;
            }

            selectedFiles.push(file);
        }

        updateFileList();
        updateNextButton();
    }

    // Update file list display
    function updateFileList() {
        fileList.innerHTML = '';

        // Display uploaded documents (with delete option)
        uploadedDocuments.forEach((doc) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item uploaded';
            fileItem.innerHTML = `
                <span class="file-name">📄 ${doc.filename}</span>
                <span class="file-size">${formatFileSize(doc.file_size)}</span>
                <button type="button" class="btn-remove" data-doc-id="${doc.id}">✕</button>
            `;
            fileList.appendChild(fileItem);
        });

        // Display selected files (not yet uploaded)
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
            btn.addEventListener('click', async (e) => {
                const docId = e.target.dataset.docId;
                const index = e.target.dataset.index;

                if (docId) {
                    // Delete uploaded document
                    await deleteDocument(docId);
                } else if (index !== undefined) {
                    // Remove selected file (not yet uploaded)
                    selectedFiles.splice(parseInt(index), 1);
                    updateFileList();
                    updateNextButton();
                }
            });
        });
    }

    // Delete uploaded document
    async function deleteDocument(documentId) {
        if (!chatbotId) return;

        try {
            const response = await fetch(`/api/chatbot/${chatbotId}/documents/${documentId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // Remove from uploadedDocuments array
                uploadedDocuments = uploadedDocuments.filter(doc => doc.id !== documentId);
                updateFileList();
                updateNextButton();
            } else {
                showError('file-error', 'Failed to delete document');
            }
        } catch (error) {
            console.error('Error deleting document:', error);
            showError('file-error', 'Failed to delete document');
        }
    }

    // Format file size
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    // Update next button state
    function updateNextButton() {
        const totalFiles = selectedFiles.length + uploadedDocuments.length;
        nextBtn.disabled = totalFiles === 0;
    }

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAllErrors();

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

        const totalFiles = selectedFiles.length + uploadedDocuments.length;
        if (totalFiles === 0) {
            showError('file-error', 'Please upload at least one document');
            hasError = true;
        }

        if (hasError) return;

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';

        try {
            // Step 1: Create chatbot if not already created
            if (!chatbotId) {
                const createResponse = await fetch('/api/chatbot', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: name,
                        system_prompt: systemPrompt
                    })
                });

                const createData = await createResponse.json();

                if (!createResponse.ok) {
                    const errorMessage = createData.error?.message || 'Failed to create chatbot';
                    showError('prompt-error', errorMessage);
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                    return;
                }

                chatbotId = createData.id;
                saveChatbotData(createData.id, createData.name, createData.model);
            }

            // Step 2: Upload new files if any
            if (selectedFiles.length > 0) {
                // Show upload progress
                const progressContainer = document.getElementById('upload-progress');
                const progressText = document.getElementById('progress-text');
                progressContainer.style.display = 'block';

                const formData = new FormData();
                selectedFiles.forEach(file => {
                    formData.append('files', file);
                });

                const uploadResponse = await fetch(`/api/chatbot/${chatbotId}/documents`, {
                    method: 'POST',
                    body: formData
                });

                const uploadData = await uploadResponse.json();

                if (!uploadResponse.ok) {
                    const errorMessage = uploadData.error?.message || 'Failed to upload files';
                    showError('file-error', errorMessage);
                    progressContainer.style.display = 'none';
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                    return;
                }

                progressText.textContent = 'Upload complete! Processing documents...';

                // Show processing status
                setTimeout(() => {
                    progressContainer.style.display = 'none';
                    const processingStatus = document.getElementById('processing-status');
                    processingStatus.style.display = 'block';

                    // Start polling for status
                    pollProcessingStatus(chatbotId);
                }, 1000);
            } else {
                // No new files to upload, go to next step
                navigateToStep(2);
            }

        } catch (error) {
            console.error('Error:', error);
            showError('prompt-error', 'Network error. Please check your connection and try again.');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });

    // Poll processing status
    async function pollProcessingStatus(chatbotId) {
        const maxAttempts = 60; // 5 minutes
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
                    return;
                }

                if (data.chatbot_status === 'ready') {
                    clearInterval(pollInterval);
                    document.getElementById('processing-status').style.display = 'none';
                    navigateToStep(2);
                } else if (data.chatbot_status === 'error') {
                    clearInterval(pollInterval);
                    showError('file-error', 'Error processing documents. Please try again.');
                    document.getElementById('processing-status').style.display = 'none';
                }

                if (attempts >= maxAttempts) {
                    clearInterval(pollInterval);
                    showError('file-error', 'Processing is taking longer than expected. Please check back later.');
                    document.getElementById('processing-status').style.display = 'none';
                }

            } catch (error) {
                console.error('Error polling status:', error);
                clearInterval(pollInterval);
                showError('file-error', 'Failed to check processing status');
                document.getElementById('processing-status').style.display = 'none';
            }
        }, 5000);
    }
}

// ============================================================================
// STEP 2: PLAYGROUND (Model selection, system prompt editing, and testing)
// ============================================================================

function initStep2() {
    const testQueryForm = document.getElementById('test-query-form');
    if (!testQueryForm) return;

    // Get chatbot data
    let { chatbotId, chatbotName, chatbotModel } = getChatbotData();

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

    // Fetch current chatbot data
    fetchChatbotData();

    // Configuration elements
    const modelSelect = document.getElementById('model-select');
    const systemPromptEdit = document.getElementById('system-prompt-edit');
    const saveConfigBtn = document.getElementById('save-config-btn');

    // Chat elements
    const chatMessages = document.getElementById('test-chat-messages');
    const queryInput = document.getElementById('test-query-input');
    const sendBtn = document.getElementById('send-btn');
    const deployBtn = document.getElementById('deploy-btn');
    const backBtn = document.getElementById('back-btn');

    let chatHistory = [];

    // Fetch chatbot data and populate form
    async function fetchChatbotData() {
        try {
            const statusResponse = await fetch(`/api/chatbot/${chatbotId}/status`);
            const statusData = await statusResponse.json();

            if (statusResponse.ok) {
                const docCountDisplay = document.getElementById('document-count');
                if (docCountDisplay) {
                    docCountDisplay.textContent = statusData.total_documents || 0;
                }
            }

            // Fetch full chatbot data (this would need a GET endpoint for full chatbot details)
            // For now, we'll use the system prompt from session if available
            // In a production app, you'd want to fetch this from the API
        } catch (error) {
            console.error('Error fetching chatbot data:', error);
        }
    }

    // Save configuration changes
    saveConfigBtn.addEventListener('click', async () => {
        const model = modelSelect.value;
        const systemPrompt = systemPromptEdit.value.trim();

        if (!systemPrompt) {
            showError('prompt-edit-error', 'System prompt cannot be empty');
            return;
        }

        clearError('prompt-edit-error');
        saveConfigBtn.disabled = true;
        saveConfigBtn.textContent = 'Saving...';

        try {
            const response = await fetch(`/api/chatbot/${chatbotId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_prompt: systemPrompt,
                    model: model
                })
            });

            if (response.ok) {
                // Update session storage
                saveChatbotData(chatbotId, chatbotName, model);

                // Clear chat history when config changes
                chatHistory = [];
                chatMessages.innerHTML = `
                    <div class="system-message">
                        <p>✅ Configuration saved! Chat history cleared. You can now test with the new settings.</p>
                    </div>
                `;

                saveConfigBtn.textContent = 'Saved!';
                setTimeout(() => {
                    saveConfigBtn.textContent = 'Save Changes';
                    saveConfigBtn.disabled = false;
                }, 2000);
            } else {
                const data = await response.json();
                const errorMessage = data.error?.message || 'Failed to save configuration';
                showError('prompt-edit-error', errorMessage);
                saveConfigBtn.disabled = false;
                saveConfigBtn.textContent = 'Save Changes';
            }
        } catch (error) {
            console.error('Error saving configuration:', error);
            showError('prompt-edit-error', 'Network error. Please try again.');
            saveConfigBtn.disabled = false;
            saveConfigBtn.textContent = 'Save Changes';
        }
    });

    // Handle test query submission
    testQueryForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const question = queryInput.value.trim();
        if (!question) return;

        queryInput.disabled = true;
        sendBtn.disabled = true;

        addMessage('user', question);
        queryInput.value = '';

        const loadingId = addLoadingMessage();

        try {
            const response = await fetch(`/api/chatbot/${chatbotId}/query`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: question,
                    chat_history: chatHistory
                })
            });

            const data = await response.json();
            removeLoadingMessage(loadingId);

            if (!response.ok) {
                const errorMessage = data.error?.message || 'Failed to get response';
                addMessage('error', errorMessage);
            } else {
                addMessage('assistant', data.response);
                chatHistory.push({ role: 'user', content: question });
                chatHistory.push({ role: 'assistant', content: data.response });
            }

        } catch (error) {
            console.error('Error querying chatbot:', error);
            removeLoadingMessage(loadingId);
            addMessage('error', 'Network error. Please check your connection and try again.');
        } finally {
            queryInput.disabled = false;
            sendBtn.disabled = false;
            queryInput.focus();
        }
    });

    // Chat helper functions
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

    function removeLoadingMessage(loadingId) {
        const loadingMsg = document.getElementById(loadingId);
        if (loadingMsg) {
            loadingMsg.remove();
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Button handlers
    deployBtn.addEventListener('click', () => {
        navigateToStep(3);
    });

    backBtn.addEventListener('click', () => {
        if (confirm('Going back will clear your chat history. Continue?')) {
            navigateToStep(1);
        }
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
// STEP 3: DEPLOY
// ============================================================================

function initStep3() {
    const { chatbotId, chatbotName, chatbotModel } = getChatbotData();

    // Display chatbot info
    const nameDisplay = document.getElementById('chatbot-name-display');
    if (nameDisplay && chatbotName) {
        nameDisplay.textContent = chatbotName;
    }

    const modelDisplay = document.getElementById('model-display');
    if (modelDisplay && chatbotModel) {
        modelDisplay.textContent = chatbotModel;
    }

    // Redirect to step 1 if no chatbot ID
    if (!chatbotId) {
        window.location.href = '/create';
        return;
    }

    // Fetch and display document count
    fetchChatbotStatus();

    async function fetchChatbotStatus() {
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

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    if (path.includes('/create/step/1') || path === '/create') {
        initStep1();
    } else if (path.includes('/create/step/2')) {
        initStep2();
    } else if (path.includes('/create/step/3')) {
        initStep3();
    }
});
