/**
 * Step 2: Playground - Model Selection, System Prompt Editing, and Testing
 */

// Utility functions
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function clearError(elementId) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

const DRAFT_DATA_CHANGED_KEY = 'draftDataChanged';

function getDraftData() {
    const chatbotName = sessionStorage.getItem('chatbotName');
    const specialInstructions = sessionStorage.getItem('specialInstructions');
    const draftId = sessionStorage.getItem('draftId');
    return { chatbotName, specialInstructions, draftId };
}

// Initialize Step 2
function initStep2() {
    const { chatbotName, specialInstructions, draftId } = getDraftData();

    // Redirect to step 1 if no data
    if (!chatbotName || !draftId) {
        window.location.href = '/create';
        return;
    }

    // Display chatbot name
    const nameDisplay = document.getElementById('chatbot-name-display');
    if (nameDisplay && chatbotName) {
        nameDisplay.textContent = chatbotName;
    }

    // Load document count
    loadDocumentCount(draftId);

    // Generate system prompt automatically
    generateSystemPrompt(specialInstructions, draftId);

    // Setup event listeners
    setupConfigSave();
    setupChatInterface();
    setupNavigation();
}

// Load document count
async function loadDocumentCount(draftId) {
    try {
        const response = await fetch(`/api/draft/${draftId}/files`);
        const data = await response.json();

        if (response.ok) {
            const docCountDisplay = document.getElementById('document-count');
            if (docCountDisplay) {
                docCountDisplay.textContent = data.count || 0;
            }
        }
    } catch (error) {
        console.error('Error loading document count:', error);
    }
}

// Generate system prompt
async function generateSystemPrompt(specialInstructions, draftId) {
    const systemPromptEdit = document.getElementById('system-prompt-edit');
    const regenerateBtn = document.getElementById('regenerate-prompt-btn');
    
    if (!systemPromptEdit) return;

    // Show loading state
    systemPromptEdit.value = 'Generating system prompt...';
    systemPromptEdit.disabled = true;
    if (regenerateBtn) regenerateBtn.disabled = true;

    try {
        const response = await fetch('/api/generate-system-prompt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                special_instructions: specialInstructions || '',
                draft_id: draftId
            })
        });

        const data = await response.json();

        if (response.ok && data.system_prompt) {
            systemPromptEdit.value = data.system_prompt;
            // Store in sessionStorage
            sessionStorage.setItem('systemPrompt', data.system_prompt);
        } else {
            showError('prompt-edit-error', data.error?.message || 'Failed to generate system prompt');
            // Use fallback
            systemPromptEdit.value = getDefaultSystemPrompt(specialInstructions);
        }
    } catch (error) {
        console.error('Error generating system prompt:', error);
        showError('prompt-edit-error', 'Network error. Using default prompt.');
        systemPromptEdit.value = getDefaultSystemPrompt(specialInstructions);
    } finally {
        systemPromptEdit.disabled = false;
        if (regenerateBtn) regenerateBtn.disabled = false;
    }
}

// Get default system prompt
function getDefaultSystemPrompt(specialInstructions) {
    let prompt = "You are a knowledgeable AI assistant designed to provide in-depth, detailed answers.";
    if (specialInstructions) {
        prompt += ` ${specialInstructions}`;
    }
    prompt += "\n\nAlways base your responses on the provided documents and knowledge base. Provide specific information, and give comprehensive explanations. When answering questions, don't cite the resources, be thorough and include relevant details, examples, or context that helps the user fully understand the topic. Maintain a professional and helpful tone throughout all interactions.";
    return prompt;
}

