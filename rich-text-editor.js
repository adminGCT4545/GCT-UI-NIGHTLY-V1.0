/**
 * Rich Text Editor Module for GCT UI
 * 
 * This module enhances the markdown editor with rich text capabilities
 * while maintaining markdown support
 */

class RichTextEditor {
    constructor(editorId, previewId) {
        this.editor = document.getElementById(editorId);
        this.preview = document.getElementById(previewId);
        this.toolbar = null;
        this.isRichTextMode = false;
        this.formatButtons = new Map();
        this.lastSelection = null;
        
        // Initialize editor
        this.init();
    }
    
    init() {
        // Make the editor contenteditable for rich text mode
        this.markdownTextarea = this.editor;
        
        // Create a contenteditable div for rich text editing
        this.richTextEditor = document.createElement('div');
        this.richTextEditor.id = 'rich-text-editor';
        this.richTextEditor.className = 'rich-text-editor';
        this.richTextEditor.contentEditable = true;
        this.richTextEditor.style.display = 'none';
        
        // Insert rich text editor after textarea
        this.editor.parentNode.insertBefore(this.richTextEditor, this.editor.nextSibling);
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Enhance existing toolbar
        this.enhanceToolbar();
        
        // Initialize with markdown mode
        this.setMode('markdown');
    }
    
    enhanceToolbar() {
        const toolbar = document.querySelector('.markdown-toolbar');
        if (!toolbar) return;
        
        // Add mode toggle button
        const modeToggle = document.createElement('button');
        modeToggle.className = 'md-tool-btn mode-toggle';
        modeToggle.innerHTML = '<i class="fas fa-exchange-alt"></i>';
        modeToggle.title = 'Toggle Rich Text/Markdown Mode';
        modeToggle.onclick = () => this.toggleMode();
        
        // Add separator
        const separator = document.createElement('span');
        separator.className = 'md-tool-separator';
        
        // Insert at the beginning of toolbar
        toolbar.insertBefore(separator, toolbar.firstChild);
        toolbar.insertBefore(modeToggle, toolbar.firstChild);
        
        // Add rich text specific buttons
        this.addRichTextButtons(toolbar);
        
        // Store toolbar reference
        this.toolbar = toolbar;
    }
    
    addRichTextButtons(toolbar) {
        // Create rich text button group
        const richTextGroup = document.createElement('div');
        richTextGroup.className = 'rich-text-buttons';
        richTextGroup.style.display = 'none';
        
        const buttons = [
            { action: 'underline', icon: 'U', title: 'Underline', command: 'underline' },
            { action: 'strikethrough', icon: 'S̶', title: 'Strikethrough', command: 'strikeThrough' },
            { action: 'subscript', icon: 'X₂', title: 'Subscript', command: 'subscript' },
            { action: 'superscript', icon: 'X²', title: 'Superscript', command: 'superscript' },
            { separator: true },
            { action: 'fontSize', icon: 'A↕', title: 'Font Size', type: 'dropdown' },
            { action: 'fontColor', icon: '🎨', title: 'Font Color', type: 'color' },
            { action: 'highlight', icon: '🖍️', title: 'Highlight', type: 'color' },
            { separator: true },
            { action: 'alignLeft', icon: '⬅', title: 'Align Left', command: 'justifyLeft' },
            { action: 'alignCenter', icon: '⬌', title: 'Align Center', command: 'justifyCenter' },
            { action: 'alignRight', icon: '➡', title: 'Align Right', command: 'justifyRight' },
            { action: 'alignJustify', icon: '☰', title: 'Justify', command: 'justifyFull' },
            { separator: true },
            { action: 'indent', icon: '→|', title: 'Indent', command: 'indent' },
            { action: 'outdent', icon: '|←', title: 'Outdent', command: 'outdent' },
            { separator: true },
            { action: 'table', icon: '⊞', title: 'Insert Table', type: 'custom' },
            { action: 'hr', icon: '—', title: 'Horizontal Line', command: 'insertHorizontalRule' },
            { action: 'removeFormat', icon: '🚫', title: 'Clear Formatting', command: 'removeFormat' },
            { separator: true },
            { action: 'undo', icon: '↶', title: 'Undo', command: 'undo' },
            { action: 'redo', icon: '↷', title: 'Redo', command: 'redo' }
        ];
        
        buttons.forEach(btn => {
            if (btn.separator) {
                const sep = document.createElement('span');
                sep.className = 'md-tool-separator';
                richTextGroup.appendChild(sep);
                return;
            }
            
            const button = document.createElement('button');
            button.className = 'md-tool-btn rich-text-btn';
            button.innerHTML = btn.icon;
            button.title = btn.title;
            button.dataset.action = btn.action;
            
            if (btn.command) {
                button.onclick = () => this.execCommand(btn.command);
            } else if (btn.type === 'dropdown') {
                button.onclick = () => this.showFontSizeDropdown(button);
            } else if (btn.type === 'color') {
                button.onclick = () => this.showColorPicker(button, btn.action);
            } else if (btn.type === 'custom') {
                button.onclick = () => this.handleCustomAction(btn.action);
            }
            
            this.formatButtons.set(btn.action, button);
            richTextGroup.appendChild(button);
        });
        
        toolbar.appendChild(richTextGroup);
        this.richTextButtons = richTextGroup;
    }
    
