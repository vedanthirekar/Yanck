/**
 * Dashboard JavaScript for managing chatbots.
 * Handles fetching, displaying, searching, filtering, and deleting chatbots.
 */

// State management
let allChatbots = [];
let filteredChatbots = [];
let chatbotToDelete = null;

// DOM elements
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const errorState = document.getElementById('errorState');
const chatbotsGrid = document.getElementById('chatbotsGrid');
const searchInput = document.getElementById('searchInput');
const filterStatus = document.getElementById('filterStatus');
const filterModel = document.getElementById('filterModel');
const deleteModal = document.getElementById('deleteModal');
const deleteChatbotName = document.getElementById('deleteChatbotName');
const cancelDelete = document.getElementById('cancelDelete');
const confirmDelete = document.getElementById('confirmDelete');

/**
 * Initialize dashboard on page load
 */
document.addEventListener('DOMContentLoaded', () => {
    fetchChatbots();
    setupEventListeners();
});

/**
 * Setup event listeners for search, filter, and modal
 */
function setupEventListeners() {
    // Search input
    searchInput.addEventListener('input', handleSearch);

    // Filter selects
    filterStatus.addEventListener('change', applyFilters);
    filterModel.addEventListener('change', applyFilters);

    // Modal buttons
    cancelDelete.addEventListener('click', closeDeleteModal);
    confirmDelete.addEventListener('click', handleDelete);

    // Close modal on background click
    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) {
            closeDeleteModal();
        }
    });

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && deleteModal.style.display === 'flex') {
            closeDeleteModal();
        }
    });
}

/**
 * Fetch all chatbots from the API
 */
async function fetchChatbots() {
    showLoading();

    try {
        const response = await fetch('/api/chatbots');
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Failed to fetch chatbots');
        }

        allChatbots = data.chatbots || [];
        filteredChatbots = [...allChatbots];

        displayChatbots();
    } catch (error) {
        console.error('Error fetching chatbots:', error);
        showError(error.message);
    }
}

/**
 * Display chatbots in the grid
 */
function displayChatbots() {
    hideAllStates();

    if (filteredChatbots.length === 0) {
        if (allChatbots.length === 0) {
            // No chatbots at all
            emptyState.style.display = 'flex';
        } else {
            // No chatbots match filters
            showNoResults();
        }
        return;
    }

    chatbotsGrid.style.display = 'grid';
    chatbotsGrid.innerHTML = filteredChatbots.map(chatbot => createChatbotCard(chatbot)).join('');

    // Add event listeners to cards and buttons
    attachCardEventListeners();
}

/**
 * Create HTML for a chatbot card
 */
function createChatbotCard(chatbot) {
    const statusClass = getStatusClass(chatbot.status);
    const statusIcon = getStatusIcon(chatbot.status);
    const formattedDate = formatDate(chatbot.created_at);
    const chatUrl = `/chat/${chatbot.id}`;

    return `
        <div class="chatbot-card" data-chatbot-id="${chatbot.id}">
            <div class="card-header">
                <h3 class="card-title">${escapeHtml(chatbot.name)}</h3>
                <span class="status-badge ${statusClass}">
                    ${statusIcon} ${chatbot.status}
                </span>
            </div>

            <div class="card-body">
                <p class="card-description">${escapeHtml(truncateText(chatbot.system_prompt, 100))}</p>

                <div class="card-metadata">
                    <div class="metadata-item">
                        <span class="metadata-label">Model:</span>
                        <span class="metadata-value">${escapeHtml(chatbot.model)}</span>
                    </div>
                    <div class="metadata-item">
                        <span class="metadata-label">Documents:</span>
                        <span class="metadata-value">${chatbot.document_count} file${chatbot.document_count !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="metadata-item">
                        <span class="metadata-label">Created:</span>
                        <span class="metadata-value">${formattedDate}</span>
                    </div>
                </div>
            </div>

            <div class="card-actions">
                <button class="btn-secondary btn-edit" data-chatbot-id="${chatbot.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Edit
                </button>
                <button class="btn-danger btn-delete" data-chatbot-id="${chatbot.id}" data-chatbot-name="${escapeHtml(chatbot.name)}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Delete
                </button>
                <a href="${chatUrl}" target="_blank" class="btn-primary btn-open">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                    Open Chat
                </a>
            </div>
        </div>
    `;
}

/**
 * Attach event listeners to card buttons
 */
