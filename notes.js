/**
 * Notes Module for GCT UI
 * 
 * This module implements the notes functionality, including:
 * - Creating, editing, and deleting notes
 * - Markdown support with preview
 * - AI enhancement features
 * - Tags and search functionality
 */

// Panel Management System
const PanelManager = {
    activePanel: null,
    panelStates: new Map(),
    isTransitioning: false,
    
    init() {
        // Initialize panel states
        ['notes', 'chat', 'settings', 'note-editor'].forEach(panel => {
            this.panelStates.set(panel, {
                isOpen: false,
                lastPosition: null,
                data: null
            });
        });
    },
    
    setActivePanel(panelId) {
        console.log('PanelManager.setActivePanel called with:', panelId);
        // Prevent race conditions with async check
        if (this.isTransitioning) {
            console.log('Panel transition already in progress, ignoring');
            return;
        }
        this.isTransitioning = true;
        
        const previousPanel = this.activePanel;
        console.log('Previous panel:', previousPanel);
        if (previousPanel) {
            this.closePanel(previousPanel);
        }
        
        this.activePanel = panelId;
        if (panelId) {
            this.openPanel(panelId);
        }
        
        setTimeout(() => {
            this.isTransitioning = false;
        }, 300); // Match transition duration
    },
    
    openPanel(panelId) {
        console.log('PanelManager.openPanel called with:', panelId);
        const panel = document.getElementById(`${panelId}-panel`);
        console.log('Panel element found:', !!panel, panel);
        const state = this.panelStates.get(panelId);
        console.log('Panel state:', state);
        if (panel && state) {
            panel.classList.add('active');
            console.log('Added active class to panel');
            state.isOpen = true;
            this.updateNavigation(panelId);
            localStorage.setItem('lastActivePanel', panelId);
        } else {
            console.error('Failed to open panel - panel or state not found');
        }
    },
    
    closePanel(panelId) {
        const panel = document.getElementById(`${panelId}-panel`);
        const state = this.panelStates.get(panelId);
        if (panel && state) {
            panel.classList.remove('active');
            state.isOpen = false;
            this.updateNavigation(panelId);
        }
    },
    
    updateNavigation(activePanelId) {
        // Don't update navigation for note-editor panel
        if (activePanelId === 'note-editor') return;
        
        ['notes', 'chat', 'settings'].forEach(panelId => {
            const navItem = document.getElementById(`${panelId}-nav`);
            if (navItem) {
                navItem.classList.toggle('active', panelId === activePanelId);
            }
        });
    },
    
    restoreLastActivePanel() {
        const lastPanel = localStorage.getItem('lastActivePanel');
        if (lastPanel) {
            this.setActivePanel(lastPanel);
        }
    }
};

// Toast Notification System
const ToastManager = {
    queue: [],
    isProcessing: false,
    maxVisible: 3,
    visibleToasts: new Set(),
    
    init() {
        // Create container if it doesn't exist
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        this.container = container;
    },
    
    show(message, options = {}) {
        const toast = {
            id: Date.now(),
            message,
            type: options.type || 'info',
            priority: options.priority || 'normal',
            duration: options.duration || 3000,
            timestamp: Date.now()
        };
        
        // Add to queue based on priority
        if (toast.priority === 'high') {
            this.queue.unshift(toast);
        } else {
            this.queue.push(toast);
        }
        
        this.processQueue();
    },
    
    async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;
        
        this.isProcessing = true;
        
        while (this.queue.length > 0 && this.visibleToasts.size < this.maxVisible) {
            const toast = this.queue.shift();
            await this.displayToast(toast);
        }
        
        this.isProcessing = false;
    },
    
    async displayToast(toast) {
        const toastElement = document.createElement('div');
        toastElement.className = `toast toast-${toast.type}`;
        toastElement.textContent = toast.message;
        
        this.container.appendChild(toastElement);
        this.visibleToasts.add(toast.id);
        
        // Trigger reflow for animation
        toastElement.offsetHeight;
        toastElement.classList.add('show');
        
        return new Promise(resolve => {
            setTimeout(() => {
                toastElement.classList.add('fade-out');
                setTimeout(() => {
                    if (this.container.contains(toastElement)) {
                        this.container.removeChild(toastElement);
                        this.visibleToasts.delete(toast.id);
                        this.processQueue();
                    }
                    resolve();
                }, 300);
            }, toast.duration);
        });
    }
};

// Update showToast function with ToastManager
function showToast(message, type = 'success', priority = 'normal') {
    ToastManager.show(message, { type, priority });
}

