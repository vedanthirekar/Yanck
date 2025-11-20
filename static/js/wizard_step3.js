/**
 * Step 3: Deploy - Deploy chatbot and get URL
 */

// Utility functions
function showError(message) {
    const errorElement = document.getElementById('deploy-error');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function clearError() {
    const errorElement = document.getElementById('deploy-error');
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
}

function getDeployData() {
    const chatbotName = sessionStorage.getItem('chatbotName');
    const systemPrompt = sessionStorage.getItem('systemPrompt');
    const model = sessionStorage.getItem('model') || 'gemini-2.5-flash';
    const draftId = sessionStorage.getItem('draftId');
    return { chatbotName, systemPrompt, model, draftId };
}

// Initialize Step 3
function initStep3() {
    const { chatbotName, systemPrompt, model, draftId } = getDeployData();

    // Redirect to step 1 if no data
    if (!chatbotName || !systemPrompt || !draftId) {
        window.location.href = '/create';
        return;
    }

    // Display summary
    displaySummary(chatbotName, model, draftId);

    // Setup event listeners
    setupDeployButton();
    setupNavigation();
    setupSuccessActions();
}

// Display deployment summary
async function displaySummary(chatbotName, model, draftId) {
    const summaryName = document.getElementById('summary-name');
    const summaryModel = document.getElementById('summary-model');
    const summaryDocuments = document.getElementById('summary-documents');

    if (summaryName) summaryName.textContent = chatbotName;
    if (summaryModel) summaryModel.textContent = model;

    // Load document count
    try {
        const response = await fetch(`/api/draft/${draftId}/files`);
        const data = await response.json();

        if (response.ok && summaryDocuments) {
            summaryDocuments.textContent = `${data.count || 0} files`;
        }
    } catch (error) {
        console.error('Error loading document count:', error);
        if (summaryDocuments) summaryDocuments.textContent = 'Unknown';
    }
}

// Setup deploy button
function setupDeployButton() {
    const deployBtn = document.getElementById('deploy-btn');
    if (!deployBtn) return;

    deployBtn.addEventListener('click', async () => {
        clearError();
        deployBtn.disabled = true;

        const { chatbotName, systemPrompt, model, draftId } = getDeployData();

        // Show progress
        const progressContainer = document.getElementById('deploy-progress');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        progressContainer.style.display = 'block';
        progressFill.style.width = '30%';
        progressText.textContent = 'Creating chatbot...';

        try {
            // Deploy chatbot
            const response = await fetch('/api/deploy-chatbot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: chatbotName,
                    system_prompt: systemPrompt,
                    model: model,
                    draft_id: draftId
                })
            });

            progressFill.style.width = '60%';
            progressText.textContent = 'Processing documents...';

            const data = await response.json();

            if (!response.ok) {
                showError(data.error?.message || 'Failed to deploy chatbot');
                deployBtn.disabled = false;
                progressContainer.style.display = 'none';
                return;
            }

            const chatbotId = data.id;

            progressFill.style.width = '90%';
            progressText.textContent = 'Generating embeddings...';

            // Wait for processing to complete
            await waitForProcessing(chatbotId);

            progressFill.style.width = '100%';
            progressText.textContent = 'Deployment complete!';

            // Hide deploy section, show success section
            setTimeout(() => {
                document.getElementById('deploy-section').style.display = 'none';
                document.getElementById('success-section').style.display = 'block';

                // Display chatbot details
                displayChatbotDetails(chatbotId, chatbotName, model, draftId);

                // Clean up session storage
                sessionStorage.removeItem('draftId');
                sessionStorage.removeItem('tempChatbotId');
                sessionStorage.setItem('chatbotId', chatbotId);
            }, 1000);

        } catch (error) {
            console.error('Error deploying chatbot:', error);
            showError('Network error. Please check your connection and try again.');
            deployBtn.disabled = false;
            progressContainer.style.display = 'none';
        }
    });
}

// Wait for processing to complete
async function waitForProcessing(chatbotId) {
    const maxAttempts = 60;
    let attempts = 0;

    while (attempts < maxAttempts) {
        try {
            const response = await fetch(`/api/chatbot/${chatbotId}/status`);
            const data = await response.json();

            if (response.ok) {
                if (data.chatbot_status === 'ready') {
                    return;
                } else if (data.chatbot_status === 'error') {
                    throw new Error('Processing failed');
                }
            }

            attempts++;
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            console.error('Error checking status:', error);
            // Continue waiting
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

// Display chatbot details after deployment
async function displayChatbotDetails(chatbotId, chatbotName, model, draftId) {
    const nameDisplay = document.getElementById('chatbot-name-display');
    const modelDisplay = document.getElementById('model-display');
    const docCountDisplay = document.getElementById('document-count');
    const urlInput = document.getElementById('chatbot-url');

    if (nameDisplay) nameDisplay.textContent = chatbotName;
    if (modelDisplay) modelDisplay.textContent = model;

    // Get document count
    try {
        const response = await fetch(`/api/chatbot/${chatbotId}/documents`);
        const data = await response.json();

        if (response.ok && docCountDisplay) {
            docCountDisplay.textContent = `${data.count || 0} documents`;
        }
    } catch (error) {
        console.error('Error loading documents:', error);
        if (docCountDisplay) docCountDisplay.textContent = 'Unknown';
    }

    // Set chatbot URL
    if (urlInput) {
        urlInput.value = `${window.location.origin}/chat/${chatbotId}`;
    }
}

// Setup navigation
function setupNavigation() {
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = '/create/step/2';
        });
    }
}

// Setup success actions
function setupSuccessActions() {
    // Copy URL functionality
    const copyBtn = document.getElementById('copy-url-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', function() {
            const urlInput = document.getElementById('chatbot-url');
            if (urlInput) {
                urlInput.select();
                document.execCommand('copy');

                const btn = this;
                const originalText = btn.textContent;
                btn.textContent = 'Copied!';
                btn.classList.add('copied');

                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.classList.remove('copied');
                }, 2000);
            }
        });
    }

    // Open chat button
    const openChatBtn = document.getElementById('open-chat-btn');
    if (openChatBtn) {
        openChatBtn.addEventListener('click', function() {
            const chatbotId = sessionStorage.getItem('chatbotId');
            if (chatbotId) {
                window.location.href = `/chat/${chatbotId}`;
            }
        });
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('/create/step/3')) {
        initStep3();
    }
});

