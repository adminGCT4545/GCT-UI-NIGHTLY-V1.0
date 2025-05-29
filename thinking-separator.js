// Thinking/Answer Separation Enhancement for KYNSEY AI - FIXED VERSION
// This module enhances the chat interface to separate LLM thinking/reasoning from final answers

(function() {
    'use strict';
    
    console.log('🧠 [ThinkingSeparator] Starting initialization...');
    
    // Configuration
    const THINKING_REGEX = /<think(?:ing)?>([\s\S]*?)<\/think(?:ing)?>/gi;
    const THINKING_ALT_REGEX = /^Thinking:?\s*([\s\S]*?)(?=\n\n|$)/mi;
    
    // Store original addAIMessage function
    let originalAddAIMessage = null;
    
    // Track processed messages to avoid duplication
    const processedMessages = new WeakSet();
    
    // Message state tracking
    const messageThinkingState = new Map();
    
    // Global preference
    let globalAutoExpand = localStorage.getItem('kynseyThinkingAutoExpand') === 'true';
    
    // Extract raw content from message element
    function extractRawContent(messageElement) {
        console.log('🔍 [ThinkingSeparator] Extracting raw content from message element');
        console.log('🔍 [ThinkingSeparator] Message element classes:', messageElement.className);
        
        // Try to get stored raw content first
        const storedRaw = messageElement.getAttribute('data-raw-content');
        if (storedRaw) {
            console.log('✅ [ThinkingSeparator] Found stored raw content:', storedRaw.substring(0, 100) + '...');
            return storedRaw;
        }
        
        // Try multiple selectors for content element
        let contentElement = messageElement.querySelector('.message-content');
        if (!contentElement) {
            contentElement = messageElement.querySelector('div:last-child');
        }
        if (!contentElement) {
            contentElement = messageElement.querySelector('div');
        }
        
        if (!contentElement) {
            console.log('❌ [ThinkingSeparator] No content element found');
            console.log('🔍 [ThinkingSeparator] Message HTML:', messageElement.innerHTML.substring(0, 200));
            return '';
        }
        
        console.log('✅ [ThinkingSeparator] Found content element:', contentElement.className);
        
        // Try to get text content including HTML tags
        let rawContent = '';
        
        // Method 1: Check for code blocks that might contain thinking tags
        const codeBlocks = contentElement.querySelectorAll('code');
        codeBlocks.forEach(block => {
            const text = block.textContent;
            if (text.includes('<think>') || text.includes('</think>') || 
                text.includes('<thinking>') || text.includes('</thinking>')) {
                rawContent += text + '\n';
            }
        });
        
        // Method 2: Get innerHTML and try to extract thinking from it
        if (!rawContent) {
            const innerHTML = contentElement.innerHTML;
            console.log('🔍 [ThinkingSeparator] Content innerHTML:', innerHTML.substring(0, 200) + '...');
            
            // Look for escaped thinking tags (both formats)
            const escapedThinking = innerHTML.match(/&lt;think(?:ing)?&gt;([\s\S]*?)&lt;\/think(?:ing)?&gt;/gi);
            if (escapedThinking) {
                escapedThinking.forEach(match => {
                    const unescaped = match.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
                    rawContent += unescaped + '\n';
                });
            }
        }
        
        // Method 3: Get all text content
        if (!rawContent) {
            rawContent = contentElement.textContent || contentElement.innerText || '';
            console.log('🔍 [ThinkingSeparator] Using text content:', rawContent.substring(0, 100) + '...');
        }
        
        console.log('📄 [ThinkingSeparator] Extracted content length:', rawContent.length);
        return rawContent;
    }
    
    // Enhanced message structure
    function parseThinkingContent(content) {
        console.log('🧩 [ThinkingSeparator] Parsing content for thinking tags');
        
        let thinking = '';
        let answer = content;
        
        // Check for <thinking> tags
        const thinkingMatches = content.matchAll(THINKING_REGEX);
        const thinkingParts = [];
        
        for (const match of thinkingMatches) {
            console.log('💭 [ThinkingSeparator] Found thinking block:', match[1].substring(0, 50) + '...');
            thinkingParts.push(match[1].trim());
            answer = answer.replace(match[0], '');
        }
        
        if (thinkingParts.length > 0) {
            thinking = thinkingParts.join('\n\n');
        } else {
            // Check for alternative thinking format
            const altMatch = content.match(THINKING_ALT_REGEX);
            if (altMatch) {
                console.log('💭 [ThinkingSeparator] Found alternative thinking format');
                thinking = altMatch[1].trim();
                answer = content.replace(altMatch[0], '').trim();
            }
        }
        
        const result = {
            thinking: thinking.trim(),
            answer: answer.trim(),
            hasThinking: thinking.length > 0
        };
        
        console.log('✅ [ThinkingSeparator] Parse result:', {
            hasThinking: result.hasThinking,
            thinkingLength: result.thinking.length,
            answerLength: result.answer.length
        });
        
        return result;
    }
    
    // Create thinking section UI
    function createThinkingSection(thinking, messageId) {
        console.log('🎨 [ThinkingSeparator] Creating thinking section UI for message:', messageId);
        
        const thinkingContainer = document.createElement('div');
        thinkingContainer.className = 'thinking-section';
        thinkingContainer.setAttribute('data-message-id', messageId);
        
        const thinkingHeader = document.createElement('div');
        thinkingHeader.className = 'thinking-header';
        thinkingHeader.innerHTML = `
            <button class="thinking-toggle" aria-expanded="${globalAutoExpand}" aria-controls="thinking-content-${messageId}">
                <i class="fas fa-chevron-${globalAutoExpand ? 'down' : 'right'} thinking-arrow"></i>
                <span class="thinking-label">
                    <i class="fas fa-brain"></i> View Thinking Process
                </span>
            </button>
        `;
        
        const thinkingContent = document.createElement('div');
        thinkingContent.className = 'thinking-content';
        thinkingContent.id = `thinking-content-${messageId}`;
        thinkingContent.style.display = globalAutoExpand ? 'block' : 'none';
        
        // Process thinking content with markdown if available
        if (window.marked && window.DOMPurify) {
            thinkingContent.innerHTML = DOMPurify.sanitize(marked.parse(thinking));
        } else {
            thinkingContent.textContent = thinking;
        }
        
        thinkingContainer.appendChild(thinkingHeader);
        thinkingContainer.appendChild(thinkingContent);
        
        // Add toggle functionality
        const toggleBtn = thinkingHeader.querySelector('.thinking-toggle');
        toggleBtn.addEventListener('click', function() {
            const isExpanded = this.getAttribute('aria-expanded') === 'true';
            const newExpanded = !isExpanded;
            
            this.setAttribute('aria-expanded', newExpanded);
            thinkingContent.style.display = newExpanded ? 'block' : 'none';
            
            const arrow = this.querySelector('.thinking-arrow');
            arrow.className = `fas fa-chevron-${newExpanded ? 'down' : 'right'} thinking-arrow`;
            
            // Save state
            messageThinkingState.set(messageId, newExpanded);
        });
        
        return thinkingContainer;
    }
    
    // Process a message element
    function processMessageElement(messageElement) {
        if (processedMessages.has(messageElement)) {
            console.log('⏭️ [ThinkingSeparator] Message already processed, skipping');
            return;
        }
        
        console.log('🔄 [ThinkingSeparator] Processing message element');
        
        // Extract content
        const rawContent = extractRawContent(messageElement);
        if (!rawContent) {
            console.log('❌ [ThinkingSeparator] No content found in message');
            return;
        }
        
        // Parse thinking content
        const parsed = parseThinkingContent(rawContent);
        if (!parsed.hasThinking) {
            console.log('ℹ️ [ThinkingSeparator] No thinking content found');
            return;
        }
        
        // Find content element
        const contentElement = messageElement.querySelector('.message-content');
        if (!contentElement) {
            console.log('❌ [ThinkingSeparator] No content element to modify');
            return;
        }
        
        // Create thinking section
        const messageId = Date.now().toString();
        const thinkingSection = createThinkingSection(parsed.thinking, messageId);
        
        // Update content with answer only
        if (window.marked && window.DOMPurify) {
            contentElement.innerHTML = DOMPurify.sanitize(marked.parse(parsed.answer));
        } else {
            contentElement.textContent = parsed.answer;
        }
        
        // Insert thinking section at the beginning
        contentElement.insertBefore(thinkingSection, contentElement.firstChild);
        
        // Mark as processed
        processedMessages.add(messageElement);
        
        console.log('✅ [ThinkingSeparator] Successfully processed message with thinking section');
    }
    
    // Override addAIMessage function
    function enhanceAddAIMessage() {
        console.log('🎯 [ThinkingSeparator] Attempting to enhance addAIMessage function');
        
        // Check if function exists
        if (typeof window.addAIMessage === 'function') {
            originalAddAIMessage = window.addAIMessage;
            
            // Replace with enhanced version
            window.addAIMessage = function(content, suggestions) {
                console.log('🚀 [ThinkingSeparator] Enhanced addAIMessage called');
                console.log('📝 [ThinkingSeparator] Raw content:', content.substring(0, 100) + '...');
                
                // Check for thinking content before processing
                const parsed = parseThinkingContent(content);
                if (parsed.hasThinking) {
                    console.log('💭 [ThinkingSeparator] Thinking content detected, processing...');
                    
                    // Call original function with clean answer
                    originalAddAIMessage(parsed.answer, suggestions);
                    
                    // Process the newly added message with thinking content
                    setTimeout(() => {
                        const messages = document.getElementById('messages');
                        const lastMessage = messages?.lastElementChild;
                        
                        if (lastMessage && lastMessage.classList.contains('message')) {
                            console.log('✅ [ThinkingSeparator] Found last message, adding thinking section');
                            
                            // Store raw content for later use
                            lastMessage.setAttribute('data-raw-content', content);
                            
                            // Find content element and add thinking section
                            const contentElement = lastMessage.querySelector('.message-content');
                            if (contentElement) {
                                const messageId = Date.now().toString();
                                const thinkingSection = createThinkingSection(parsed.thinking, messageId);
                                contentElement.insertBefore(thinkingSection, contentElement.firstChild);
                                console.log('✅ [ThinkingSeparator] Thinking section added successfully');
                            } else {
                                console.log('❌ [ThinkingSeparator] Could not find content element');
                            }
                        }
                    }, 50);
                } else {
                    console.log('ℹ️ [ThinkingSeparator] No thinking content found, using original function');
                    // No thinking content, call original function normally
                    originalAddAIMessage(content, suggestions);
                }
            };
            
            console.log('✅ [ThinkingSeparator] Successfully enhanced addAIMessage');
            return true;
        }
        
        console.log('❌ [ThinkingSeparator] addAIMessage not found');
        return false;
    }
    
    // MutationObserver fallback for message interception
    function observeMessages() {
        console.log('👁️ [ThinkingSeparator] Setting up MutationObserver');
        
        const messagesContainer = document.getElementById('messages');
        if (!messagesContainer) {
            console.warn('❌ [ThinkingSeparator] Messages container not found');
            return;
        }
        
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE && 
                        node.classList?.contains('message') && 
                        node.classList?.contains('ai')) {
                        
                        console.log('🆕 [ThinkingSeparator] New AI message detected via MutationObserver');
                        
                        // Wait a bit for DOM to be fully constructed
                        setTimeout(() => {
                            const contentElement = node.querySelector('.message-content');
                            if (contentElement) {
                                const rawContent = contentElement.textContent || contentElement.innerHTML;
                                console.log('🔍 [ThinkingSeparator] Content from new message:', rawContent.substring(0, 100) + '...');
                                
                                const parsed = parseThinkingContent(rawContent);
                                if (parsed.hasThinking) {
                                    console.log('💭 [ThinkingSeparator] Thinking found in new message, processing...');
                                    
                                    // Replace content with answer only
                                    if (window.marked && window.DOMPurify) {
                                        contentElement.innerHTML = DOMPurify.sanitize(marked.parse(parsed.answer));
                                    } else {
                                        contentElement.textContent = parsed.answer;
                                    }
                                    
                                    // Add thinking section
                                    const messageId = Date.now().toString();
                                    const thinkingSection = createThinkingSection(parsed.thinking, messageId);
                                    contentElement.insertBefore(thinkingSection, contentElement.firstChild);
                                    
                                    console.log('✅ [ThinkingSeparator] Thinking section added via MutationObserver');
                                }
                            } else {
                                console.log('❌ [ThinkingSeparator] No content element found in new message');
                            }
                        }, 100);
                    }
                });
            });
        });
        
        observer.observe(messagesContainer, {
            childList: true,
            subtree: false
        });
        
        console.log('✅ [ThinkingSeparator] MutationObserver active');
    }
    
    // Process existing messages
    function processExistingMessages() {
        console.log('📋 [ThinkingSeparator] Processing existing messages');
        
        const messages = document.querySelectorAll('.message.ai');
        let processedCount = 0;
        
        messages.forEach((message) => {
            if (!processedMessages.has(message)) {
                console.log('🔍 [ThinkingSeparator] Processing existing message');
                
                const contentElement = message.querySelector('.message-content');
                if (contentElement) {
                    const rawContent = contentElement.textContent || contentElement.innerHTML;
                    console.log('📄 [ThinkingSeparator] Existing message content:', rawContent.substring(0, 100) + '...');
                    
                    const parsed = parseThinkingContent(rawContent);
                    if (parsed.hasThinking) {
                        console.log('💭 [ThinkingSeparator] Found thinking in existing message');
                        
                        // Replace content with answer only
                        if (window.marked && window.DOMPurify) {
                            contentElement.innerHTML = DOMPurify.sanitize(marked.parse(parsed.answer));
                        } else {
                            contentElement.textContent = parsed.answer;
                        }
                        
                        // Add thinking section
                        const messageId = Date.now().toString();
                        const thinkingSection = createThinkingSection(parsed.thinking, messageId);
                        contentElement.insertBefore(thinkingSection, contentElement.firstChild);
                        
                        processedMessages.add(message);
                        processedCount++;
                        console.log('✅ [ThinkingSeparator] Processed existing message with thinking');
                    }
                } else {
                    console.log('❌ [ThinkingSeparator] No content element in existing message');
                }
            }
        });
        
        console.log(`✅ [ThinkingSeparator] Processed ${processedCount} existing messages`);
    }
    
    // Add CSS styles
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Thinking Section Styles */
            .thinking-section {
                margin-bottom: 1rem;
                border: 1px solid rgba(94, 234, 212, 0.2);
                border-radius: 0.5rem;
                overflow: hidden;
                background: rgba(35, 36, 58, 0.3);
            }
            
            .thinking-header {
                padding: 0;
            }
            
            .thinking-toggle {
                width: 100%;
                padding: 0.75rem 1rem;
                background: transparent;
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                color: #a0a0a0;
                font-size: 0.875rem;
                transition: all 0.2s ease;
                text-align: left;
            }
            
            .thinking-toggle:hover {
                background: rgba(94, 234, 212, 0.05);
                color: #5eead4;
            }
            
            .thinking-arrow {
                transition: transform 0.2s ease;
                font-size: 0.75rem;
            }
            
            .thinking-label {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .thinking-content {
                padding: 1rem;
                border-top: 1px solid rgba(94, 234, 212, 0.1);
                font-size: 0.875rem;
                line-height: 1.5;
                color: #b0b0b0;
                max-height: 400px;
                overflow-y: auto;
            }
            
            .thinking-content::-webkit-scrollbar {
                width: 6px;
            }
            
            .thinking-content::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.1);
                border-radius: 3px;
            }
            
            .thinking-content::-webkit-scrollbar-thumb {
                background: rgba(94, 234, 212, 0.3);
                border-radius: 3px;
            }
            
            .thinking-content p {
                margin: 0.5rem 0;
            }
            
            .thinking-content code {
                background: rgba(0, 0, 0, 0.3);
                padding: 0.125rem 0.25rem;
                border-radius: 0.25rem;
                font-size: 0.85em;
            }
            
            .thinking-content pre {
                background: rgba(0, 0, 0, 0.3);
                padding: 0.75rem;
                border-radius: 0.375rem;
                overflow-x: auto;
                margin: 0.5rem 0;
            }
            
            /* Global toggle in settings */
            .thinking-settings {
                padding: 1rem;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .thinking-settings-toggle {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 1rem;
            }
            
            .thinking-settings-label {
                font-size: 0.875rem;
                color: #a0a0a0;
            }
            
            /* Animation */
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .thinking-content[style*="block"] {
                animation: slideDown 0.3s ease;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Add settings UI
    function addSettingsUI() {
        // Wait for settings panel to be available
        const checkSettings = setInterval(() => {
            const settingsContent = document.querySelector('#settings-content');
            if (settingsContent) {
                clearInterval(checkSettings);
                
                // Check if settings already added
                if (document.querySelector('.thinking-settings')) return;
                
                const thinkingSettings = document.createElement('div');
                thinkingSettings.className = 'thinking-settings';
                thinkingSettings.innerHTML = `
                    <div class="thinking-settings-toggle">
                        <label class="thinking-settings-label">
                            <i class="fas fa-brain"></i> Auto-expand thinking sections
                        </label>
                        <label class="switch">
                            <input type="checkbox" id="thinking-auto-expand" ${globalAutoExpand ? 'checked' : ''}>
                            <span class="slider round"></span>
                        </label>
                    </div>
                `;
                
                settingsContent.appendChild(thinkingSettings);
                
                // Add toggle handler
                const toggle = document.getElementById('thinking-auto-expand');
                toggle?.addEventListener('change', function() {
                    globalAutoExpand = this.checked;
                    localStorage.setItem('kynseyThinkingAutoExpand', globalAutoExpand);
                });
            }
        }, 500);
    }
    
    // Initialize the enhancement
    function initialize() {
        console.log('🚀 [ThinkingSeparator] Initializing Thinking Separator...');
        
        // Inject styles
        injectStyles();
        
        // Try to enhance addAIMessage immediately
        if (!enhanceAddAIMessage()) {
            // If not available, try again in intervals
            const attempts = 0;
            const checkInterval = setInterval(() => {
                if (enhanceAddAIMessage()) {
                    clearInterval(checkInterval);
                } else if (attempts > 10) {
                    clearInterval(checkInterval);
                    console.log('⚠️ [ThinkingSeparator] Could not enhance addAIMessage, using observer only');
                }
            }, 500);
        }
        
        // Always set up observer as backup
        setTimeout(() => {
            observeMessages();
            processExistingMessages();
        }, 1000);
        
        // Add settings UI
        addSettingsUI();
        
        // Add keyboard shortcut
        document.addEventListener('keydown', function(e) {
            // Alt+T to toggle all thinking sections
            if (e.altKey && e.key === 't') {
                const allToggles = document.querySelectorAll('.thinking-toggle');
                const shouldExpand = !globalAutoExpand;
                
                allToggles.forEach(toggle => {
                    toggle.setAttribute('aria-expanded', shouldExpand);
                    const content = document.getElementById(toggle.getAttribute('aria-controls'));
                    if (content) {
                        content.style.display = shouldExpand ? 'block' : 'none';
                    }
                    const arrow = toggle.querySelector('.thinking-arrow');
                    if (arrow) {
                        arrow.className = `fas fa-chevron-${shouldExpand ? 'down' : 'right'} thinking-arrow`;
                    }
                });
                
                globalAutoExpand = shouldExpand;
                localStorage.setItem('kynseyThinkingAutoExpand', globalAutoExpand);
                
                // Update settings toggle if visible
                const settingsToggle = document.getElementById('thinking-auto-expand');
                if (settingsToggle) {
                    settingsToggle.checked = globalAutoExpand;
                }
                
                e.preventDefault();
            }
        });
        
        // Add debug function to window
        window.debugProcessExistingMessages = function() {
            console.log('🔧 [ThinkingSeparator] Manual debug process triggered');
            processExistingMessages();
        };
        
        console.log('✅ [ThinkingSeparator] Initialization complete');
        console.log('💡 [ThinkingSeparator] Tips:');
        console.log('   - Use Alt+T to toggle all thinking sections');
        console.log('   - Call window.debugProcessExistingMessages() to manually process messages');
    }
    
    // Start initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();