// Notes Module using IIFE pattern
var Notes = (function() {
    'use strict';

    // Utility Functions
    function getRequiredElement(id) {
        const element = document.getElementById(id);
        if (!element) throw new Error(`Required element #${id} not found`);
        return element;
    }

    function validateNote(note) {
        if (!note.title || note.title.length > 255) throw new Error('Invalid title');
        // Allow empty content for new notes
        if (note.content === null || note.content === undefined) throw new Error('Content must be defined');
        if (!Array.isArray(note.tags)) throw new Error('Tags must be an array');
        return note;
    }

    async function saveNotesToStorage() {
        const MAX_RETRIES = 3;
        let retryCount = 0;

        while (retryCount < MAX_RETRIES) {
            try {
                const serializedNotes = JSON.stringify(notes);
                if (!serializedNotes) {
                    throw new Error('Failed to serialize notes');
                }

                // Check available space
                const totalSize = new Blob([serializedNotes]).size;
                if (totalSize > 5242880) { // 5MB limit
                    throw new Error('Notes exceed storage limit');
                }

                await new Promise((resolve, reject) => {
                    try {
                        localStorage.setItem('gct_notes', serializedNotes);
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
                
                return; // Success
            } catch (e) {
                console.error(`Failed to save notes (attempt ${retryCount + 1}):`, e);
                retryCount++;
                
                if (retryCount === MAX_RETRIES) {
                    showToast('Failed to save notes - Please backup your changes', 'error');
                    throw e;
                }
                
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    function cleanupEventListeners(element) {
        const oldItems = element.querySelectorAll('.note-item');
        oldItems.forEach(item => {
            const clone = item.cloneNode(true);
            item.parentNode.replaceChild(clone, item);
        });
    }

    // DOM Elements
    let notesPanel;
    let noteEditorPanel;
    let notesNav;
    let closeNotesBtn;
    let newNoteBtn;
    let notesList;
    let notesSearchInput;
    let notesClearSearch;
    let tagsFilterList;
    
    // Note Editor Elements
    let backToNotesBtn;
    let noteTitleInput;
    let noteContentInput;
    let noteContentDisplay;
    let tagInput;
    let addTagBtn;
    let noteTagsList;
    let saveNoteBtn;
    let deleteNoteBtn;
    let enhanceNoteBtn;
    
    // View Toggle Elements
    let editViewBtn;
    let splitViewBtn;
    let previewViewBtn;
    
    // AI Tools Elements
    let aiToolsToggle;
    let aiToolsPanel;
    let aiSuggestionBtns;
    let aiPromptInput;
    let aiPromptBtn;
    let aiResponse;
    let aiThinking;
    
    // Markdown Toolbar Elements
    let mdToolBtns;
    
    // Notes Data
    let notes = [];
    let tags = [];
    let currentNoteId = null;
    let isEditing = false;
    let autoSaveTimeout;
    const AUTOSAVE_DELAY = 2000; // 2 seconds
    const noteStates = new Map();

    // Data Protection Functions
    function hasUnsavedChanges() {
        if (!currentNoteId) return false;
        
        const note = notes.find(n => n.id === currentNoteId);
        if (!note) return false;
        
        return note.title !== noteTitleInput.value ||
               note.content !== noteContentInput.value;
    }

    // Non-blocking unsaved changes prompt using toast with action buttons
    function promptForUnsavedChanges() {
        return new Promise((resolve) => {
            if (!hasUnsavedChanges()) {
                resolve(true);
                return;
            }
            // Create a custom toast with Save/Discard/Cancel actions
            const toast = document.createElement('div');
            toast.className = 'toast toast-warning unsaved-toast';
            toast.innerHTML = `
                <span>You have unsaved changes.</span>
                <button class="toast-action" data-action="save">Save</button>
                <button class="toast-action" data-action="discard">Discard</button>
                <button class="toast-action" data-action="cancel">Cancel</button>
            `;
            ToastManager.container.appendChild(toast);

            function cleanup() {
                if (ToastManager.container.contains(toast)) {
                    ToastManager.container.removeChild(toast);
                }
            }

            toast.addEventListener('click', (e) => {
                if (e.target.classList.contains('toast-action')) {
                    const action = e.target.getAttribute('data-action');
                    cleanup();
                    if (action === 'save') {
                        saveNote().then(() => resolve(true)).catch(() => resolve(false));
                    } else if (action === 'discard') {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                }
            });
        });
    }

    function setupAutoSave() {
        function triggerAutoSave() {
            clearTimeout(autoSaveTimeout);
            autoSaveTimeout = setTimeout(() => {
                if (isEditing && currentNoteId !== null) {
                    saveNote(true); // true indicates auto-save
                }
            }, AUTOSAVE_DELAY);
        }

        if (noteContentInput) {
            noteContentInput.addEventListener('input', triggerAutoSave);
        }
        if (noteTitleInput) {
            noteTitleInput.addEventListener('input', triggerAutoSave);
        }
    }

    function saveNoteState() {
        if (!currentNoteId) return;
        
        noteStates.set(currentNoteId, {
            scroll: noteContentInput.scrollTop,
            selection: {
                start: noteContentInput.selectionStart,
                end: noteContentInput.selectionEnd
            },
            viewMode: noteEditorPanel.className.includes('split') ? 'split' :
                     noteEditorPanel.className.includes('preview') ? 'preview' : 'edit'
        });
    }

    function restoreNoteState(noteId) {
        const state = noteStates.get(noteId);
        if (!state) return;
        
        setViewMode(state.viewMode);
        noteContentInput.scrollTop = state.scroll;
        noteContentInput.setSelectionRange(state.selection.start, state.selection.end);
    }
    
    // Initialize the module
    async function init() {
        try {
            console.log('Initializing Notes module');
            
            // Initialize core managers
            PanelManager.init();
            ViewManager.init();
            ToastManager.init();
            
            // Initialize with error recovery
            const initPromises = [
                // Load notes with retry mechanism
                (async () => {
                    try {
                        await loadNotes();
                    } catch (e) {
                        console.error('Failed to load notes:', e);
                        notes = [];
                        showToast('Started with empty notes due to load error', 'warning');
                    }
                })(),
                
                // Restore view preferences with fallback
                (async () => {
                    try {
                        const preferredViewMode = localStorage.getItem('preferredViewMode') || 'edit';
                        await ViewManager.setViewMode(preferredViewMode);
                    } catch (e) {
                        console.error('Failed to restore view mode:', e);
                        await ViewManager.setViewMode('edit');
                    }
                })(),
                
                // Check AI connection with timeout
                (async () => {
                    try {
                        const timeoutPromise = new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('KYNSEY connection timeout')), 5000)
                        );
                        await Promise.race([checkAIConnection(), timeoutPromise]);
                    } catch (e) {
                        console.error('KYNSEY service connection failed:', e);
                        aiToolsToggle.classList.add('disabled');
                    }
                })()
            ];
            
            // Get DOM elements with error handling
            const requiredElements = {
                'notes-panel': el => notesPanel = el,
                'note-editor-panel': el => noteEditorPanel = el,
                'notes-nav': el => notesNav = el,
                'close-notes': el => closeNotesBtn = el,
                'new-note-btn': el => newNoteBtn = el,
                'notes-list': el => notesList = el,
                'notes-search-input': el => notesSearchInput = el,
                'notes-clear-search': el => notesClearSearch = el,
                'tags-filter-list': el => tagsFilterList = el,
                'back-to-notes': el => backToNotesBtn = el,
                'note-title-input': el => noteTitleInput = el,
                'note-content-input': el => noteContentInput = el,
                'note-content-display': el => noteContentDisplay = el,
                'tag-input': el => tagInput = el,
                'add-tag-btn': el => addTagBtn = el,
                'note-tags-list': el => noteTagsList = el,
                'save-note-btn': el => saveNoteBtn = el,
                'delete-note-btn': el => deleteNoteBtn = el,
                'enhance-note-btn': el => enhanceNoteBtn = el
            };

            // Initialize elements with error handling
            // Initialize UI elements with error recovery
            for (const [id, setter] of Object.entries(requiredElements)) {
                try {
                    const element = getRequiredElement(id);
                    setter(element);
                } catch (e) {
                    console.error(`Failed to initialize element #${id}:`, e);
                    showToast(`UI initialization error: ${id}`, 'error');
                    throw new Error(`Critical UI element missing: ${id}`);
                }
            }
            
            // Initialize view toggle elements
            editViewBtn = document.getElementById('edit-view-btn');
            splitViewBtn = document.getElementById('split-view-btn');
            previewViewBtn = document.getElementById('preview-view-btn');
            
            // Initialize AI tools elements
            aiToolsToggle = document.querySelector('.ai-tools-toggle');
            aiToolsPanel = document.getElementById('ai-tools-panel');
            aiSuggestionBtns = document.querySelectorAll('.ai-suggestion-btn');
            aiPromptInput = document.getElementById('ai-prompt-input');
            aiPromptBtn = document.getElementById('ai-prompt-btn');
            aiResponse = document.getElementById('ai-response');
            aiThinking = document.getElementById('ai-thinking');
            
            // Initialize markdown toolbar elements
            mdToolBtns = document.querySelectorAll('.md-tool-btn');
            
            // Add event listeners
            // Setup core functionality
            setupEventListeners();
            setupPanelNavigation();
            
            // Wait for all async operations
            await Promise.allSettled(initPromises);
            
            // Restore panel state last to ensure all systems are ready
            try {
                PanelManager.restoreLastActivePanel();
            } catch (e) {
                console.error('Failed to restore panel state:', e);
                showToast('Panel state restoration failed', 'warning');
            }
            
            console.log('Notes module initialized');
        } catch (e) {
            console.error('Failed to initialize Notes module:', e);
            showToast('Critical initialization error - Please refresh', 'error');
            throw e;
        }
    }

    // Setup Event Listeners
    function setupEventListeners() {
        try {
            // Add all event listeners
            if (closeNotesBtn) closeNotesBtn.addEventListener('click', toggleNotesPanel);
            if (newNoteBtn) {
                console.log('Adding click listener to new note button');
                newNoteBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('New note button clicked');
                    createNewNote();
                });
            } else {
                console.error('New note button not found!');
            }
            if (notesSearchInput) {
                notesSearchInput.addEventListener('input', (e) => {
                    e.preventDefault();
                    searchNotes();
                });
            }
            if (notesClearSearch) notesClearSearch.addEventListener('click', clearSearch);
            if (backToNotesBtn) backToNotesBtn.addEventListener('click', closeNoteEditor);
            if (saveNoteBtn) saveNoteBtn.addEventListener('click', saveNote);
            if (deleteNoteBtn) deleteNoteBtn.addEventListener('click', deleteNote);
            if (enhanceNoteBtn) enhanceNoteBtn.addEventListener('click', enhanceNote);
            
            // Tag input handlers
            if (tagInput) {
                tagInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') addTag();
                });
            }
            if (addTagBtn) addTagBtn.addEventListener('click', addTag);
            
            // View toggle handlers
            if (editViewBtn) editViewBtn.addEventListener('click', () => setViewMode('edit'));
            if (splitViewBtn) splitViewBtn.addEventListener('click', () => setViewMode('split'));
            if (previewViewBtn) previewViewBtn.addEventListener('click', () => setViewMode('preview'));
            
            // AI tools handlers
            if (aiToolsToggle) aiToolsToggle.addEventListener('click', toggleAITools);
            if (aiSuggestionBtns) {
                aiSuggestionBtns.forEach(btn => {
                    btn.addEventListener('click', handleAISuggestion);
                });
            }
            if (aiPromptBtn) aiPromptBtn.addEventListener('click', handleCustomPrompt);
            if (aiPromptInput) {
                aiPromptInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') handleCustomPrompt();
                });
            }
            
            // Markdown toolbar handlers
            if (mdToolBtns) {
                mdToolBtns.forEach(btn => {
                    btn.addEventListener('click', handleMarkdownToolClick);
                });
            }
            
            // Note content preview handler
            if (noteContentInput) {
                noteContentInput.addEventListener('input', updatePreview);
            }
            
            // Initialize auto-save
            setupAutoSave();
            
            // Setup enhanced toolbar handlers
            setupEnhancedToolbar();
            
            // Initialize Rich Text mode as default
            if (isRichTextMode && noteContentDisplay) {
                enableWYSIWYGMode();
            }
        } catch (e) {
            console.error('Error setting up event listeners:', e);
            throw e;
        }
    }
    
    // Setup enhanced toolbar features
    function setupEnhancedToolbar() {
        try {
            // Heading selector
            const headingSelect = document.getElementById('heading-select');
            if (headingSelect) {
                headingSelect.addEventListener('change', (e) => {
                    const level = e.target.value;
                    if (level) {
                        applyHeading(level);
                        e.target.value = ''; // Reset selection
                    }
                });
            }
            
            // Font size selector
            const fontSizeSelect = document.getElementById('font-size-select');
            if (fontSizeSelect) {
                fontSizeSelect.addEventListener('change', (e) => {
                    const size = e.target.value;
                    if (size) {
                        applyFontSize(size);
                        e.target.value = ''; // Reset selection
                    }
                });
            }
            
            // Text color
            const textColorInput = document.getElementById('text-color');
            if (textColorInput) {
                textColorInput.addEventListener('change', (e) => {
                    applyTextColor(e.target.value);
                });
            }
            
            // Highlight color
            const highlightColorInput = document.getElementById('highlight-color');
            if (highlightColorInput) {
                highlightColorInput.addEventListener('change', (e) => {
                    applyHighlightColor(e.target.value);
                });
            }
            
            // Combined editor mode toggle with edit view button
            const editViewBtn = document.getElementById('edit-view-btn');
            if (editViewBtn) {
                // Single click: set view mode to edit
                editViewBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    ViewManager.setViewMode('edit');
                });
                
                // Double click: toggle editor mode (Rich Text / Markdown)
                editViewBtn.addEventListener('dblclick', (e) => {
                    e.preventDefault();
                    toggleEditorMode();
                });
            }
            
            // Add keyboard shortcuts
            setupKeyboardShortcuts();
            
        } catch (e) {
            console.error('Error setting up enhanced toolbar:', e);
        }
    }
    
    // Apply heading formatting
    function applyHeading(level) {
        saveUndoState();
        const start = noteContentInput.selectionStart;
        const end = noteContentInput.selectionEnd;
        const text = noteContentInput.value;
        const selectedText = text.slice(start, end);
        
        // Find the start of the current line
        let lineStart = start;
        while (lineStart > 0 && text[lineStart - 1] !== '\n') {
            lineStart--;
        }
        
        // Find the end of the current line
        let lineEnd = end;
        while (lineEnd < text.length && text[lineEnd] !== '\n') {
            lineEnd++;
        }
        
        const currentLine = text.slice(lineStart, lineEnd);
        const cleanLine = currentLine.replace(/^#+\s*/, ''); // Remove existing headers
        
        const prefix = level === 'h1' ? '# ' : level === 'h2' ? '## ' : level === 'h3' ? '### ' : '#### ';
        const newLine = prefix + cleanLine;
        
        noteContentInput.value = text.slice(0, lineStart) + newLine + text.slice(lineEnd);
        noteContentInput.setSelectionRange(lineStart + prefix.length, lineStart + newLine.length);
        updatePreview();
    }
    
    // Apply font size
    function applyFontSize(size) {
        saveUndoState();
        const start = noteContentInput.selectionStart;
        const end = noteContentInput.selectionEnd;
        const text = noteContentInput.value;
        const selectedText = text.slice(start, end);
        
        if (selectedText) {
            const styledText = `<span style="font-size: ${size}pt">${selectedText}</span>`;
            noteContentInput.value = text.slice(0, start) + styledText + text.slice(end);
            noteContentInput.setSelectionRange(start, start + styledText.length);
            updatePreview();
        }
    }
    
    // Apply text color
    function applyTextColor(color) {
        saveUndoState();
        const start = noteContentInput.selectionStart;
        const end = noteContentInput.selectionEnd;
        const text = noteContentInput.value;
        const selectedText = text.slice(start, end);
        
        if (selectedText) {
            const styledText = `<span style="color: ${color}">${selectedText}</span>`;
            noteContentInput.value = text.slice(0, start) + styledText + text.slice(end);
            noteContentInput.setSelectionRange(start, start + styledText.length);
            updatePreview();
        }
    }
    
    // Apply highlight color
    function applyHighlightColor(color) {
        saveUndoState();
        const start = noteContentInput.selectionStart;
        const end = noteContentInput.selectionEnd;
        const text = noteContentInput.value;
        const selectedText = text.slice(start, end);
        
        if (selectedText) {
            const styledText = `<mark style="background-color: ${color}">${selectedText}</mark>`;
            noteContentInput.value = text.slice(0, start) + styledText + text.slice(end);
            noteContentInput.setSelectionRange(start, start + styledText.length);
            updatePreview();
        }
    }
    
    // Toggle between markdown and WYSIWYG mode
    function toggleEditorMode() {
        isRichTextMode = !isRichTextMode;
        const editViewBtn = document.getElementById('edit-view-btn');
        const modeIndicator = editViewBtn?.querySelector('.editor-mode-indicator');
        
        if (modeIndicator) {
            if (isRichTextMode) {
                modeIndicator.textContent = ' (Rich Text)';
                editViewBtn.style.backgroundColor = 'var(--accent-primary)';
                editViewBtn.style.color = 'var(--bg-primary)';
                enableWYSIWYGMode();
            } else {
                modeIndicator.textContent = ' (Markdown)';
                editViewBtn.style.backgroundColor = '';
                editViewBtn.style.color = '';
                disableWYSIWYGMode();
            }
        }
    }
    
    // Enable WYSIWYG mode
    function enableWYSIWYGMode() {
        if (!noteContentInput || !noteContentDisplay) return;
        
        // Hide textarea, show preview as editable
        noteContentInput.style.display = 'none';
        noteContentDisplay.contentEditable = true;
        noteContentDisplay.style.outline = '1px solid var(--border-color)';
        noteContentDisplay.style.minHeight = '400px';
        noteContentDisplay.style.padding = '15px';
        
        // Update preview with current content
        updatePreview();
        
        // Add content change listener
        noteContentDisplay.addEventListener('input', handleWYSIWYGInput);
    }
    
    // Disable WYSIWYG mode
    function disableWYSIWYGMode() {
        if (!noteContentInput || !noteContentDisplay) return;
        
        // Show textarea, make preview non-editable
        noteContentInput.style.display = 'block';
        noteContentDisplay.contentEditable = false;
        noteContentDisplay.style.outline = 'none';
        noteContentDisplay.style.minHeight = '';
        noteContentDisplay.style.padding = '';
        
        // Remove content change listener
        noteContentDisplay.removeEventListener('input', handleWYSIWYGInput);
    }
    
    // Handle WYSIWYG input
    function handleWYSIWYGInput() {
        // Convert HTML back to markdown
        const html = noteContentDisplay.innerHTML;
        const markdown = htmlToMarkdown(html);
        noteContentInput.value = markdown;
    }
    
    // Basic HTML to Markdown converter
    function htmlToMarkdown(html) {
        let markdown = html;
        
        // Convert headers
        markdown = markdown.replace(/<h1>(.*?)<\/h1>/gi, '# $1\n');
        markdown = markdown.replace(/<h2>(.*?)<\/h2>/gi, '## $1\n');
        markdown = markdown.replace(/<h3>(.*?)<\/h3>/gi, '### $1\n');
        markdown = markdown.replace(/<h4>(.*?)<\/h4>/gi, '#### $1\n');
        
        // Convert formatting
        markdown = markdown.replace(/<strong>(.*?)<\/strong>/gi, '**$1**');
        markdown = markdown.replace(/<b>(.*?)<\/b>/gi, '**$1**');
        markdown = markdown.replace(/<em>(.*?)<\/em>/gi, '_$1_');
        markdown = markdown.replace(/<i>(.*?)<\/i>/gi, '_$1_');
        markdown = markdown.replace(/<u>(.*?)<\/u>/gi, '<u>$1</u>');
        markdown = markdown.replace(/<strike>(.*?)<\/strike>/gi, '~~$1~~');
        markdown = markdown.replace(/<s>(.*?)<\/s>/gi, '~~$1~~');
        
        // Convert links
        markdown = markdown.replace(/<a href="(.*?)">(.*?)<\/a>/gi, '[$2]($1)');
        
        // Convert images
        markdown = markdown.replace(/<img src="(.*?)" alt="(.*?)".*?>/gi, '![$2]($1)');
        
        // Convert lists
        markdown = markdown.replace(/<li>(.*?)<\/li>/gi, '- $1\n');
        markdown = markdown.replace(/<ul>|<\/ul>/gi, '');
        markdown = markdown.replace(/<ol>|<\/ol>/gi, '');
        
        // Convert code
        markdown = markdown.replace(/<code>(.*?)<\/code>/gi, '`$1`');
        markdown = markdown.replace(/<pre>(.*?)<\/pre>/gis, '```\n$1\n```');
        
        // Convert blockquotes
        markdown = markdown.replace(/<blockquote>(.*?)<\/blockquote>/gis, (match, p1) => {
            return p1.split('\n').map(line => `> ${line}`).join('\n');
        });
        
        // Convert line breaks and paragraphs
        markdown = markdown.replace(/<br\s*\/?>/gi, '\n');
        markdown = markdown.replace(/<p>(.*?)<\/p>/gi, '$1\n\n');
        
        // Clean up remaining HTML
        markdown = markdown.replace(/<[^>]+>/g, '');
        
        // Decode HTML entities
        const textarea = document.createElement('textarea');
        textarea.innerHTML = markdown;
        markdown = textarea.value;
        
        return markdown.trim();
    }
    
    // Setup keyboard shortcuts
    function setupKeyboardShortcuts() {
        if (!noteContentInput) return;
        
        noteContentInput.addEventListener('keydown', (e) => {
            // Ctrl/Cmd key combinations
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'b':
                        e.preventDefault();
                        document.querySelector('[data-action="bold"]')?.click();
                        break;
                    case 'i':
                        e.preventDefault();
                        document.querySelector('[data-action="italic"]')?.click();
                        break;
                    case 'u':
                        e.preventDefault();
                        document.querySelector('[data-action="underline"]')?.click();
                        break;
                    case 'z':
                        if (!e.shiftKey) {
                            e.preventDefault();
                            handleUndo();
                        }
                        break;
                    case 'y':
                        e.preventDefault();
                        handleRedo();
                        break;
                }
            }
            
            // Ctrl+Shift combinations
            if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
                switch (e.key.toLowerCase()) {
                    case 'z':
                        e.preventDefault();
                        handleRedo();
                        break;
                }
            }
        });
    }
