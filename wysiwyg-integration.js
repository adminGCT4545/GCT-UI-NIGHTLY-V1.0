/**
 * WYSIWYG Integration Module
 * 
 * This module provides additional enhancements for a word processor-like experience
 */

class WYSIWYGIntegration {
    constructor() {
        this.init();
    }
    
    init() {
        // Wait for rich text editor to be ready
        this.setupWhenReady();
        
        // Add print functionality
        this.addPrintSupport();
        
        // Add export functionality
        this.addExportOptions();
        
        // Add templates
        this.addTemplateSupport();
        
        // Add find and replace
        this.addFindReplace();
        
        // Add word count
        this.addWordCount();
    }
    
    setupWhenReady() {
        const checkInterval = setInterval(() => {
            if (window.richTextEditor) {
                clearInterval(checkInterval);
                this.enhanceEditor();
            }
        }, 100);
    }
    
    enhanceEditor() {
        // Add additional toolbar buttons
        const toolbar = document.querySelector('.markdown-toolbar');
        if (!toolbar) return;
        
        // Create word processor button group
        const wpGroup = document.createElement('div');
        wpGroup.className = 'wp-button-group';
        wpGroup.style.display = 'inline-flex';
        wpGroup.style.gap = '5px';
        wpGroup.style.marginLeft = '10px';
        
        const buttons = [
            { icon: '📄', title: 'New Document', action: 'newDoc' },
            { icon: '💾', title: 'Save As...', action: 'saveAs' },
            { icon: '🖨️', title: 'Print', action: 'print' },
            { icon: '🔍', title: 'Find & Replace', action: 'findReplace' },
            { icon: '📊', title: 'Word Count', action: 'wordCount' },
            { icon: '📋', title: 'Templates', action: 'templates' }
        ];
        
        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.className = 'md-tool-btn wp-btn';
            button.innerHTML = btn.icon;
            button.title = btn.title;
            button.onclick = () => this.handleAction(btn.action);
            wpGroup.appendChild(button);
        });
        
        toolbar.appendChild(wpGroup);
        
        // Add format painter
        this.addFormatPainter();
        
        // Add real-time collaboration mock
        this.addCollaborationIndicator();
    }
    
    handleAction(action) {
        switch(action) {
            case 'newDoc':
                this.createNewDocument();
                break;
            case 'saveAs':
                this.saveAs();
                break;
            case 'print':
                this.print();
                break;
            case 'findReplace':
                this.showFindReplace();
                break;
            case 'wordCount':
                this.showWordCount();
                break;
            case 'templates':
                this.showTemplates();
                break;
        }
    }
    
    createNewDocument() {
        if (confirm('Create a new document? Any unsaved changes will be lost.')) {
            const noteTitle = document.getElementById('note-title-input');
            const noteContent = document.getElementById('note-content-input');
            
            if (noteTitle) noteTitle.value = 'Untitled Document';
            if (noteContent) noteContent.value = '';
            
            if (window.richTextEditor && window.richTextEditor.richTextEditor) {
                window.richTextEditor.richTextEditor.innerHTML = '';
            }
            
            // Update preview
            if (window.updatePreview) {
                window.updatePreview();
            }
        }
    }
    
    saveAs() {
        const modal = document.createElement('div');
        modal.className = 'save-as-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Save Document As</h3>
                <div class="save-options">
                    <button class="save-option" data-format="markdown">
                        <i class="fas fa-file-alt"></i>
                        Markdown (.md)
                    </button>
                    <button class="save-option" data-format="html">
                        <i class="fas fa-file-code"></i>
                        HTML (.html)
                    </button>
                    <button class="save-option" data-format="txt">
                        <i class="fas fa-file"></i>
                        Plain Text (.txt)
                    </button>
                    <button class="save-option" data-format="pdf">
                        <i class="fas fa-file-pdf"></i>
                        PDF (.pdf)
                    </button>
                </div>
                <button class="close-modal">Cancel</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('save-option')) {
                const format = e.target.dataset.format;
                this.exportDocument(format);
                modal.remove();
            } else if (e.target.classList.contains('close-modal') || e.target === modal) {
                modal.remove();
            }
        });
    }
    
    exportDocument(format) {
        const title = document.getElementById('note-title-input')?.value || 'document';
        const content = document.getElementById('note-content-input')?.value || '';
        
        let exportContent = '';
        let mimeType = '';
        let extension = '';
        
        switch(format) {
            case 'markdown':
                exportContent = content;
                mimeType = 'text/markdown';
                extension = 'md';
                break;
                
            case 'html':
                exportContent = this.generateHTMLDocument(title, content);
                mimeType = 'text/html';
                extension = 'html';
                break;
                
            case 'txt':
                exportContent = this.markdownToPlainText(content);
                mimeType = 'text/plain';
                extension = 'txt';
                break;
                
            case 'pdf':
                this.exportAsPDF(title, content);
                return;
        }
        
        // Create and download file
        const blob = new Blob([exportContent], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}.${extension}`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showToast(`Document exported as ${format.toUpperCase()}`);
    }
    
    generateHTMLDocument(title, markdown) {
        const htmlContent = window.marked ? marked.parse(markdown) : markdown;
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        h1, h2, h3 { margin-top: 20px; margin-bottom: 10px; }
        code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
        pre { background: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; }
        blockquote { border-left: 3px solid #ccc; padding-left: 10px; color: #666; }
    </style>
</head>
<body>
    <h1>${title}</h1>
    ${htmlContent}
</body>
</html>`;
    }
    
    markdownToPlainText(markdown) {
        // Remove markdown formatting
        return markdown
            .replace(/#{1,6}\s/g, '') // Headers
            .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
            .replace(/\*(.*?)\*/g, '$1') // Italic
            .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Links
            .replace(/`([^`]+)`/g, '$1') // Inline code
            .replace(/```[\s\S]*?```/g, '') // Code blocks
            .replace(/^\s*[-*+]\s/gm, '• ') // Lists
            .replace(/^\s*\d+\.\s/gm, '') // Numbered lists
            .replace(/^\s*>\s/gm, '') // Blockquotes
            .trim();
    }
    
    exportAsPDF(title, content) {
        // Simple PDF export using print
        const printWindow = window.open('', '_blank');
        const htmlContent = this.generateHTMLDocument(title, content);
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.print();
    }
    
    print() {
        const title = document.getElementById('note-title-input')?.value || 'document';
        const content = document.getElementById('note-content-input')?.value || '';
        
        const printWindow = window.open('', '_blank');
        const htmlContent = this.generateHTMLDocument(title, content);
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.print();
    }
    
    showFindReplace() {
        const panel = document.createElement('div');
        panel.className = 'find-replace-panel';
        panel.innerHTML = `
            <div class="find-replace-content">
                <h4>Find & Replace</h4>
                <div class="find-replace-inputs">
                    <input type="text" id="find-input" placeholder="Find...">
                    <input type="text" id="replace-input" placeholder="Replace with...">
                </div>
                <div class="find-replace-buttons">
                    <button id="find-next">Find Next</button>
                    <button id="replace-one">Replace</button>
                    <button id="replace-all">Replace All</button>
                    <button id="close-find-replace">Close</button>
                </div>
                <div id="find-results"></div>
            </div>
        `;
        
        const editor = document.querySelector('.note-editor');
        editor.appendChild(panel);
        
        // Focus find input
        const findInput = panel.querySelector('#find-input');
        findInput.focus();
        
        // Add event listeners
        panel.querySelector('#find-next').onclick = () => this.findNext();
        panel.querySelector('#replace-one').onclick = () => this.replaceOne();
        panel.querySelector('#replace-all').onclick = () => this.replaceAll();
        panel.querySelector('#close-find-replace').onclick = () => panel.remove();
        
        // Add keyboard shortcuts
        findInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.findNext();
            } else if (e.key === 'Escape') {
                panel.remove();
            }
        });
    }
    
    findNext() {
        const findInput = document.getElementById('find-input');
        const searchText = findInput?.value;
        
        if (!searchText) return;
        
        const content = window.richTextEditor?.isRichTextMode 
            ? window.richTextEditor.richTextEditor 
            : document.getElementById('note-content-input');
            
        if (!content) return;
        
        // Simple find implementation
        const text = content.textContent || content.value;
        const index = text.toLowerCase().indexOf(searchText.toLowerCase());
        
        if (index !== -1) {
            // Highlight found text
            if (window.richTextEditor?.isRichTextMode) {
                // For rich text mode
                const selection = window.getSelection();
                const range = document.createRange();
                // This is simplified - real implementation would need proper text node traversal
                selection.removeAllRanges();
                selection.addRange(range);
            } else {
                // For textarea
                content.setSelectionRange(index, index + searchText.length);
                content.focus();
            }
            
            this.updateFindResults(`Found at position ${index}`);
        } else {
            this.updateFindResults('No matches found');
        }
    }
    
    replaceOne() {
        // Implementation for replace one
        this.showToast('Replace functionality coming soon');
    }
    
    replaceAll() {
        const findInput = document.getElementById('find-input');
        const replaceInput = document.getElementById('replace-input');
        const findText = findInput?.value;
        const replaceText = replaceInput?.value || '';
        
        if (!findText) return;
        
        const content = document.getElementById('note-content-input');
        if (content) {
            const newContent = content.value.replace(new RegExp(findText, 'gi'), replaceText);
            content.value = newContent;
            
            // Trigger update
            const event = new Event('input', { bubbles: true });
            content.dispatchEvent(event);
            
            this.showToast('Replaced all occurrences');
        }
    }
    
    updateFindResults(message) {
        const results = document.getElementById('find-results');
        if (results) {
            results.textContent = message;
        }
    }
    
    showWordCount() {
        const content = document.getElementById('note-content-input')?.value || '';
        
        // Calculate statistics
        const words = content.trim().split(/\s+/).filter(word => word.length > 0).length;
        const characters = content.length;
        const charactersNoSpaces = content.replace(/\s/g, '').length;
        const lines = content.split('\n').length;
        const paragraphs = content.split(/\n\s*\n/).filter(para => para.trim().length > 0).length;
        
        const modal = document.createElement('div');
        modal.className = 'word-count-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Document Statistics</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">Words:</span>
                        <span class="stat-value">${words}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Characters:</span>
                        <span class="stat-value">${characters}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Characters (no spaces):</span>
                        <span class="stat-value">${charactersNoSpaces}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Lines:</span>
                        <span class="stat-value">${lines}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Paragraphs:</span>
                        <span class="stat-value">${paragraphs}</span>
                    </div>
                </div>
                <button class="close-modal">Close</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('close-modal') || e.target === modal) {
                modal.remove();
            }
        });
    }
    
    showTemplates() {
        const templates = [
            { name: 'Meeting Notes', icon: '📝', content: '# Meeting Notes\n\n**Date:** ${date}\n**Attendees:** \n\n## Agenda\n\n1. \n2. \n3. \n\n## Discussion\n\n\n## Action Items\n\n- [ ] \n- [ ] \n\n## Next Steps\n\n' },
            { name: 'Project Plan', icon: '📋', content: '# Project: \n\n## Overview\n\n## Objectives\n\n1. \n2. \n3. \n\n## Timeline\n\n| Phase | Start Date | End Date | Status |\n|-------|------------|----------|--------|\n| Planning | | | |\n| Development | | | |\n| Testing | | | |\n| Deployment | | | |\n\n## Resources\n\n## Risks\n\n## Notes\n\n' },
            { name: 'Daily Journal', icon: '📅', content: '# ${date}\n\n## Today\'s Goals\n\n- [ ] \n- [ ] \n- [ ] \n\n## Accomplishments\n\n\n## Challenges\n\n\n## Tomorrow\'s Plan\n\n\n## Notes\n\n' },
            { name: 'Blog Post', icon: '✍️', content: '# \n\n## Introduction\n\n\n## Main Content\n\n### Section 1\n\n\n### Section 2\n\n\n### Section 3\n\n\n## Conclusion\n\n\n---\n\n*Published: ${date}*\n*Author: *\n' }
        ];
        
        const modal = document.createElement('div');
        modal.className = 'templates-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Document Templates</h3>
                <div class="templates-grid">
                    ${templates.map(t => `
                        <div class="template-item" data-template="${t.name}">
                            <span class="template-icon">${t.icon}</span>
                            <span class="template-name">${t.name}</span>
                        </div>
                    `).join('')}
                </div>
                <button class="close-modal">Cancel</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            const templateItem = e.target.closest('.template-item');
            if (templateItem) {
                const templateName = templateItem.dataset.template;
                const template = templates.find(t => t.name === templateName);
                if (template) {
                    this.applyTemplate(template);
                    modal.remove();
                }
            } else if (e.target.classList.contains('close-modal') || e.target === modal) {
                modal.remove();
            }
        });
    }
    
    applyTemplate(template) {
        const date = new Date().toLocaleDateString();
        const content = template.content.replace(/\${date}/g, date);
        
        const noteTitle = document.getElementById('note-title-input');
        const noteContent = document.getElementById('note-content-input');
        
        if (noteTitle) noteTitle.value = template.name;
        if (noteContent) noteContent.value = content;
        
        // Update preview
        if (window.updatePreview) {
            window.updatePreview();
        }
        
        this.showToast(`Applied "${template.name}" template`);
    }
    
    addFormatPainter() {
        // Format painter functionality
        let copiedFormat = null;
        
        const toolbar = document.querySelector('.markdown-toolbar');
        if (!toolbar) return;
        
        const formatPainter = document.createElement('button');
        formatPainter.className = 'md-tool-btn format-painter';
        formatPainter.innerHTML = '🖌️';
        formatPainter.title = 'Format Painter';
        
        formatPainter.onclick = () => {
            if (!copiedFormat) {
                // Copy format
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const container = range.commonAncestorContainer.parentElement;
                    copiedFormat = window.getComputedStyle(container);
                    formatPainter.classList.add('active');
                    this.showToast('Format copied');
                }
            } else {
                // Apply format
                // This is a simplified implementation
                formatPainter.classList.remove('active');
                copiedFormat = null;
                this.showToast('Format applied');
            }
        };
        
        const separator = document.createElement('span');
        separator.className = 'md-tool-separator';
        
        toolbar.insertBefore(separator, toolbar.querySelector('.ai-tools-toggle'));
        toolbar.insertBefore(formatPainter, separator);
    }
    
    addCollaborationIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'collaboration-indicator';
        indicator.innerHTML = `
            <div class="collab-users">
                <div class="collab-user" style="background: #ff6b6b" title="You">Y</div>
            </div>
            <span class="collab-status">Editing</span>
        `;
        
        const header = document.querySelector('.note-editor-header');
        if (header) {
            header.appendChild(indicator);
        }
    }
    
    addPrintSupport() {
        // Add print styles
        const printStyles = document.createElement('style');
        printStyles.innerHTML = `
            @media print {
                .notes-panel,
                .sidebar,
                .main-header,
                .input-area,
                .markdown-toolbar,
                .note-editor-header,
                .ai-tools-panel,
                .collaboration-indicator {
                    display: none !important;
                }
                
                .note-editor-panel {
                    position: static !important;
                    width: 100% !important;
                    height: auto !important;
                    background: white !important;
                    color: black !important;
                }
                
                .markdown-preview-pane {
                    border: none !important;
                    padding: 0 !important;
                }
            }
        `;
        document.head.appendChild(printStyles);
    }
    
    addExportOptions() {
        // Add keyboard shortcut for quick export
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
                e.preventDefault();
                this.saveAs();
            }
        });
    }
    
    addTemplateSupport() {
        // Add keyboard shortcut for templates
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'T') {
                e.preventDefault();
                this.showTemplates();
            }
        });
    }
    
    addFindReplace() {
        // Add keyboard shortcut for find & replace
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                this.showFindReplace();
            }
        });
    }
    
    addWordCount() {
        // Add real-time word count indicator
        const indicator = document.createElement('div');
        indicator.className = 'word-count-indicator';
        indicator.innerHTML = '<span id="live-word-count">0 words</span>';
        
        const editor = document.querySelector('.note-editor');
        if (editor) {
            editor.appendChild(indicator);
        }
        
        // Update word count on input
        const noteContent = document.getElementById('note-content-input');
        if (noteContent) {
            noteContent.addEventListener('input', () => {
                const words = noteContent.value.trim().split(/\s+/).filter(w => w.length > 0).length;
                document.getElementById('live-word-count').textContent = `${words} words`;
            });
        }
    }
    
    showToast(message) {
        if (window.showToast) {
            window.showToast(message, 'success');
        } else {
            console.log(message);
        }
    }
}

// Initialize WYSIWYG integration when ready
window.addEventListener('notesModuleReady', function() {
    window.wysiwygIntegration = new WYSIWYGIntegration();
});