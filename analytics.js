// Analytics Module for GCT UI
(function() {
    'use strict';

    // Analytics namespace
    window.Analytics = {
        // State management
        state: {
            isOpen: false,
            uploadedFiles: [],
            currentAnalysis: null,
            chartInstance: null,
            sparklineCharts: {},
            chatHistory: [],
            recentAnalyses: []
        },

        // Initialize the analytics module
        init: function() {
            console.log('Initializing Analytics module...');
            this.initializeEventListeners();
            this.initializeDragDrop();
            this.loadChartLibrary();
            this.initializeSparklines();
            this.initializeEnhancedFeatures();
            this.loadInsightOfTheDay();
        },

        // Initialize event listeners
        initializeEventListeners: function() {
            // Navigation button
            const analyticsNav = document.getElementById('analytics-nav');
            if (analyticsNav) {
                analyticsNav.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.togglePanel();
                });
            }

            // Close button
            const closeBtn = document.getElementById('close-analytics');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.closePanel());
            }

            // File input
            const fileInput = document.getElementById('analytics-file-input');
            if (fileInput) {
                fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
            }

            // Upload dropzone click
            const dropzone = document.getElementById('upload-dropzone');
            if (dropzone) {
                dropzone.addEventListener('click', () => fileInput.click());
            }

            // Query button
            const queryBtn = document.getElementById('analytics-query-btn');
            if (queryBtn) {
                queryBtn.addEventListener('click', () => this.performAnalysis());
            }

            // Query input enter key
            const queryInput = document.getElementById('analytics-query-input');
            if (queryInput) {
                queryInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.performAnalysis();
                    }
                });
            }

            // Export button
            const exportBtn = document.getElementById('export-results-btn');
            if (exportBtn) {
                exportBtn.addEventListener('click', () => this.exportResults());
            }

            // Enhanced features event listeners
            this.initializeEnhancedEventListeners();
        },

        // Initialize enhanced event listeners
        initializeEnhancedEventListeners: function() {
            // Quick upload button
            const quickUploadBtn = document.getElementById('quick-upload-btn');
            if (quickUploadBtn) {
                quickUploadBtn.addEventListener('click', () => {
                    document.getElementById('analytics-file-input').click();
                });
            }

            // Suggested queries
            document.querySelectorAll('.suggested-query').forEach(btn => {
                btn.addEventListener('click', () => {
                    const query = btn.textContent;
                    document.getElementById('analytics-query-input').value = query;
                    this.performAnalysis();
                });
            });

            // Voice input button
            const voiceBtn = document.getElementById('analytics-voice-btn');
            if (voiceBtn) {
                voiceBtn.addEventListener('click', () => this.startVoiceInput());
            }

            // Open full suite button
            const openSuiteBtn = document.getElementById('open-analytics-suite');
            if (openSuiteBtn) {
                openSuiteBtn.addEventListener('click', () => this.openFullSuite());
            }

            // Explore more buttons
            document.querySelectorAll('.explore-more-btn').forEach(btn => {
                btn.addEventListener('click', () => this.openFullSuite());
            });

            // Recent analysis items
            document.querySelectorAll('.recent-item').forEach(item => {
                item.addEventListener('click', () => this.loadRecentAnalysis(item));
            });

            // Insight cards
            document.querySelectorAll('.insight-card').forEach(card => {
                card.addEventListener('click', () => this.exploreInsight(card));
            });
        },

        // Initialize drag and drop
        initializeDragDrop: function() {
            const dropzone = document.getElementById('upload-dropzone');
            if (!dropzone) return;

            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropzone.addEventListener(eventName, this.preventDefaults, false);
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                dropzone.addEventListener(eventName, () => {
                    dropzone.classList.add('dragover');
                });
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropzone.addEventListener(eventName, () => {
                    dropzone.classList.remove('dragover');
                });
            });

            dropzone.addEventListener('drop', (e) => this.handleDrop(e));
        },

        // Prevent default drag behaviors
        preventDefaults: function(e) {
            e.preventDefault();
            e.stopPropagation();
        },

        // Handle file drop
        handleDrop: function(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            this.handleFiles(files);
        },

        // Handle file selection
        handleFileSelect: function(e) {
            const files = e.target.files;
            this.handleFiles(files);
        },

        // Process uploaded files
        handleFiles: async function(files) {
            const validFiles = Array.from(files).filter(file => {
                const validTypes = ['application/pdf', 'application/vnd.ms-excel', 
                                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                                  'text/csv'];
                return validTypes.includes(file.type) || 
                       file.name.endsWith('.xlsx') || 
                       file.name.endsWith('.xls') || 
                       file.name.endsWith('.csv') ||
                       file.name.endsWith('.pdf');
            });

            if (validFiles.length === 0) {
                alert('Please upload only Excel (.xlsx, .xls), CSV, or PDF files.');
                return;
            }

            this.state.uploadedFiles = validFiles;
            this.displayUploadedFiles();
            
            // Parse files immediately if parser is available
            if (window.AnalyticsParser) {
                for (const file of validFiles) {
                    try {
                        const parsedData = await window.AnalyticsParser.parseFile(file);
                        console.log('Parsed data:', parsedData);
                        
                        // Store parsed data
                        if (!this.state.parsedFiles) {
                            this.state.parsedFiles = {};
                        }
                        this.state.parsedFiles[file.name] = parsedData;
                        
                        // Update UI to show parsing success
                        this.updateFileStatus(file.name, 'success');
                    } catch (error) {
                        console.error('Error parsing file:', error);
                        this.updateFileStatus(file.name, 'error', error.message);
                    }
                }
            }
        },

        // Display uploaded files
        displayUploadedFiles: function() {
            const uploadArea = document.getElementById('analytics-upload-area');
            if (!uploadArea) return;

            let filesHTML = '<div class="uploaded-files"><h4>Uploaded Files:</h4><ul>';
            this.state.uploadedFiles.forEach(file => {
                filesHTML += `<li><i class="fas fa-file"></i> ${file.name} (${this.formatFileSize(file.size)})</li>`;
            });
            filesHTML += '</ul></div>';

            const existingList = uploadArea.querySelector('.uploaded-files');
            if (existingList) {
                existingList.remove();
            }
            uploadArea.insertAdjacentHTML('beforeend', filesHTML);
        },

        // Format file size
        formatFileSize: function(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        },

        // Perform analysis
        performAnalysis: async function() {
            const query = document.getElementById('analytics-query-input').value.trim();
            if (!query && this.state.uploadedFiles.length === 0) {
                alert('Please upload files or enter a query to analyze.');
                return;
            }

            // Show loading state
            this.showLoading();

            try {
                // Prepare the analysis request
                const analysisData = await this.prepareAnalysisData();
                
                // Send to LM Studio API
                const response = await this.sendToLMStudio(analysisData, query);
                
                // Process and display results
                this.displayResults(response);
                
                // Generate visualizations
                this.generateVisualizations(response);
                
            } catch (error) {
                console.error('Analysis error:', error);
                this.hideLoading();
                alert('An error occurred during analysis. Please try again.');
            }
        },

        // Prepare analysis data from uploaded files
        prepareAnalysisData: async function() {
            const data = {
                files: [],
                parsedData: [],
                timestamp: new Date().toISOString()
            };

            // Use real parsed data if available
            if (this.state.parsedFiles) {
                for (const fileName in this.state.parsedFiles) {
                    const parsed = this.state.parsedFiles[fileName];
                    data.parsedData.push(parsed);
                    data.files.push({
                        name: fileName,
                        type: parsed.type,
                        summary: parsed.summary
                    });
                }
            } else {
                // Fallback to metadata only
                for (const file of this.state.uploadedFiles) {
                    data.files.push({
                        name: file.name,
                        type: file.type,
                        size: file.size
                    });
                }
            }

            return data;
        },

        // Update file status in UI
        updateFileStatus: function(fileName, status, message = '') {
            const uploadedFiles = document.querySelector('.uploaded-files');
            if (!uploadedFiles) return;

            const fileItems = uploadedFiles.querySelectorAll('li');
            fileItems.forEach(item => {
                if (item.textContent.includes(fileName)) {
                    const statusIcon = status === 'success' ? 
                        '<i class="fas fa-check-circle" style="color: var(--success-color);"></i>' : 
                        '<i class="fas fa-exclamation-circle" style="color: var(--error-color);"></i>';
                    
                    if (!item.querySelector('.file-status')) {
                        item.insertAdjacentHTML('beforeend', ` <span class="file-status">${statusIcon}</span>`);
                    }
                    
                    if (message) {
                        item.title = message;
                    }
                }
            });
        },

        // Send analysis request to LM Studio
        sendToLMStudio: async function(data, query) {
            const config = window.config || {};
            const apiUrl = config.API_URL || 'http://192.168.1.7:4545';
            
            const systemPrompt = `You are an AI analyst specializing in financial data analysis, forecasting, and business intelligence. 
            Analyze the provided data and answer questions about trends, forecasts, and insights. 
            Provide clear, actionable insights with specific numbers and recommendations.`;

            let userPrompt = query || 'Please analyze the uploaded data and provide key insights, trends, and forecasts.';
            
            // Include parsed data in the prompt if available
            if (data.parsedData && data.parsedData.length > 0 && window.AnalyticsParser) {
                const analysisPrompts = data.parsedData.map(parsed => 
                    window.AnalyticsParser.generateAnalysisPrompt(parsed)
                ).join('\n\n');
                userPrompt = `${userPrompt}\n\n${analysisPrompts}`;
            }

            try {
                const response = await fetch(`${apiUrl}/v1/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: '30b-a3b',
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userPrompt }
                        ],
                        temperature: 0.7,
                        max_tokens: 1000
                    })
                });

                if (!response.ok) {
                    throw new Error(`API request failed: ${response.status}`);
                }

                const result = await response.json();
                return result.choices[0].message.content;

            } catch (error) {
                console.error('LM Studio API error:', error);
                // Return mock data for testing
                return this.getMockAnalysisResponse();
            }
        },

        // Get mock analysis response for testing
        getMockAnalysisResponse: function() {
            return `## Analysis Results

### Key Insights:
- **Revenue Growth**: Projected 15% increase in Q2 based on current trends
- **Cost Optimization**: Identified $50K in potential savings through efficiency improvements
- **Market Trends**: Strong demand in North American markets, 25% YoY growth

### Forecast:
- **Q2 Revenue**: $2.5M (±5% confidence interval)
- **Annual Projection**: $10.2M total revenue expected
- **Break-even**: Expected by end of Q3

### Recommendations:
1. Increase marketing spend in high-performing regions
2. Optimize supply chain to reduce costs by 10%
3. Launch new product line to capture emerging market demand`;
        },

        // Display analysis results
        displayResults: function(response) {
            this.hideLoading();
            
            const resultsSection = document.getElementById('analytics-results');
            const resultsContainer = resultsSection.querySelector('.results-container');
            
            // Parse markdown response
            const parsedHTML = this.parseMarkdown(response);
            resultsContainer.innerHTML = parsedHTML;
            
            resultsSection.style.display = 'block';
            document.querySelector('.analytics-export-section').style.display = 'block';
            
            this.state.currentAnalysis = response;
        },

        // Parse markdown to HTML
        parseMarkdown: function(markdown) {
            if (window.marked) {
                return window.marked.parse(markdown);
            }
            // Fallback simple parsing
            return markdown
                .replace(/### (.*)/g, '<h3>$1</h3>')
                .replace(/## (.*)/g, '<h2>$1</h2>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>');
        },

        // Generate visualizations
        generateVisualizations: function() {
            const vizSection = document.getElementById('analytics-visualizations');
            vizSection.style.display = 'block';

            // Generate chart based on parsed data or use sample
            this.createChart();
        },

        // Create chart visualization
        createChart: function() {
            const canvas = document.getElementById('analytics-chart');
            if (!canvas || !window.Chart) return;

            // Destroy existing chart
            if (this.state.chartInstance) {
                this.state.chartInstance.destroy();
            }

            // Try to use real parsed data
            let chartData;
            if (this.state.parsedFiles && Object.keys(this.state.parsedFiles).length > 0 && window.AnalyticsParser) {
                // Get first parsed file
                const firstFile = Object.values(this.state.parsedFiles)[0];
                
                // Determine appropriate fields for chart
                if (firstFile.type === 'pdf') {
                    // Use extracted metrics from PDF
                    chartData = window.AnalyticsParser.prepareChartData(firstFile, null, null, 'bar');
                } else if (firstFile.summary && firstFile.summary.numericColumns.length > 0) {
                    // Use first date column (if any) as x-axis, first numeric column as y-axis
                    const xField = firstFile.summary.dateColumns[0] || firstFile.headers[0];
                    const yField = firstFile.summary.numericColumns[0];
                    chartData = window.AnalyticsParser.prepareChartData(firstFile, xField, yField, 'line');
                }
            }

            // Fallback to sample data if no parsed data available
            if (!chartData) {
                chartData = {
                    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
                    datasets: [{
                        label: 'Revenue Forecast',
                        data: [2.1, 2.5, 2.8, 3.2],
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        tension: 0.1
                    }, {
                        label: 'Actual Revenue',
                        data: [2.1, null, null, null],
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderDash: [5, 5]
                    }]
                };
            }

            // Create new chart with data
            const ctx = canvas.getContext('2d');
            this.state.chartInstance = new Chart(ctx, {
                type: chartData.type || 'line',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: chartData.title || 'Data Analysis'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return typeof value === 'number' ? value.toLocaleString() : value;
                                }
                            }
                        }
                    }
                }
            });
        },

        // Export results
        exportResults: function() {
            if (!this.state.currentAnalysis) return;

            const blob = new Blob([this.state.currentAnalysis], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        },

        // Show loading state
        showLoading: function() {
            const resultsContainer = document.querySelector('.results-container');
            if (resultsContainer) {
                resultsContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Analyzing data...</div>';
                document.getElementById('analytics-results').style.display = 'block';
            }
        },

        // Hide loading state
        hideLoading: function() {
            const loading = document.querySelector('.results-container .loading');
            if (loading) {
                loading.remove();
            }
        },

        // Toggle panel visibility
        togglePanel: function() {
            const panel = document.getElementById('analytics-panel');
            const navItem = document.getElementById('analytics-nav');
            
            if (this.state.isOpen) {
                this.closePanel();
            } else {
                // Close other panels
                this.closeOtherPanels();
                
                // Open analytics panel
                panel.classList.add('active');
                navItem.classList.add('active');
                this.state.isOpen = true;
            }
        },

        // Close panel
        closePanel: function() {
            const panel = document.getElementById('analytics-panel');
            const navItem = document.getElementById('analytics-nav');
            
            panel.classList.remove('active');
            navItem.classList.remove('active');
            this.state.isOpen = false;
        },

        // Close other panels
        closeOtherPanels: function() {
            // Close notes panel
            const notesPanel = document.getElementById('notes-panel');
            const notesNav = document.getElementById('notes-nav');
            if (notesPanel && notesPanel.classList.contains('active')) {
                notesPanel.classList.remove('active');
                notesNav.classList.remove('active');
            }

            // Close settings panel
            if (window.toggleSettingsPanel) {
                const settingsPanel = document.getElementById('settings-panel');
                if (settingsPanel && settingsPanel.classList.contains('show')) {
                    window.toggleSettingsPanel();
                }
            }
        },

        // Load Chart.js library
        loadChartLibrary: function() {
            if (window.Chart) return; // Already loaded

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = () => {
                console.log('Chart.js loaded successfully');
                this.initializeSparklines();
            };
            document.head.appendChild(script);
        },

        // Initialize enhanced features
        initializeEnhancedFeatures: function() {
            // Initialize chat functionality
            this.initializeChatInterface();
            
            // Update metrics periodically
            setInterval(() => this.updateQuickInsights(), 30000);
        },

        // Initialize sparkline charts
        initializeSparklines: function() {
            if (!window.Chart) return;

            const sparklineConfigs = {
                'revenue-sparkline': {
                    data: [65, 68, 70, 72, 75, 78, 80],
                    color: 'rgb(75, 192, 192)'
                },
                'users-sparkline': {
                    data: [2100, 2200, 2350, 2400, 2450, 2500, 2543],
                    color: 'rgb(255, 99, 132)'
                },
                'conversion-sparkline': {
                    data: [82, 83, 84, 85, 86, 86, 87],
                    color: 'rgb(255, 205, 86)'
                }
            };

            Object.keys(sparklineConfigs).forEach(id => {
                const canvas = document.getElementById(id);
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    this.state.sparklineCharts[id] = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: ['', '', '', '', '', '', ''],
                            datasets: [{
                                data: sparklineConfigs[id].data,
                                borderColor: sparklineConfigs[id].color,
                                borderWidth: 2,
                                fill: false,
                                tension: 0.4,
                                pointRadius: 0
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false },
                                tooltip: { enabled: false }
                            },
                            scales: {
                                x: { display: false },
                                y: { display: false }
                            }
                        }
                    });
                }
            });
        },

        // Load insight of the day
        loadInsightOfTheDay: async function() {
            try {
                const prompt = 'Generate a brief business insight based on typical Q2 performance metrics.';
                const insight = await this.getAIInsight(prompt);
                
                const insightContent = document.querySelector('.insight-day-content p');
                if (insightContent) {
                    insightContent.textContent = insight || 'Your Q2 revenue is trending 23% above forecast. North American markets show strongest growth.';
                }
            } catch (error) {
                console.log('Using default insight of the day');
            }
        },

        // Get AI insight
        getAIInsight: async function(prompt) {
            const config = window.config || {};
            const apiUrl = config.API_URL || 'http://192.168.1.7:4545';
            
            try {
                const response = await fetch(`${apiUrl}/v1/chat/completions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: '30b-a3b',
                        messages: [
                            { role: 'system', content: 'You are a business analyst. Provide brief, actionable insights.' },
                            { role: 'user', content: prompt }
                        ],
                        temperature: 0.7,
                        max_tokens: 100
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    return result.choices[0].message.content;
                }
            } catch (error) {
                console.error('AI insight error:', error);
            }
            return null;
        },

        // Initialize chat interface
        initializeChatInterface: function() {
            const chatMessages = document.getElementById('analytics-chat-messages');
            if (chatMessages && this.state.chatHistory.length === 0) {
                chatMessages.innerHTML = '<div class="chat-welcome">Ask me anything about your data!</div>';
            }
        },

        // Start voice input
        startVoiceInput: function() {
            if (!('webkitSpeechRecognition' in window)) {
                alert('Voice input is not supported in your browser');
                return;
            }

            const recognition = new webkitSpeechRecognition();
            recognition.lang = 'en-US';
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                document.getElementById('analytics-query-input').value = transcript;
                this.performAnalysis();
            };
            recognition.start();
        },

        // Open full analytics suite
        openFullSuite: function() {
            // This will be implemented in Phase 2
            console.log('Opening full analytics suite...');
            alert('Full Analytics Suite coming soon! This will provide advanced visualization and analysis tools.');
        },

        // Load recent analysis
        loadRecentAnalysis: function(item) {
            const title = item.querySelector('.recent-title').textContent;
            console.log('Loading analysis:', title);
            this.openFullSuite();
        },

        // Explore insight
        exploreInsight: function(card) {
            const label = card.querySelector('.insight-label').textContent;
            document.getElementById('analytics-query-input').value = `Tell me more about ${label}`;
            this.performAnalysis();
        },

        // Update quick insights
        updateQuickInsights: function() {
            // Simulate real-time updates
            const updates = {
                revenue: Math.round(Math.random() * 5 + 12),
                users: Math.round(Math.random() * 100 + 2500),
                conversion: Math.round(Math.random() * 3 + 85)
            };

            const revenueCard = document.querySelector('.insight-card:nth-child(1) .insight-value');
            const usersCard = document.querySelector('.insight-card:nth-child(2) .insight-value');
            const conversionCard = document.querySelector('.insight-card:nth-child(3) .insight-value');

            if (revenueCard) revenueCard.textContent = `+${updates.revenue}%`;
            if (usersCard) usersCard.textContent = updates.users.toLocaleString();
            if (conversionCard) conversionCard.textContent = `${updates.conversion}%`;
        },

        // Enhanced perform analysis for chat interface
        performAnalysis: async function() {
            const query = document.getElementById('analytics-query-input').value.trim();
            if (!query && this.state.uploadedFiles.length === 0) {
                alert('Please upload files or enter a query to analyze.');
                return;
            }

            // Add user message to chat
            this.addChatMessage(query, 'user');
            
            // Clear input
            document.getElementById('analytics-query-input').value = '';

            // Show loading in chat
            const loadingId = this.addChatMessage('Analyzing...', 'assistant', true);

            try {
                const analysisData = await this.prepareAnalysisData();
                const response = await this.sendToLMStudio(analysisData, query);
                
                // Remove loading message
                this.removeChatMessage(loadingId);
                
                // Add response to chat
                this.addChatMessage(response, 'assistant');
                
                // Show explore more CTA
                this.addExploreMoreCTA();
                
            } catch (error) {
                console.error('Analysis error:', error);
                this.removeChatMessage(loadingId);
                this.addChatMessage('Sorry, I encountered an error. Please try again.', 'assistant');
            }
        },

        // Add chat message
        addChatMessage: function(content, sender, isLoading = false) {
            const chatMessages = document.getElementById('analytics-chat-messages');
            if (!chatMessages) return;

            const messageId = `msg-${Date.now()}`;
            const messageDiv = document.createElement('div');
            messageDiv.className = `chat-message ${sender}`;
            messageDiv.id = messageId;
            
            if (isLoading) {
                messageDiv.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';
            } else {
                messageDiv.innerHTML = this.parseMarkdown(content);
            }
            
            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            return messageId;
        },

        // Remove chat message
        removeChatMessage: function(messageId) {
            const message = document.getElementById(messageId);
            if (message) message.remove();
        },

        // Add explore more CTA
        addExploreMoreCTA: function() {
            const chatMessages = document.getElementById('analytics-chat-messages');
            if (!chatMessages) return;

            const ctaDiv = document.createElement('div');
            ctaDiv.className = 'chat-cta';
            ctaDiv.innerHTML = `
                <button class="explore-suite-cta" onclick="Analytics.openFullSuite()">
                    <i class="fas fa-expand"></i> Explore in Full Suite
                </button>
            `;
            chatMessages.appendChild(ctaDiv);
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => Analytics.init());
    } else {
        Analytics.init();
    }
})();