function attachCardEventListeners() {
    // Edit buttons
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const chatbotId = btn.dataset.chatbotId;
            window.location.href = `/create?edit=${chatbotId}`;
        });
    });

    // Delete buttons
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const chatbotId = btn.dataset.chatbotId;
            const chatbotName = btn.dataset.chatbotName;
            openDeleteModal(chatbotId, chatbotName);
        });
    });

    // Card click to open chat (except when clicking buttons)
    document.querySelectorAll('.chatbot-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Don't trigger if clicking on buttons
            if (e.target.closest('button') || e.target.closest('a')) {
                return;
            }
            const chatbotId = card.dataset.chatbotId;
            window.open(`/chat/${chatbotId}`, '_blank');
        });
    });
}

/**
 * Handle search input
 */
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    applyFilters(searchTerm);
}

/**
 * Apply all filters (search, status, model)
 */
function applyFilters(searchTerm = null) {
    const search = searchTerm !== null ? searchTerm : searchInput.value.toLowerCase().trim();
    const statusFilter = filterStatus.value;
    const modelFilter = filterModel.value;

    filteredChatbots = allChatbots.filter(chatbot => {
        // Search filter
        const matchesSearch = search === '' ||
            chatbot.name.toLowerCase().includes(search) ||
            chatbot.system_prompt.toLowerCase().includes(search);

        // Status filter
        const matchesStatus = statusFilter === 'all' || chatbot.status === statusFilter;

        // Model filter
        const matchesModel = modelFilter === 'all' || chatbot.model === modelFilter;

        return matchesSearch && matchesStatus && matchesModel;
    });

    displayChatbots();
}

/**
 * Open delete confirmation modal
 */
function openDeleteModal(chatbotId, chatbotName) {
    chatbotToDelete = chatbotId;
    deleteChatbotName.textContent = chatbotName;
    deleteModal.style.display = 'flex';
}

/**
 * Close delete confirmation modal
 */
function closeDeleteModal() {
    chatbotToDelete = null;
    deleteModal.style.display = 'none';
}

/**
 * Handle chatbot deletion
 */
async function handleDelete() {
    if (!chatbotToDelete) return;

    confirmDelete.disabled = true;
    confirmDelete.textContent = 'Deleting...';

    try {
        const response = await fetch(`/api/chatbot/${chatbotToDelete}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Failed to delete chatbot');
        }

        // Remove from local state
        allChatbots = allChatbots.filter(c => c.id !== chatbotToDelete);

        // Close modal and reapply filters
        closeDeleteModal();
        applyFilters();

        // Show success message (optional)
        console.log('Chatbot deleted successfully');
    } catch (error) {
        console.error('Error deleting chatbot:', error);
        alert(`Failed to delete chatbot: ${error.message}`);
    } finally {
        confirmDelete.disabled = false;
        confirmDelete.textContent = 'Delete';
    }
}

/**
 * Show loading state
 */
function showLoading() {
    hideAllStates();
    loadingState.style.display = 'flex';
}

/**
 * Show error state
 */
function showError(message) {
    hideAllStates();
    errorState.style.display = 'flex';
    errorState.querySelector('.error-message').textContent = message;
}

/**
 * Show no results message
 */
function showNoResults() {
    hideAllStates();
    chatbotsGrid.style.display = 'flex';
    chatbotsGrid.innerHTML = `
        <div class="no-results">
            <p>No chatbots match your search criteria</p>
            <button onclick="clearFilters()" class="btn-secondary">Clear Filters</button>
        </div>
    `;
}

/**
 * Clear all filters
 */
function clearFilters() {
    searchInput.value = '';
    filterStatus.value = 'all';
    filterModel.value = 'all';
    applyFilters();
}

/**
 * Hide all state containers
 */
function hideAllStates() {
    loadingState.style.display = 'none';
    emptyState.style.display = 'none';
    errorState.style.display = 'none';
    chatbotsGrid.style.display = 'none';
}

/**
 * Get CSS class for status badge
 */
function getStatusClass(status) {
    const statusMap = {
        'ready': 'status-ready',
        'processing': 'status-processing',
        'creating': 'status-creating',
        'error': 'status-error'
    };
    return statusMap[status] || 'status-default';
}

/**
 * Get icon for status
 */
function getStatusIcon(status) {
    const iconMap = {
        'ready': '✓',
        'processing': '⟳',
        'creating': '⋯',
        'error': '✕'
    };
    return iconMap[status] || '○';
}

/**
 * Format date to readable string
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Truncate text to specified length
 */
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
