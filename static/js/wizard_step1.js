/**
 * Step 1: Data - Chatbot Name, Special Instructions, and File Upload
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

function clearAllErrors() {
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
    });
}

function markDraftDataChanged() {
    sessionStorage.setItem('draftDataChanged', 'true');
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Initialize Step 1
function initStep1() {
    const form = document.getElementById('step1-form');
    if (!form) return;

    clearAllErrors();

    // Get or create draft_id from sessionStorage
    let draftId = sessionStorage.getItem('draftId');
    if (!draftId) {
        draftId = generateUUID();
        sessionStorage.setItem('draftId', draftId);
    }

    // Load existing files if any
    loadExistingFiles(draftId);

    // Handle file upload
    const fileInput = document.getElementById('file-input');
    const fileUploadArea = document.getElementById('file-upload-area');
    const fileList = document.getElementById('file-list');
    const nextBtn = document.getElementById('next-btn');

    let uploadedFiles = []; // Store uploaded file info

    // Click to browse files
    fileUploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    // Handle file selection
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files, draftId);
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
        handleFiles(e.dataTransfer.files, draftId);
    });

    // Handle file upload
    async function handleFiles(files, draftId) {
        clearError('file-error');

        const filesArray = Array.from(files);

        if (filesArray.length === 0) return;

        // Check total file count (including existing)
        const currentCount = uploadedFiles.length;
        if (currentCount + filesArray.length > 10) {
            showError('file-error', 'Maximum 10 files allowed per chatbot');
            return;
        }

        // Validate files
        const allowedExtensions = ['.pdf', '.txt', '.docx'];
        const maxSize = 50 * 1024 * 1024; // 50MB

        const validFiles = [];
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

            validFiles.push(file);
        }

        if (validFiles.length === 0) return;

        // Upload files
        const formData = new FormData();
        validFiles.forEach(file => {
            formData.append('files', file);
        });
        formData.append('draft_id', draftId);

        const progressContainer = document.getElementById('upload-progress');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        progressContainer.style.display = 'block';

        try {
            const response = await fetch('/api/draft/files', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            progressContainer.style.display = 'none';

            if (!response.ok) {
                showError('file-error', data.error?.message || 'Failed to upload files');
                return;
            }

            // Add uploaded files to list
            uploadedFiles.push(...data.uploaded_files);
            updateFileList();
            markDraftDataChanged();

            if (uploadedFiles.length > 0) {
                nextBtn.disabled = false;
            }

        } catch (error) {
            console.error('Error uploading files:', error);
            showError('file-error', 'Network error. Please check your connection and try again.');
            progressContainer.style.display = 'none';
        }
    }

    // Load existing files
    async function loadExistingFiles(draftId) {
        try {
            const response = await fetch(`/api/draft/${draftId}/files`);
            const data = await response.json();

            if (response.ok && data.files) {
                uploadedFiles = data.files;
                updateFileList();

                if (uploadedFiles.length > 0) {
                    nextBtn.disabled = false;
                }
            }
        } catch (error) {
            console.error('Error loading existing files:', error);
        }
    }

    // Update file list display
    function updateFileList() {
        fileList.innerHTML = '';

        uploadedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <span class="file-name">📄 ${file.filename || file.id}</span>
                <span class="file-size">${formatFileSize(file.file_size || 0)}</span>
                <button type="button" class="btn-remove" data-file-id="${file.id}">✕</button>
            `;
            fileList.appendChild(fileItem);
        });

        // Add delete handlers
        fileList.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const fileId = e.target.dataset.fileId;
                await deleteFile(draftId, fileId);
            });
        });
    }

    // Delete file
    async function deleteFile(draftId, fileId) {
        try {
            const response = await fetch(`/api/draft/${draftId}/files/${fileId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // Remove from local list
                uploadedFiles = uploadedFiles.filter(f => f.id !== fileId);
                updateFileList();
                markDraftDataChanged();

                if (uploadedFiles.length === 0) {
                    nextBtn.disabled = true;
                }
            } else {
                const data = await response.json();
                showError('file-error', data.error?.message || 'Failed to delete file');
            }
        } catch (error) {
            console.error('Error deleting file:', error);
            showError('file-error', 'Network error. Please try again.');
        }
    }

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAllErrors();

        const name = document.getElementById('chatbot-name').value.trim();
        const specialInstructions = document.getElementById('special-instructions').value.trim();

        let hasError = false;

        if (!name) {
            showError('name-error', 'Chatbot name is required');
            hasError = true;
        }

        if (uploadedFiles.length === 0) {
            showError('file-error', 'Please upload at least one file');
            hasError = true;
        }

        if (hasError) return;

        // Save data to sessionStorage
        sessionStorage.setItem('chatbotName', name);
        sessionStorage.setItem('specialInstructions', specialInstructions);
        sessionStorage.setItem('draftId', draftId);

        // Navigate to step 2
        window.location.href = '/create/step/2';
    });

    // Generate UUID
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('/create/step/1') || window.location.pathname === '/create') {
        initStep1();
    }
});