// Setup config save functionality
function setupConfigSave() {
    const saveBtn = document.getElementById('save-config-btn');
    const regenerateBtn = document.getElementById('regenerate-prompt-btn');
    const systemPromptEdit = document.getElementById('system-prompt-edit');
    const modelSelect = document.getElementById('model-select');
    const deployBtn = document.getElementById('deploy-btn');

    if (!saveBtn || !systemPromptEdit) return;

    // Save button handler
    saveBtn.addEventListener('click', () => {
        const systemPrompt = systemPromptEdit.value.trim();
        const model = modelSelect ? modelSelect.value : 'gemini-2.5-flash';

        if (!systemPrompt) {
            showError('prompt-edit-error', 'System prompt cannot be empty');
            return;
        }

        // Save to sessionStorage
        sessionStorage.setItem('systemPrompt', systemPrompt);
        sessionStorage.setItem('model', model);

        // Enable deploy button
        if (deployBtn) deployBtn.disabled = false;

        // Show success feedback
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saved ✓';
        saveBtn.classList.add('saved');
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.classList.remove('saved');
        }, 2000);
    });

    // Regenerate button handler
    if (regenerateBtn) {
        regenerateBtn.addEventListener('click', () => {
            const { specialInstructions, draftId } = getDraftData();
            generateSystemPrompt(specialInstructions, draftId);
        });
    }

    // Auto-save on prompt change
    let saveTimeout;
    systemPromptEdit.addEventListener('input', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            const systemPrompt = systemPromptEdit.value.trim();
            if (systemPrompt) {
                sessionStorage.setItem('systemPrompt', systemPrompt);
            }
        }, 1000);
    });
}

// Setup chat interface (for testing - creates temporary chatbot)
// Try to restore any existing temp chatbot id from sessionStorage
let tempChatbotId = sessionStorage.getItem('tempChatbotId') || null;
let chatHistory = [];

async function deleteTempChatbotIfExists() {
    const existingTempId = sessionStorage.getItem('tempChatbotId');
    if (!existingTempId) {
        tempChatbotId = null;
        return;
    }

    try {
        await fetch(`/api/chatbot/${existingTempId}`, {
            method: 'DELETE'
        });
    } catch (err) {
        console.warn('Failed to delete temp chatbot:', err);
    } finally {
        sessionStorage.removeItem('tempChatbotId');
        tempChatbotId = null;
    }
}

function resetChatState(container) {
    chatHistory = [];
    if (container) {
        container.innerHTML = '';
        container.scrollTop = 0;
    }
}