// Setup Panel Navigation
function setupPanelNavigation() {
    console.log('Setting up panel navigation in notes.js');
    ['notes', 'chat', 'settings'].forEach(panelId => {
        const navItem = document.getElementById(`${panelId}-nav`);
        console.log(`Setting up ${panelId}-nav:`, navItem);
        if (navItem) {
            navItem.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); // Prevent event bubbling
                console.log(`${panelId}-nav clicked in notes.js`);
                PanelManager.setActivePanel(
                    PanelManager.activePanel === panelId ? null : panelId
                );
            });
        }
    });
}

// Toggle Notes Panel
function toggleNotesPanel() {
    try {
        PanelManager.setActivePanel(
            PanelManager.activePanel === 'notes' ? null : 'notes'
        );
    } catch (e) {
        console.error('Error toggling notes panel:', e);
        showToast('Error toggling panel', 'error');
    }
}



    // Note Operations
        async function loadNotes() {
            console.time('loadNotes');
            try {
                let storedNotes;
                try {
                    storedNotes = localStorage.getItem('gct_notes');
                } catch (e) {
                    console.error('Failed to read from localStorage:', e);
                    throw new Error('Storage access failed');
                }
    
                if (!storedNotes) {
                    notes = [];
                    return;
                }
    
                try {
                    const parsedNotes = JSON.parse(storedNotes);
                    if (!Array.isArray(parsedNotes)) {
                        throw new Error('Invalid notes format');
                    }
    
                    // Validate each note
                    notes = parsedNotes.filter(note => {
                        try {
                            validateNote(note);
                            return true;
                        } catch (e) {
                            console.warn('Skipping invalid note:', e);
                            return false;
                        }
                    });
    
                    refreshNotesList();
                    updateTagsList();
                } catch (e) {
                    console.error('Failed to parse notes:', e);
                    showToast('Error loading notes - Using empty state', 'error');
                    notes = [];
                }
            } catch (e) {
                console.error('Critical error loading notes:', e);
                showToast('Failed to access storage - Please check permissions', 'error');
                notes = [];
            } finally {
                console.timeEnd('loadNotes');
            }
        }

    function createNewNote() {
        console.log('createNewNote function called');
        try {
            const newNote = {
                id: Date.now(),
                title: 'New Note',
                content: '',
                tags: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            console.log('New note object:', newNote);
            
            validateNote(newNote);
            console.log('Note validated successfully');
            
            notes.unshift(newNote);
            console.log('Note added to notes array, total notes:', notes.length);
            
            saveNotesToStorage();
            console.log('Notes saved to storage');
            
            openNote(newNote.id);
            console.log('Opening note editor for new note');
        } catch (e) {
            console.error('Error creating note:', e);
            showToast(`Error creating note: ${e.message}`, 'error');
        }
    }

    async function openNote(id) {
        try {
            if (currentNoteId && hasUnsavedChanges()) {
                const proceed = await promptForUnsavedChanges();
                if (!proceed) return;
                saveNoteState();
            }

            const note = notes.find(n => n.id === id);
            if (!note) throw new Error('Note not found');

            currentNoteId = id;
            noteTitleInput.value = note.title;
            noteContentInput.value = note.content;
            updatePreview();

            // Update tags using encapsulated function
            renderNoteTags(note);

            PanelManager.setActivePanel('note-editor');
            restoreNoteState(id) || setViewMode('edit');
        } catch (e) {
            console.error('Error opening note:', e);
            showToast('Error opening note', 'error');
        }
    }

    async function closeNoteEditor() {
        try {
            if (hasUnsavedChanges()) {
                const proceed = await promptForUnsavedChanges();
                if (!proceed) return;
            }

            if (currentNoteId) {
                saveNoteState();
            }

            PanelManager.setActivePanel('notes');
            currentNoteId = null;
            cleanupEventListeners(noteTagsList);
        } catch (e) {
            console.error('Error closing editor:', e);
            showToast('Error closing editor', 'error');
        }
    }

    function saveNote(isAutoSave = false) {
        try {
            const note = notes.find(n => n.id === currentNoteId);
            if (!note) throw new Error('Note not found');
            
            const updatedNote = {
                ...note,
                title: noteTitleInput.value,
                content: noteContentInput.value,
                updatedAt: new Date().toISOString()
            };
            
            validateNote(updatedNote);
            Object.assign(note, updatedNote);
            saveNotesToStorage();
            refreshNotesList();
            if (!isAutoSave) {
                showToast('Note saved successfully', 'success');
            }
        } catch (e) {
            console.error('Error saving note:', e);
            showToast('Error saving note', 'error');
        }
    }

    function deleteNote() {
        try {
            const index = notes.findIndex(n => n.id === currentNoteId);
            if (index === -1) throw new Error('Note not found');
            
            notes.splice(index, 1);
            saveNotesToStorage();
            closeNoteEditor();
            refreshNotesList();
            updateTagsList();
            showToast('Note deleted successfully', 'success');
        } catch (e) {
            console.error('Error deleting note:', e);
            showToast('Error deleting note', 'error');
        }
    }

    // Search and Filter
    // Debounce utility
    function debounce(fn, delay) {
        let timer = null;
        return function(...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    const debouncedSearchNotes = debounce(_searchNotes, 250);

    function searchNotes() {
        debouncedSearchNotes();
    }

    function _searchNotes() {
        const searchId = `search-${Date.now()}`;
        console.time(searchId);
        const searchStart = performance.now();
        try {
            const query = notesSearchInput.value.toLowerCase();
            const items = notesList.getElementsByClassName('note-item');

            Array.from(items).forEach(item => {
                const title = item.querySelector('.note-title').textContent.toLowerCase();
                const content = item.querySelector('.note-preview').textContent.toLowerCase();
                const visible = title.includes(query) || content.includes(query);
                item.style.display = visible ? '' : 'none';
            });

            console.timeEnd(searchId);
            console.log(`Search execution time: ${performance.now() - searchStart}ms`);
            console.log(`Search query length: ${query.length}, results shown: ${Array.from(items).filter(item => item.style.display === '').length}`);
        } catch (e) {
            console.error('Error searching notes:', e);
            showToast('Error searching notes', 'error');
        }
    }

    function clearSearch() {
        try {
            notesSearchInput.value = '';
            searchNotes();
        } catch (e) {
            console.error('Error clearing search:', e);
            showToast('Error clearing search', 'error');
        }
    }

    // Tag Management
    function addTag() {
        try {
            const tag = tagInput.value.trim();
            if (!tag) return;
            
            const note = notes.find(n => n.id === currentNoteId);
            if (!note) throw new Error('Note not found');
            
            if (!note.tags.includes(tag)) {
                note.tags.push(tag);
                const tagEl = document.createElement('span');
                tagEl.className = 'tag';
                tagEl.textContent = tag;
                tagEl.onclick = () => removeTag(tag);
                noteTagsList.appendChild(tagEl);
                saveNotesToStorage();
                updateTagsList();
            }
            
            tagInput.value = '';
        } catch (e) {
            console.error('Error adding tag:', e);
            showToast('Error adding tag', 'error');
        }
    }

    function removeTag(tag) {
        try {
            const note = notes.find(n => n.id === currentNoteId);
            if (!note) throw new Error('Note not found');
            
            note.tags = note.tags.filter(t => t !== tag);
            noteTagsList.innerHTML = '';
            note.tags.forEach(t => {
                const tagEl = document.createElement('span');
                tagEl.className = 'tag';
                tagEl.textContent = t;
                tagEl.onclick = () => removeTag(t);
                noteTagsList.appendChild(tagEl);
            });
            
            saveNotesToStorage();
            updateTagsList();
        } catch (e) {
            console.error('Error removing tag:', e);
            showToast('Error removing tag', 'error');
        }
    }

    // View Management
    const ViewManager = {
        currentMode: 'edit',
        transitionInProgress: false,

        init() {
            this.editor = document.getElementById('note-editor-panel');
            this.content = document.getElementById('note-content-input');
            this.preview = document.getElementById('note-content-display');
            this.setupTransitionHandling();
        },

        setupTransitionHandling() {
            // Prevent flickering by handling transitions
            this.editor.addEventListener('transitionstart', () => {
                this.transitionInProgress = true;
            });
            
            this.editor.addEventListener('transitionend', () => {
                this.transitionInProgress = false;
                this.applyScrollPosition();
            });
        },

        async setViewMode(mode) {
            if (this.transitionInProgress) {
                console.log('View transition in progress, deferring mode change');
                return;
            }

            this.transitionInProgress = true;

            try {
                // Save scroll positions before mode change
                this.saveScrollPosition();

                // Create a promise that resolves when transition ends
                const transitionPromise = new Promise(resolve => {
                    const transitionEndHandler = () => {
                        this.editor.removeEventListener('transitionend', transitionEndHandler);
                        resolve();
                    };
                    this.editor.addEventListener('transitionend', transitionEndHandler);
                });

                // Remove existing mode classes
                this.editor.classList.remove('edit-mode', 'split-mode', 'preview-mode');

                // Add new mode class
                this.editor.classList.add(`${mode}-mode`);
                this.currentMode = mode;

                // Update buttons state
                this.updateViewButtons(mode);

                // Handle split view specific logic
                if (mode === 'split') {
                    this.setupSplitView();
                }

                // Wait for transition to complete
                await transitionPromise;

                // Store user preference
                try {
                    localStorage.setItem('preferredViewMode', mode);
                } catch (e) {
                    console.warn('Failed to save view mode preference:', e);
                }

                // Apply final scroll position
                this.applyScrollPosition();
            } catch (error) {
                console.error('Error during view transition:', error);
                showToast('Failed to change view mode', 'error');
            } finally {
                this.transitionInProgress = false;
            }
        },

        saveScrollPosition() {
            if (!this.content || !this.preview) return;
            
            this.lastScrollPosition = {
                editor: this.content.scrollTop,
                preview: this.preview.scrollTop
            };
        },

        applyScrollPosition() {
            if (!this.lastScrollPosition) return;
            
            if (this.content) {
                this.content.scrollTop = this.lastScrollPosition.editor;
            }
            if (this.preview) {
                this.preview.scrollTop = this.lastScrollPosition.preview;
            }
        },

        setupSplitView() {
            if (!this.content || !this.preview) return;
            
            // Sync scroll positions between editor and preview
            const syncScroll = (source, target) => {
                const percentage = source.scrollTop /
                    (source.scrollHeight - source.clientHeight);
                target.scrollTop = percentage *
                    (target.scrollHeight - target.clientHeight);
            };
            
            this.content.addEventListener('scroll', () => {
                if (this.currentMode === 'split') {
                    syncScroll(this.content, this.preview);
                }
            });
            
            this.preview.addEventListener('scroll', () => {
                if (this.currentMode === 'split') {
                    syncScroll(this.preview, this.content);
                }
            });
        },

        updateViewButtons(mode) {
            ['edit', 'split', 'preview'].forEach(viewMode => {
                const button = document.getElementById(`${viewMode}-view-btn`);
                if (button) {
                    button.classList.toggle('active', viewMode === mode);
                }
            });
        }
    };

    function setViewMode(mode) {
        ViewManager.setViewMode(mode);
        updatePreview();
    }

    // AI Tools
    function toggleAITools() {
        try {
            aiToolsPanel.classList.toggle('active');
            aiToolsToggle.classList.toggle('active');
        } catch (e) {
            console.error('Error toggling KYNSEY tools:', e);
            showToast('Error toggling KYNSEY tools', 'error');
        }
    }

    async function handleAISuggestion(event) {
        try {
            const action = event.target.dataset.action;
            if (!action) throw new Error('No action provided');
            
            const note = notes.find(n => n.id === currentNoteId);
            if (!note) throw new Error('No note selected');
            
            let prompt = '';
            switch (action) {
                case 'summarize':
                    prompt = `Please summarize the following note concisely:\n\nTitle: ${note.title}\nContent: ${note.content}`;
                    break;
                case 'improve':
                    prompt = `Please improve the writing quality of this note, making it clearer and more engaging:\n\nTitle: ${note.title}\nContent: ${note.content}`;
                    break;
                case 'continue':
                    prompt = `Please continue writing this note in the same style and tone:\n\nTitle: ${note.title}\nContent: ${note.content}`;
                    break;
                case 'translate':
                    prompt = `Please translate this note to Spanish (or if it's already in Spanish, translate to English):\n\nTitle: ${note.title}\nContent: ${note.content}`;
                    break;
                default:
                    throw new Error('Unknown action: ' + action);
            }
            
            const response = await sendAIPrompt(prompt);
            if (response) {
                showToast('KYNSEY suggestion generated', 'success');
            }
        } catch (error) {
            console.error('Error handling KYNSEY suggestion:', error);
            showToast('Error with KYNSEY suggestion: ' + error.message, 'error');
        }
    }

    // Function to check if user is asking about KYNSEY's name
    function isNameQuestion(prompt) {
        const namePhrases = [
            'what is your name',
            'what\'s your name',
            'tell me your name',
            'who are you',
            'what are you called',
            'introduce yourself',
            'what should i call you'
        ];
        
        const lowerPrompt = prompt.toLowerCase();
        return namePhrases.some(phrase => lowerPrompt.includes(phrase));
    }
    
    // Pre-determined response for name questions
    function getKynseyIntroduction() {
        return `Hello! My name is **KYNSEY**

I'm an advanced AI assistant created by **Green Chip Technology** to provide you with the best possible assistance. Whether you need help with writing, analysis, creative tasks, or technical support, I'm here to help you achieve your goals efficiently and effectively.

Think of me as your intelligent companion, ready to assist with everything from enhancing your notes to solving complex problems. How can I help you today?`;
    }
    
    // Function to display AI response with integration buttons
    function displayAIResponse(response) {
        if (!aiResponse) return;
        
        // Create response container with buttons
        const responseContainer = document.createElement('div');
        responseContainer.className = 'ai-response-container';
        
        // Add the response content
        const responseContent = document.createElement('div');
        responseContent.className = 'ai-response-content';
        responseContent.innerHTML = marked.parse ? marked.parse(response) : response;
        responseContainer.appendChild(responseContent);
        
        // Add integration buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'ai-response-buttons';
        
        // Replace content button
        const replaceButton = document.createElement('button');
        replaceButton.className = 'ai-integration-btn replace';
        replaceButton.innerHTML = '<i class="fas fa-sync-alt"></i> Replace Content';
        replaceButton.onclick = () => integrateAIResponse(response, 'replace');
        
        // Append to content button
        const appendButton = document.createElement('button');
        appendButton.className = 'ai-integration-btn append';
        appendButton.innerHTML = '<i class="fas fa-plus-circle"></i> Append to Content';
        appendButton.onclick = () => integrateAIResponse(response, 'append');
        
        // Insert at cursor button
        const insertButton = document.createElement('button');
        insertButton.className = 'ai-integration-btn insert';
        insertButton.innerHTML = '<i class="fas fa-text-height"></i> Insert at Cursor';
        insertButton.onclick = () => integrateAIResponse(response, 'insert');
        
        buttonContainer.appendChild(replaceButton);
        buttonContainer.appendChild(appendButton);
        buttonContainer.appendChild(insertButton);
        responseContainer.appendChild(buttonContainer);
        
        // Clear and add new content
        aiResponse.innerHTML = '';
        aiResponse.appendChild(responseContainer);
        aiResponse.classList.remove('hidden');
        
        // Store the response for later use
        window.lastAIResponse = response;
    }
    
    async function handleCustomPrompt() {
        try {
            const prompt = aiPromptInput.value.trim();
            if (!prompt) return;
            
            // Check if user is asking about KYNSEY's name
            if (isNameQuestion(prompt)) {
                // Show thinking animation briefly for realism
                console.log('Showing thinking indicator for name question...');
                if (aiThinking) {
                    aiThinking.classList.remove('hidden');
                    aiThinking.style.display = 'flex';
                    aiThinking.style.flexDirection = 'column';
                    aiThinking.style.alignItems = 'center';
                }
                
                // Brief delay to show thinking animation
                await new Promise(resolve => setTimeout(resolve, 800));
                
                // Display pre-determined response
                const response = getKynseyIntroduction();
                displayAIResponse(response);
                aiPromptInput.value = '';
                showToast('KYNSEY introduction provided', 'success');
                
                // Hide thinking indicator
                if (aiThinking) {
                    aiThinking.style.display = 'none';
                    aiThinking.classList.add('hidden');
                }
                
                return;
            }
            
            const response = await sendAIPrompt(prompt);
            aiPromptInput.value = '';
            
            if (response) {
                showToast('KYNSEY response received', 'success');
            }
        } catch (error) {
            console.error('Error handling custom prompt:', error);
            showToast('Error with custom prompt', 'error');
        }
    }

    async function enhanceNote() {
        try {
            const note = notes.find(n => n.id === currentNoteId);
            if (!note) throw new Error('Note not found');
            
            // First, make sure AI tools panel is open
            if (!aiToolsPanel.classList.contains('active')) {
                toggleAITools();
            }
            
            const prompt = `Please enhance this note by improving its clarity, organization, and completeness:
                       
Title: ${note.title}
Content: ${note.content}

Please provide the enhanced version while maintaining any important information and adding relevant details where appropriate.`;
            
            const response = await sendAIPrompt(prompt);
            if (response) {
                showToast('Note enhancement generated - choose how to integrate it', 'success');
            }
        } catch (error) {
            console.error('Error enhancing note:', error);
            showToast(`Error enhancing note: ${error.message}`, 'error');
        }
    }

    // Editor mode state
    let isRichTextMode = true; // Default to Rich Text mode
    let undoStack = [];
    let redoStack = [];
    
    // Save state for undo/redo
    function saveUndoState() {
        if (noteContentInput) {
            undoStack.push({
                content: noteContentInput.value,
                start: noteContentInput.selectionStart,
                end: noteContentInput.selectionEnd
            });
            // Limit undo stack size
            if (undoStack.length > 50) {
                undoStack.shift();
            }
            // Clear redo stack on new action
            redoStack = [];
        }
    }
    
    // Enhanced Markdown Tools
    function handleMarkdownToolClick(event) {
        try {
            const button = event.target.closest('.md-tool-btn');
            if (!button) return;
            
            const action = button.dataset.action;
            if (!action) {
                console.warn('No action specified for markdown tool');
                return;
            }
            
            // Save state before modification
            saveUndoState();
            
            const start = noteContentInput.selectionStart;
            const end = noteContentInput.selectionEnd;
            const text = noteContentInput.value;
            const selectedText = text.slice(start, end);
            
            let result;
            let newCursorPos = end;
            
            switch (action) {
                case 'bold':
                    result = `${text.slice(0, start)}**${selectedText}**${text.slice(end)}`;
                    newCursorPos = end + 4;
                    break;
                    
                case 'italic':
                    result = `${text.slice(0, start)}_${selectedText}_${text.slice(end)}`;
                    newCursorPos = end + 2;
                    break;
                    
                case 'underline':
                    result = `${text.slice(0, start)}<u>${selectedText}</u>${text.slice(end)}`;
                    newCursorPos = end + 7;
                    break;
                    
                case 'strikethrough':
                    result = `${text.slice(0, start)}~~${selectedText}~~${text.slice(end)}`;
                    newCursorPos = end + 4;
                    break;
                    
                case 'code':
                    if (selectedText.includes('\n')) {
                        result = `${text.slice(0, start)}\n\`\`\`\n${selectedText}\n\`\`\`\n${text.slice(end)}`;
                        newCursorPos = end + 8;
                    } else {
                        result = `${text.slice(0, start)}\`${selectedText}\`${text.slice(end)}`;
                        newCursorPos = end + 2;
                    }
                    break;
                    
                case 'quote':
                    const lines = selectedText.split('\n');
                    const quotedLines = lines.map(line => `> ${line}`).join('\n');
                    result = `${text.slice(0, start)}${quotedLines}${text.slice(end)}`;
                    newCursorPos = start + quotedLines.length;
                    break;
                    
                case 'link':
                    const linkText = selectedText || 'link text';
                    result = `${text.slice(0, start)}[${linkText}](url)${text.slice(end)}`;
                    newCursorPos = start + linkText.length + 3;
                    break;
                    
                case 'image':
                    const altText = selectedText || 'alt text';
                    result = `${text.slice(0, start)}![${altText}](url)${text.slice(end)}`;
                    newCursorPos = start + altText.length + 4;
                    break;
                    
                case 'list':
                    const listLines = selectedText.split('\n').filter(line => line.trim());
                    const bulletList = listLines.map(line => `- ${line}`).join('\n');
                    result = `${text.slice(0, start)}${bulletList}${text.slice(end)}`;
                    newCursorPos = start + bulletList.length;
                    break;
                    
                case 'numbered-list':
                    const numLines = selectedText.split('\n').filter(line => line.trim());
                    const numberedList = numLines.map((line, i) => `${i + 1}. ${line}`).join('\n');
                    result = `${text.slice(0, start)}${numberedList}${text.slice(end)}`;
                    newCursorPos = start + numberedList.length;
                    break;
                    
                case 'table':
                    const tableTemplate = '\n| Header 1 | Header 2 | Header 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |\n';
                    result = `${text.slice(0, start)}${tableTemplate}${text.slice(end)}`;
                    newCursorPos = start + tableTemplate.length;
                    break;
                    
                case 'align-left':
                case 'align-center':
                case 'align-right':
                case 'align-justify':
                    const alignment = action.replace('align-', '');
                    result = `${text.slice(0, start)}<div style="text-align: ${alignment}">${selectedText}</div>${text.slice(end)}`;
                    newCursorPos = end + 30 + alignment.length;
                    break;
                    
                case 'indent':
                    const indentedLines = selectedText.split('\n').map(line => `  ${line}`).join('\n');
                    result = `${text.slice(0, start)}${indentedLines}${text.slice(end)}`;
                    newCursorPos = start + indentedLines.length;
                    break;
                    
                case 'outdent':
                    const outdentedLines = selectedText.split('\n').map(line => line.replace(/^  /, '')).join('\n');
                    result = `${text.slice(0, start)}${outdentedLines}${text.slice(end)}`;
                    newCursorPos = start + outdentedLines.length;
                    break;
                    
                case 'undo':
                    handleUndo();
                    return;
                    
                case 'redo':
                    handleRedo();
                    return;
                    
                case 'clear-format':
                    // Remove common markdown formatting
                    let cleanText = selectedText
                        .replace(/\*\*(.*?)\*\*/g, '$1')  // Bold
                        .replace(/_(.*?)_/g, '$1')         // Italic
                        .replace(/~~(.*?)~~/g, '$1')       // Strikethrough
                        .replace(/`(.*?)`/g, '$1')         // Inline code
                        .replace(/^#+\s/gm, '')            // Headers
                        .replace(/^>\s/gm, '')             // Quotes
                        .replace(/^-\s/gm, '')             // Lists
                        .replace(/^\d+\.\s/gm, '');        // Numbered lists
                    result = `${text.slice(0, start)}${cleanText}${text.slice(end)}`;
                    newCursorPos = start + cleanText.length;
                    break;
                    
                default:
                    console.warn('Unknown markdown action:', action);
                    return;
            }
            
            noteContentInput.value = result;
            noteContentInput.setSelectionRange(newCursorPos, newCursorPos);
            updatePreview();
            
        } catch (e) {
            console.error('Error applying markdown:', e);
            showToast('Error applying formatting', 'error');
        }
    }
    
    // Undo/Redo functionality
    function handleUndo() {
        if (undoStack.length > 0) {
            const currentState = {
                content: noteContentInput.value,
                start: noteContentInput.selectionStart,
                end: noteContentInput.selectionEnd
            };
            redoStack.push(currentState);
            
            const previousState = undoStack.pop();
            noteContentInput.value = previousState.content;
            noteContentInput.setSelectionRange(previousState.start, previousState.end);
            updatePreview();
        }
    }
    
    function handleRedo() {
        if (redoStack.length > 0) {
            const currentState = {
                content: noteContentInput.value,
                start: noteContentInput.selectionStart,
                end: noteContentInput.selectionEnd
            };
            undoStack.push(currentState);
            
            const nextState = redoStack.pop();
            noteContentInput.value = nextState.content;
            noteContentInput.setSelectionRange(nextState.start, nextState.end);
            updatePreview();
        }
    }

    function updatePreview() {
        try {
            if (!noteContentInput || !noteContentDisplay) return;
            
            // Prevent unnecessary updates during transitions
            if (ViewManager.transitionInProgress) {
                requestAnimationFrame(updatePreview);
                return;
            }
            
            const content = noteContentInput.value;
            
            // Use marked.js with proper options to prevent flickering
            if (window.marked) {
                marked.setOptions({
                    gfm: true,
                    breaks: true,
                    smartLists: true,
                    smartypants: true
                });
                
                // Use async rendering for better performance
                requestAnimationFrame(() => {
                    noteContentDisplay.innerHTML = marked.parse(content);
                    
                    // Apply syntax highlighting if available
                    if (window.hljs) {
                        noteContentDisplay.querySelectorAll('pre code').forEach(block => {
                            hljs.highlightElement(block);
                        });
                    }
                });
            } else {
                // Fallback to simple markdown
                requestAnimationFrame(() => {
                    noteContentDisplay.innerHTML = simpleMarkdownToHtml(content);
                });
            }
        } catch (e) {
            console.error('Error updating preview:', e);
            showToast('Error updating preview', 'error');
        }
    }

    // Helper Functions
    function refreshNotesList() {
        try {
            if (!notesList) {
                console.warn('Notes list element not found, skipping refresh');
                return;
            }

            cleanupEventListeners(notesList);
            notesList.innerHTML = '';

            notes.forEach(note => {
                const item = document.createElement('div');
                item.className = 'note-item';
                item.innerHTML = `
                    <h3 class="note-title">${note.title}</h3>
                    <p class="note-preview">${note.content.substring(0, 100)}...</p>
                    <div class="note-meta">
                        <span class="note-date">${new Date(note.updatedAt).toLocaleDateString()}</span>
                        <span class="note-tags">${note.tags.join(', ')}</span>
                    </div>
                `;
                item.addEventListener('click', () => openNote(note.id));
                notesList.appendChild(item);
            });
        } catch (e) {
            console.error('Error refreshing notes list:', e);
            showToast('Error refreshing notes', 'error');
        }
    }

    // Encapsulated function for rendering note tags
    function renderNoteTags(note) {
        if (!noteTagsList) return;
        noteTagsList.innerHTML = '';
        note.tags.forEach(tag => {
            const tagEl = document.createElement('span');
            tagEl.className = 'tag';
            tagEl.textContent = tag;
            tagEl.onclick = () => removeTag(tag);
            noteTagsList.appendChild(tagEl);
        });
    }

    function updateTagsList() {
        console.time('updateTagsList');
        const tagStart = performance.now();
        try {
            if (!tagsFilterList) {
                console.warn('Tags filter list element not found, skipping update');
                return;
            }
            
            const allTags = new Set();
            notes.forEach(note => note.tags.forEach(tag => allTags.add(tag)));
            
            tagsFilterList.innerHTML = '';
            Array.from(allTags).sort().forEach(tag => {
                const tagEl = document.createElement('span');
                tagEl.className = 'filter-tag';
                tagEl.textContent = tag;
                tagEl.addEventListener('click', () => filterByTag(tag));
                tagsFilterList.appendChild(tagEl);
            });
            
            console.timeEnd('updateTagsList');
            console.log(`Tag update execution time: ${performance.now() - tagStart}ms`);
        } catch (e) {
            console.error('Error updating tags list:', e);
            showToast('Error updating tags', 'error');
        }
    }

    function filterByTag(tag) {
        try {
            const items = notesList.getElementsByClassName('note-item');
            Array.from(items).forEach(item => {
                const tags = item.querySelector('.note-tags').textContent;
                item.style.display = tags.includes(tag) ? '' : 'none';
            });
        } catch (e) {
            console.error('Error filtering by tag:', e);
            showToast('Error filtering notes', 'error');
        }
    }

    // AI Manager for LM Studio API operations
    const AIManager = {
        getAPIUrl() {
            const baseUrl = window.config ? window.config.get('API_URL') : 'http://192.168.1.7:4545';
            return `${baseUrl}/v1/chat/completions`;
        },
        
        async generateCompletion(prompt) {
            const apiUrl = this.getAPIUrl();
            console.log('Sending request to LM Studio API:', {
                url: apiUrl,
                prompt: prompt
            });

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

            try {
                const response = await fetch(apiUrl, {
                    signal: controller.signal,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        messages: [
                            { role: "system", content: "You are KYNSEY, a helpful assistant that helps users enhance their notes." },
                            { role: "user", content: prompt }
                        ],
                        model: "30b-a3b", // Use an available model from the list
                        temperature: 0.7,
                        max_tokens: 500
                    })
                });
                
                console.log('Response status:', response.status);
                const responseText = await response.text();
                console.log('Raw response:', responseText);

                if (!response.ok) {
                    throw new Error(`AI API request failed: ${response.status} - ${responseText}`);
                }

                let data;
                try {
                    data = JSON.parse(responseText);
                } catch (e) {
                    throw new Error(`Invalid JSON response: ${e.message}`);
                }

                console.log('Parsed response:', data);

                if (!data.choices?.[0]?.message?.content) {
                    throw new Error('Unexpected response format');
                }

                return data.choices[0].message.content;
            } catch (error) {
                console.error('AI API error:', error);
                throw error;
            }
        }
    };

    function integrateAIResponse(response, mode) {
        try {
            if (!noteContentInput || !response) {
                throw new Error('No content to integrate');
            }
            
            const currentContent = noteContentInput.value;
            let newContent = '';
            
            switch (mode) {
                case 'replace':
                    newContent = response;
                    break;
                    
                case 'append':
                    newContent = currentContent ? `${currentContent}\n\n${response}` : response;
                    break;
                    
                case 'insert':
                    const cursorPos = noteContentInput.selectionStart;
                    const beforeCursor = currentContent.slice(0, cursorPos);
                    const afterCursor = currentContent.slice(cursorPos);
                    newContent = `${beforeCursor}${response}${afterCursor}`;
                    break;
                    
                default:
                    throw new Error('Invalid integration mode');
            }
            
            // Update the note content
            noteContentInput.value = newContent;
            
            // Always update the preview
            updatePreview();
            
            // If in WYSIWYG mode, we need to update the contenteditable div directly
            if (isRichTextMode && noteContentDisplay && noteContentDisplay.contentEditable === 'true') {
                // Convert markdown to HTML and update the contenteditable area
                if (window.marked) {
                    noteContentDisplay.innerHTML = marked.parse(newContent);
                    // Trigger the input event on the contenteditable to sync back to textarea
                    noteContentDisplay.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
            
            // Trigger input event to ensure all listeners are notified
            if (noteContentInput) {
                noteContentInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            
            // Mark as modified
            if (currentNoteId) {
                const note = notes.find(n => n.id === currentNoteId);
                if (note) {
                    note.isModified = true;
                }
            }
            
            // Show success message
            const modeText = mode === 'replace' ? 'replaced' : mode === 'append' ? 'appended' : 'inserted';
            showToast(`KYNSEY response ${modeText} successfully`, 'success');
            
            // Auto-save after integration
            if (currentNoteId) {
                saveNote(true); // true for auto-save
            }
            
        } catch (error) {
            console.error('Error integrating KYNSEY response:', error);
            showToast('Error integrating KYNSEY response: ' + error.message, 'error');
        }
    }
    
    async function sendAIPrompt(prompt) {
        try {
            // Show thinking indicator
            if (aiThinking) {
                aiThinking.classList.remove('hidden');
                aiThinking.style.display = 'flex';
                aiThinking.style.flexDirection = 'column';
                aiThinking.style.alignItems = 'center';
            }
            
            // Hide previous response
            if (aiResponse) {
                aiResponse.classList.add('hidden');
            }
            
            const response = await AIManager.generateCompletion(prompt);
            
            // Display response with integration options
            if (aiResponse && response) {
                // Create response container with buttons
                const responseContainer = document.createElement('div');
                responseContainer.className = 'ai-response-container';
                
                // Add the response content
                const responseContent = document.createElement('div');
                responseContent.className = 'ai-response-content';
                responseContent.innerHTML = marked.parse ? marked.parse(response) : response;
                responseContainer.appendChild(responseContent);
                
                // Add integration buttons
                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'ai-response-buttons';
                
                // Replace content button
                const replaceButton = document.createElement('button');
                replaceButton.className = 'ai-integration-btn replace';
                replaceButton.innerHTML = '<i class="fas fa-sync-alt"></i> Replace Content';
                replaceButton.onclick = () => integrateAIResponse(response, 'replace');
                
                // Append to content button
                const appendButton = document.createElement('button');
                appendButton.className = 'ai-integration-btn append';
                appendButton.innerHTML = '<i class="fas fa-plus-circle"></i> Append to Content';
                appendButton.onclick = () => integrateAIResponse(response, 'append');
                
                // Insert at cursor button
                const insertButton = document.createElement('button');
                insertButton.className = 'ai-integration-btn insert';
                insertButton.innerHTML = '<i class="fas fa-text-height"></i> Insert at Cursor';
                insertButton.onclick = () => integrateAIResponse(response, 'insert');
                
                buttonContainer.appendChild(replaceButton);
                buttonContainer.appendChild(appendButton);
                buttonContainer.appendChild(insertButton);
                responseContainer.appendChild(buttonContainer);
                
                // Clear and add new content
                aiResponse.innerHTML = '';
                aiResponse.appendChild(responseContainer);
                aiResponse.classList.remove('hidden');
                
                // Store the response for later use
                window.lastAIResponse = response;
            }
            
            return response;
        } catch (error) {
            console.error('Error getting AI response:', error);
            showToast('Error communicating with KYNSEY: ' + error.message, 'error');
            throw error;
        } finally {
            // Hide thinking indicator
            if (aiThinking) {
                aiThinking.style.display = 'none';
                aiThinking.classList.add('hidden');
            }
        }
    }

    function checkAIConnection() {
        const baseUrl = window.config ? window.config.get('API_URL') : 'http://192.168.1.7:4545';
        console.log('Checking AI connection at:', baseUrl);
        fetch(`${baseUrl}/v1/models`)
            .then(async response => {
                console.log('Connection check response:', response.status);
                if (!response.ok) {
                    const text = await response.text();
                    console.error('Connection check failed:', text);
                    throw new Error(`AI service not available: ${response.status} - ${text}`);
                }
                aiToolsToggle.classList.remove('disabled');
                showToast('AI service connected', 'success');
            })
            .catch(error => {
                console.error('AI service connection failed:', error);
                aiToolsToggle.classList.add('disabled');
                showToast('AI service not available - Check if LM Studio is running', 'error');
            });
    }

    // Public API
    return {
        init: init,
        toggleNotesPanel: toggleNotesPanel,
        createNewNote: createNewNote,
        openNote: openNote,
        closeNoteEditor: closeNoteEditor,
        saveNote: saveNote,
        deleteNote: deleteNote,
        enhanceNote: enhanceNote,
        PanelManager: PanelManager  // Expose PanelManager for external use
    };
})();

// Initialize Notes module when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('DOMContentLoaded - Initializing Notes module');
        if (typeof Notes === 'undefined' || !Notes.init) {
            throw new Error('Notes module is not properly initialized');
        }
        await Notes.init();
        console.log('Notes module initialization complete');
        
        // Dispatch custom event to signal that Notes is ready
        window.dispatchEvent(new CustomEvent('notesModuleReady'));
    } catch (e) {
        console.error('Failed to initialize Notes module:', e);
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;background:red;color:white;padding:10px;text-align:center;z-index:9999';
        errorDiv.textContent = `Critical Error: ${e.message}`;
        document.body.appendChild(errorDiv);
    }
});