    setupEventListeners() {
        // Rich text editor events
        this.richTextEditor.addEventListener('input', () => {
            this.syncToMarkdown();
            this.updatePreview();
        });
        
        this.richTextEditor.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
        });
        
        // Selection change for updating toolbar state
        document.addEventListener('selectionchange', () => {
            if (this.isRichTextMode) {
                this.updateToolbarState();
            }
        });
        
        // Keyboard shortcuts
        this.richTextEditor.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }
    
    handleKeyboardShortcuts(e) {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    this.execCommand('bold');
                    break;
                case 'i':
                    e.preventDefault();
                    this.execCommand('italic');
                    break;
                case 'u':
                    e.preventDefault();
                    this.execCommand('underline');
                    break;
                case 'z':
                    if (e.shiftKey) {
                        e.preventDefault();
                        this.execCommand('redo');
                    } else {
                        e.preventDefault();
                        this.execCommand('undo');
                    }
                    break;
            }
        }
    }
    
    toggleMode() {
        if (this.isRichTextMode) {
            this.setMode('markdown');
        } else {
            this.setMode('richtext');
        }
    }
    
    setMode(mode) {
        if (mode === 'richtext') {
            this.isRichTextMode = true;
            
            // Convert markdown to HTML for rich text editor
            const markdownContent = this.markdownTextarea.value;
            const htmlContent = this.markdownToHtml(markdownContent);
            this.richTextEditor.innerHTML = htmlContent;
            
            // Show/hide appropriate elements
            this.markdownTextarea.style.display = 'none';
            this.richTextEditor.style.display = 'block';
            
            // Update toolbar
            document.querySelectorAll('.md-tool-btn:not(.mode-toggle):not(.rich-text-btn)').forEach(btn => {
                btn.style.display = 'none';
            });
            this.richTextButtons.style.display = 'flex';
            
            // Focus rich text editor
            this.richTextEditor.focus();
        } else {
            this.isRichTextMode = false;
            
            // Convert HTML back to markdown
            this.syncToMarkdown();
            
            // Show/hide appropriate elements
            this.richTextEditor.style.display = 'none';
            this.markdownTextarea.style.display = 'block';
            
            // Update toolbar
            document.querySelectorAll('.md-tool-btn:not(.mode-toggle):not(.rich-text-btn)').forEach(btn => {
                btn.style.display = '';
            });
            this.richTextButtons.style.display = 'none';
            
            // Focus markdown textarea
            this.markdownTextarea.focus();
        }
        
        this.updatePreview();
    }
    
    execCommand(command, value = null) {
        this.richTextEditor.focus();
        
        // Store selection before executing command
        this.saveSelection();
        
        document.execCommand(command, false, value);
        
        // Update toolbar state
        this.updateToolbarState();
        
        // Sync to markdown
        this.syncToMarkdown();
        this.updatePreview();
    }
    
    saveSelection() {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            this.lastSelection = selection.getRangeAt(0);
        }
    }
    
    restoreSelection() {
        if (this.lastSelection) {
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(this.lastSelection);
        }
    }
    
    updateToolbarState() {
        // Update button states based on current selection
        this.formatButtons.forEach((button, action) => {
            const commandState = {
                'bold': document.queryCommandState('bold'),
                'italic': document.queryCommandState('italic'),
                'underline': document.queryCommandState('underline'),
                'strikethrough': document.queryCommandState('strikeThrough'),
                'subscript': document.queryCommandState('subscript'),
                'superscript': document.queryCommandState('superscript'),
                'alignLeft': document.queryCommandState('justifyLeft'),
                'alignCenter': document.queryCommandState('justifyCenter'),
                'alignRight': document.queryCommandState('justifyRight'),
                'alignJustify': document.queryCommandState('justifyFull')
            };
            
            if (commandState[action] !== undefined) {
                button.classList.toggle('active', commandState[action]);
            }
        });
    }
    
    showFontSizeDropdown(button) {
        const dropdown = document.createElement('div');
        dropdown.className = 'font-size-dropdown';
        dropdown.innerHTML = `
            <div class="dropdown-item" data-size="1">Small</div>
            <div class="dropdown-item" data-size="3">Normal</div>
            <div class="dropdown-item" data-size="5">Large</div>
            <div class="dropdown-item" data-size="7">Extra Large</div>
        `;
        
        dropdown.style.position = 'absolute';
        dropdown.style.top = button.offsetTop + button.offsetHeight + 'px';
        dropdown.style.left = button.offsetLeft + 'px';
        
        button.parentNode.appendChild(dropdown);
        
        dropdown.addEventListener('click', (e) => {
            if (e.target.classList.contains('dropdown-item')) {
                const size = e.target.dataset.size;
                this.execCommand('fontSize', size);
                dropdown.remove();
            }
        });
        
        // Close dropdown when clicking outside
        setTimeout(() => {
            document.addEventListener('click', function closeDropdown(e) {
                if (!dropdown.contains(e.target) && e.target !== button) {
                    dropdown.remove();
                    document.removeEventListener('click', closeDropdown);
                }
            });
        }, 0);
    }
    
    showColorPicker(button, action) {
        const picker = document.createElement('input');
        picker.type = 'color';
        picker.style.position = 'absolute';
        picker.style.opacity = '0';
        picker.style.pointerEvents = 'none';
        
        button.appendChild(picker);
        picker.click();
        
        picker.addEventListener('change', (e) => {
            const color = e.target.value;
            if (action === 'fontColor') {
                this.execCommand('foreColor', color);
            } else if (action === 'highlight') {
                this.execCommand('hiliteColor', color);
            }
            picker.remove();
        });
    }
    
    handleCustomAction(action) {
        switch(action) {
            case 'table':
                this.insertTable();
                break;
        }
    }
    
    insertTable() {
        const rows = prompt('Number of rows:', '3');
        const cols = prompt('Number of columns:', '3');
        
        if (rows && cols) {
            let tableHtml = '<table border="1" style="border-collapse: collapse; width: 100%;">';
            
            for (let i = 0; i < parseInt(rows); i++) {
                tableHtml += '<tr>';
                for (let j = 0; j < parseInt(cols); j++) {
                    if (i === 0) {
                        tableHtml += '<th style="border: 1px solid #ddd; padding: 8px;">Header</th>';
                    } else {
                        tableHtml += '<td style="border: 1px solid #ddd; padding: 8px;">Cell</td>';
                    }
                }
                tableHtml += '</tr>';
            }
            
            tableHtml += '</table><p></p>';
            
            this.restoreSelection();
            document.execCommand('insertHTML', false, tableHtml);
            this.syncToMarkdown();
            this.updatePreview();
        }
    }
    
    syncToMarkdown() {
        if (!this.isRichTextMode) return;
        
        const html = this.richTextEditor.innerHTML;
        const markdown = this.htmlToMarkdown(html);
        this.markdownTextarea.value = markdown;
        
        // Trigger input event on textarea for auto-save
        const event = new Event('input', { bubbles: true });
        this.markdownTextarea.dispatchEvent(event);
    }
    
    updatePreview() {
        if (window.updatePreview) {
            window.updatePreview();
        }
    }
    
    markdownToHtml(markdown) {
        if (window.marked) {
            return marked.parse(markdown);
        }
        // Fallback basic conversion
        return markdown
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }
    
    htmlToMarkdown(html) {
        // Create a temporary div to parse HTML
        const temp = document.createElement('div');
        temp.innerHTML = html;
        
        // Convert common HTML elements to markdown
        let markdown = '';
        
        const processNode = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                return node.textContent;
            }
            
            if (node.nodeType === Node.ELEMENT_NODE) {
                let result = '';
                const tag = node.tagName.toLowerCase();
                
                switch(tag) {
                    case 'strong':
                    case 'b':
                        result = `**${processChildren(node)}**`;
                        break;
                    case 'em':
                    case 'i':
                        result = `*${processChildren(node)}*`;
                        break;
                    case 'u':
                        result = `<u>${processChildren(node)}</u>`;
                        break;
                    case 'strike':
                    case 's':
                        result = `~~${processChildren(node)}~~`;
                        break;
                    case 'h1':
                        result = `# ${processChildren(node)}\n\n`;
                        break;
                    case 'h2':
                        result = `## ${processChildren(node)}\n\n`;
                        break;
                    case 'h3':
                        result = `### ${processChildren(node)}\n\n`;
                        break;
                    case 'p':
                        result = `${processChildren(node)}\n\n`;
                        break;
                    case 'br':
                        result = '\n';
                        break;
                    case 'ul':
                        result = processListItems(node, '- ');
                        break;
                    case 'ol':
                        result = processListItems(node, '1. ');
                        break;
                    case 'a':
                        const href = node.getAttribute('href') || '';
                        result = `[${processChildren(node)}](${href})`;
                        break;
                    case 'img':
                        const src = node.getAttribute('src') || '';
                        const alt = node.getAttribute('alt') || '';
                        result = `![${alt}](${src})`;
                        break;
                    case 'code':
                        result = `\`${processChildren(node)}\``;
                        break;
                    case 'pre':
                        result = `\`\`\`\n${processChildren(node)}\n\`\`\`\n\n`;
                        break;
                    case 'blockquote':
                        result = processChildren(node).split('\n').map(line => `> ${line}`).join('\n') + '\n\n';
                        break;
                    case 'hr':
                        result = '---\n\n';
                        break;
                    case 'table':
                        result = processTable(node);
                        break;
                    default:
                        result = processChildren(node);
                }
                
                return result;
            }
            
            return '';
        };
        
        const processChildren = (node) => {
            return Array.from(node.childNodes).map(processNode).join('');
        };
        
        const processListItems = (node, prefix) => {
            const items = Array.from(node.children).filter(child => child.tagName.toLowerCase() === 'li');
            return items.map(item => `${prefix}${processChildren(item)}\n`).join('') + '\n';
        };
        
        const processTable = (table) => {
            const rows = Array.from(table.querySelectorAll('tr'));
            if (rows.length === 0) return '';
            
            let markdown = '\n';
            rows.forEach((row, index) => {
                const cells = Array.from(row.querySelectorAll('td, th'));
                markdown += '| ' + cells.map(cell => processChildren(cell).trim()).join(' | ') + ' |\n';
                
                if (index === 0) {
                    markdown += '| ' + cells.map(() => '---').join(' | ') + ' |\n';
                }
            });
            markdown += '\n';
            
            return markdown;
        };
        
        markdown = processChildren(temp);
        
        // Clean up extra newlines
        markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();
        
        return markdown;
    }
}

// Initialize rich text editor when the Notes module is ready
window.addEventListener('notesModuleReady', function() {
    // Check if we're in the note editor
    const noteContentInput = document.getElementById('note-content-input');
    const noteContentDisplay = document.getElementById('note-content-display');
    
    if (noteContentInput && noteContentDisplay) {
        window.richTextEditor = new RichTextEditor('note-content-input', 'note-content-display');
    }
});