async function setupChatInterface() {
    const testQueryForm = document.getElementById('test-query-form');
    const chatMessages = document.getElementById('test-chat-messages');
    const queryInput = document.getElementById('test-query-input');
    const sendBtn = document.getElementById('send-btn');

    if (!testQueryForm || !chatMessages) return;

    resetChatState(chatMessages);

    const shouldResetForNewData = sessionStorage.getItem(DRAFT_DATA_CHANGED_KEY) === 'true';

    if (shouldResetForNewData) {
        await deleteTempChatbotIfExists();
        sessionStorage.removeItem(DRAFT_DATA_CHANGED_KEY);
    } else {
        tempChatbotId = sessionStorage.getItem('tempChatbotId') || null;
    }

    const introMessage = shouldResetForNewData
        ? 'Your documents were updated, so I\'m starting fresh. Ask something to test the new data!'
        : 'Hello! I\'m ready to answer questions based on your documents. Ask me anything!';

    addMessage('assistant', introMessage, chatMessages);

    testQueryForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const question = queryInput.value.trim();
        if (!question) return;

        // Ensure we have a temporary chatbot for testing
        if (!tempChatbotId) {
            await createTempChatbot();
        }

        if (!tempChatbotId) {
            addMessage('error', 'Failed to initialize chatbot for testing. Please try again.', chatMessages);
            return;
        }

        // Update existing temp chatbot with current system prompt and model
        // This ensures the chatbot uses the latest prompt if it was edited
        // Read directly from the textarea to get the most current value
        const systemPromptEdit = document.getElementById('system-prompt-edit');
        const modelSelect = document.getElementById('model-select');
        const systemPrompt = systemPromptEdit ? systemPromptEdit.value.trim() : (sessionStorage.getItem('systemPrompt') || getDefaultSystemPrompt(getDraftData().specialInstructions));
        const model = modelSelect ? modelSelect.value : (sessionStorage.getItem('model') || 'gemini-2.5-flash');
        
        if (systemPrompt) {
            try {
                await fetch(`/api/chatbot/${tempChatbotId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        system_prompt: systemPrompt,
                        model: model
                    })
                });
            } catch (error) {
                console.warn('Failed to update temp chatbot, continuing with existing settings:', error);
                // Continue anyway - the chatbot might still work with old settings
            }
        }

        queryInput.disabled = true;
        sendBtn.disabled = true;

        addMessage('user', question, chatMessages);
        queryInput.value = '';

        const loadingId = addLoadingMessage(chatMessages);

        try {
            const response = await fetch(`/api/chatbot/${tempChatbotId}/query`, {
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

            removeLoadingMessage(loadingId);

            if (!response.ok) {
                const errorMessage = data.error?.message || 'Failed to get response';
                addMessage('error', errorMessage, chatMessages);
            } else {
                addMessage('assistant', data.response, chatMessages);

                chatHistory.push({ role: 'user', content: question });
                chatHistory.push({ role: 'assistant', content: data.response });
            }

        } catch (error) {
            console.error('Error querying chatbot:', error);
            removeLoadingMessage(loadingId);
            addMessage('error', 'Network error. Please check your connection and try again.', chatMessages);
        } finally {
            queryInput.disabled = false;
            sendBtn.disabled = false;
            queryInput.focus();
        }
    });

    queryInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            testQueryForm.dispatchEvent(new Event('submit'));
        }
    });
}

// Create temporary chatbot for testing
async function createTempChatbot() {
    const { chatbotName, draftId } = getDraftData();
    const systemPrompt = sessionStorage.getItem('systemPrompt') || getDefaultSystemPrompt(getDraftData().specialInstructions);
    const model = sessionStorage.getItem('model') || 'gemini-2.5-flash';

    try {
        // Create chatbot
        const createResponse = await fetch('/api/chatbot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: chatbotName + ' (Test)',
                system_prompt: systemPrompt,
                model: model
            })
        });

        const createData = await createResponse.json();

        if (!createResponse.ok) {
            console.error('Failed to create temp chatbot:', createData);
            return;
        }

        tempChatbotId = createData.id;
        sessionStorage.setItem('tempChatbotId', tempChatbotId);

        // Copy files from draft to chatbot
        const copyResponse = await fetch(`/api/chatbot/${tempChatbotId}/copy-draft-files`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                draft_id: draftId
            })
        });

        if (!copyResponse.ok) {
            console.warn('Failed to copy files to temp chatbot, but chatbot created');
        }

    } catch (error) {
        console.error('Error creating temp chatbot:', error);
    }
}

function addMessage(role, content, container) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${role}-message`;

    if (role === 'user') {
        messageDiv.innerHTML = `<div class="message-content">${escapeHtml(content)}</div>`;
    } else if (role === 'assistant') {
        messageDiv.innerHTML = `<div class="message-content">${escapeHtml(content)}</div>`;
    } else if (role === 'error') {
        messageDiv.innerHTML = `<div class="message-content error">⚠️ ${escapeHtml(content)}</div>`;
    }

    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

function addLoadingMessage(container) {
    const loadingId = 'loading-' + Date.now();
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message assistant-message';
    messageDiv.id = loadingId;
    messageDiv.innerHTML = `
        <div class="message-content">
            <span class="loading-dots">Thinking<span>.</span><span>.</span><span>.</span></span>
        </div>
    `;
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
    return loadingId;
}

function removeLoadingMessage(loadingId) {
    const loadingMsg = document.getElementById(loadingId);
    if (loadingMsg) {
        loadingMsg.remove();
    }
}

// Setup navigation buttons
function setupNavigation() {
    const backBtn = document.getElementById('back-btn');
    const deployBtn = document.getElementById('deploy-btn');

    if (backBtn) {
        backBtn.addEventListener('click', async () => {
            try {
                await deleteTempChatbotIfExists();
                resetChatState(document.getElementById('test-chat-messages'));
            } finally {
                // Always navigate back to Data step
                window.location.href = '/create';
            }
        });
    }

    if (deployBtn) {
        deployBtn.addEventListener('click', () => {
            // Validate system prompt is set
            const systemPrompt = sessionStorage.getItem('systemPrompt');
            if (!systemPrompt) {
                showError('prompt-edit-error', 'Please save your system prompt before deploying');
                return;
            }
            window.location.href = '/create/step/3';
        });
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('/create/step/2')) {
        initStep2();
    }
});
