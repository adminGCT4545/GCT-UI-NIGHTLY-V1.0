// Analytics Suite Module for GCT UI
(function() {
    'use strict';

    // Analytics Suite namespace
    window.AnalyticsSuite = {
        // State management
        state: {
            isOpen: false,
            currentMode: 'dashboard',
            widgets: [],
            selectedChart: null,
            filters: [],
            panels: {
                dataExplorer: true,
                insightsPanel: true
            },
            draggedField: null,
            charts: {}
        },

        // Initialize the analytics suite
        init: function() {
            console.log('Initializing Analytics Suite...');
            this.initializeEventListeners();
            this.initializeDragAndDrop();
            this.initializePanelResizing();
            this.initializeCharts();
        },

        // Initialize event listeners
        initializeEventListeners: function() {
            // Open/Close suite
            const closeSuiteBtn = document.getElementById('close-suite');
            if (closeSuiteBtn) {
                closeSuiteBtn.addEventListener('click', () => this.closeSuite());
            }

            const backToPanel = document.getElementById('back-to-panel');
            if (backToPanel) {
                backToPanel.addEventListener('click', () => this.closeSuite());
            }

            // View mode switching
            document.querySelectorAll('.view-mode-btn').forEach(btn => {
                btn.addEventListener('click', () => this.switchViewMode(btn.dataset.mode));
            });

            // Chart type selection
            document.querySelectorAll('.chart-type-btn').forEach(btn => {
                btn.addEventListener('click', () => this.selectChartType(btn.dataset.type));
            });

            // Panel toggles
            document.querySelectorAll('.panel-toggle').forEach(btn => {
                btn.addEventListener('click', () => this.togglePanel(btn.dataset.panel));
            });

            // Tab switching
            document.querySelectorAll('.panel-tab').forEach(tab => {
                tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
            });

            // Actions
            document.getElementById('add-visualization')?.addEventListener('click', () => this.addVisualization());
            document.getElementById('clear-canvas')?.addEventListener('click', () => this.clearCanvas());
            document.getElementById('generate-insights-btn')?.addEventListener('click', () => this.generateInsights());
            
            // Export and share
            document.getElementById('suite-export-btn')?.addEventListener('click', () => this.exportDashboard());
            document.getElementById('suite-share-btn')?.addEventListener('click', () => this.shareDashboard());

            // Filter controls
            document.getElementById('apply-filter-btn')?.addEventListener('click', () => this.applyFilters());
            
            // Data refresh
            document.querySelector('.refresh-data-btn')?.addEventListener('click', () => this.refreshData());

            // Widget actions
            this.initializeWidgetActions();
        },

        // Open the analytics suite
        openSuite: function() {
            const modal = document.getElementById('analytics-suite-modal');
            if (modal) {
                modal.classList.add('active');
                this.state.isOpen = true;
                document.body.style.overflow = 'hidden';
                
                // Initialize with sample chart
                setTimeout(() => this.initializeCharts(), 100);
                
                // Load any context from side panel
                this.loadContext();
            }
        },

        // Close the analytics suite
        closeSuite: function() {
            const modal = document.getElementById('analytics-suite-modal');
            if (modal) {
                modal.classList.remove('active');
                this.state.isOpen = false;
                document.body.style.overflow = '';
            }
        },

        // Switch view mode
        switchViewMode: function(mode) {
            this.state.currentMode = mode;
            
            // Update button states
            document.querySelectorAll('.view-mode-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.mode === mode);
            });

            // Update content based on mode
            const dashboardGrid = document.getElementById('dashboard-grid');
            const dropZone = document.getElementById('viz-drop-zone');
            
            switch(mode) {
                case 'dashboard':
                    dashboardGrid.style.display = 'grid';
                    dropZone.style.display = 'none';
                    break;
                case 'analysis':
                    dashboardGrid.style.display = 'none';
                    dropZone.style.display = 'flex';
                    break;
                case 'report':
                    this.generateReport();
                    break;
            }
        },

        // Select chart type
        selectChartType: function(type) {
            this.state.selectedChart = type;
            
            // Update button states
            document.querySelectorAll('.chart-type-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.type === type);
            });
        },

        // Toggle panel visibility
        togglePanel: function(panelId) {
            const panel = document.getElementById(panelId);
            if (!panel) return;

            const isCollapsed = panel.classList.contains('collapsed');
            panel.classList.toggle('collapsed');
            
            // Update icon
            const icon = panel.querySelector('.panel-toggle i');
            if (icon) {
                if (panelId === 'data-explorer') {
                    icon.className = isCollapsed ? 'fas fa-chevron-left' : 'fas fa-chevron-right';
                } else {
                    icon.className = isCollapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
                }
            }
            
            this.state.panels[panelId] = isCollapsed;
        },

        // Switch tabs
        switchTab: function(tabId) {
            // Update tab buttons
            document.querySelectorAll('.panel-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.tab === tabId);
            });

            // Update tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.toggle('active', content.id === `${tabId}-tab`);
            });
        },

        // Initialize drag and drop
        initializeDragAndDrop: function() {
            // Make field items draggable
            document.querySelectorAll('.field-item').forEach(field => {
                field.addEventListener('dragstart', (e) => this.handleDragStart(e));
                field.addEventListener('dragend', (e) => this.handleDragEnd(e));
            });

            // Set up drop zone
            const dropZone = document.getElementById('viz-drop-zone');
            if (dropZone) {
                dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
                dropZone.addEventListener('drop', (e) => this.handleDrop(e));
                dropZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            }

            // Dashboard grid for widget reordering
            const dashboardGrid = document.getElementById('dashboard-grid');
            if (dashboardGrid) {
                dashboardGrid.addEventListener('dragover', (e) => this.handleDragOver(e));
                dashboardGrid.addEventListener('drop', (e) => this.handleWidgetDrop(e));
            }
        },

        // Drag and drop handlers
        handleDragStart: function(e) {
            this.state.draggedField = e.target.textContent.trim();
            e.target.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'copy';
        },

        handleDragEnd: function(e) {
            e.target.classList.remove('dragging');
        },

        handleDragOver: function(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            e.currentTarget.classList.add('drag-over');
        },

        handleDragLeave: function(e) {
            e.currentTarget.classList.remove('drag-over');
        },

        handleDrop: function(e) {
            e.preventDefault();
            e.currentTarget.classList.remove('drag-over');
            
            if (this.state.draggedField && this.state.selectedChart) {
                this.createVisualization(this.state.draggedField, this.state.selectedChart);
            }
        },

        // Create visualization from dropped field
        createVisualization: function(field, chartType) {
            const widgetId = `widget-${Date.now()}`;
            const widget = {
                id: widgetId,
                field: field,
                type: chartType,
                title: `${field} Analysis`
            };

            this.state.widgets.push(widget);
            
            // Switch to dashboard view to show the new widget
            this.switchViewMode('dashboard');
            
            // Add widget to dashboard
            this.addWidgetToDashboard(widget);
        },

        // Add widget to dashboard
        addWidgetToDashboard: function(widget) {
            const dashboardGrid = document.getElementById('dashboard-grid');
            if (!dashboardGrid) return;

            const widgetDiv = document.createElement('div');
            widgetDiv.className = 'viz-widget';
            widgetDiv.dataset.widgetId = widget.id;
            widgetDiv.innerHTML = `
                <div class="widget-header">
                    <h4>${widget.title}</h4>
                    <div class="widget-actions">
                        <button class="widget-action" data-action="expand"><i class="fas fa-expand"></i></button>
                        <button class="widget-action" data-action="config"><i class="fas fa-cog"></i></button>
                        <button class="widget-action" data-action="remove"><i class="fas fa-times"></i></button>
                    </div>
                </div>
                <div class="widget-content">
                    <canvas id="chart-${widget.id}"></canvas>
                </div>
            `;

            dashboardGrid.appendChild(widgetDiv);
            
            // Initialize chart
            this.createChart(widget);
            
            // Add widget action listeners
            widgetDiv.querySelectorAll('.widget-action').forEach(btn => {
                btn.addEventListener('click', (e) => this.handleWidgetAction(e, widget.id));
            });
        },

        // Create chart
        createChart: function(widget) {
            const canvas = document.getElementById(`chart-${widget.id}`);
            if (!canvas || !window.Chart) return;

            const ctx = canvas.getContext('2d');
            
            // Generate sample data based on field
            const data = this.generateSampleData(widget.field, widget.type);
            
            this.state.charts[widget.id] = new Chart(ctx, {
                type: widget.type,
                data: data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: widget.title
                        }
                    }
                }
            });
        },

        // Generate sample data
        generateSampleData: function(field, type) {
            // Try to use real parsed data if available
            if (window.Analytics && window.Analytics.state.parsedFiles && window.AnalyticsParser) {
                const parsedFiles = window.Analytics.state.parsedFiles;
                const firstFile = Object.values(parsedFiles)[0];
                
                if (firstFile) {
                    // Try to find the field in parsed data
                    if (firstFile.type !== 'pdf' && firstFile.data) {
                        const fieldData = firstFile.data.map(row => row[field]).filter(v => v !== null);
                        if (fieldData.length > 0) {
                            // Use real data from parsed file
                            return window.AnalyticsParser.prepareChartData(firstFile, field, field, type);
                        }
                    }
                }
            }
            
            // Fallback to generated sample data
            const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
            const data = labels.map(() => Math.floor(Math.random() * 100) + 20);
            
            if (type === 'pie' || type === 'doughnut') {
                return {
                    labels: ['North', 'South', 'East', 'West'],
                    datasets: [{
                        data: [30, 25, 20, 25],
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.8)',
                            'rgba(54, 162, 235, 0.8)',
                            'rgba(255, 205, 86, 0.8)',
                            'rgba(75, 192, 192, 0.8)'
                        ]
                    }]
                };
            }
            
            return {
                labels: labels,
                datasets: [{
                    label: field,
                    data: data,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: type === 'line' ? 'transparent' : 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1
                }]
            };
        },

        // Handle widget actions
        handleWidgetAction: function(e, widgetId) {
            const action = e.currentTarget.dataset.action;
            
            switch(action) {
                case 'expand':
                    this.expandWidget(widgetId);
                    break;
                case 'config':
                    this.configureWidget(widgetId);
                    break;
                case 'remove':
                    this.removeWidget(widgetId);
                    break;
            }
        },

        // Initialize widget actions
        initializeWidgetActions: function() {
            document.querySelectorAll('.widget-action').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const widget = e.target.closest('.viz-widget');
                    if (widget) {
                        this.handleWidgetAction(e, widget.dataset.widgetId);
                    }
                });
            });
        },

        // Remove widget
        removeWidget: function(widgetId) {
            const widget = document.querySelector(`[data-widget-id="${widgetId}"]`);
            if (widget) {
                widget.remove();
                
                // Remove from state
                this.state.widgets = this.state.widgets.filter(w => w.id !== widgetId);
                
                // Destroy chart
                if (this.state.charts[widgetId]) {
                    this.state.charts[widgetId].destroy();
                    delete this.state.charts[widgetId];
                }
            }
        },

        // Generate AI insights
        generateInsights: async function() {
            const insightsTab = document.getElementById('insights-tab');
            const aiInsights = insightsTab.querySelector('.ai-insights');
            
            // Show loading
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'loading';
            loadingDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating insights...';
            aiInsights.appendChild(loadingDiv);
            
            try {
                const insights = await this.fetchAIInsights();
                loadingDiv.remove();
                
                // Add new insights
                insights.forEach(insight => {
                    const insightDiv = document.createElement('div');
                    insightDiv.className = 'insight-item';
                    insightDiv.innerHTML = `
                        <i class="fas ${insight.icon}"></i>
                        <p>${insight.text}</p>
                    `;
                    aiInsights.insertBefore(insightDiv, aiInsights.lastElementChild);
                });
            } catch (error) {
                console.error('Error generating insights:', error);
                loadingDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> Failed to generate insights';
            }
        },

        // Fetch AI insights
        fetchAIInsights: async function() {
            const config = window.config || {};
            const apiUrl = config.API_URL || 'http://192.168.1.7:4545';
            
            try {
                const response = await fetch(`${apiUrl}/v1/chat/completions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: '30b-a3b',
                        messages: [
                            { 
                                role: 'system', 
                                content: 'You are a data analyst. Generate 2-3 brief, specific insights about business data trends. Format each insight as a single sentence.'
                            },
                            { 
                                role: 'user', 
                                content: 'Generate insights about current sales and revenue trends.'
                            }
                        ],
                        temperature: 0.7,
                        max_tokens: 200
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    const insights = result.choices[0].message.content.split('\n').filter(i => i.trim());
                    return insights.map(text => ({
                        icon: text.includes('increase') || text.includes('growth') ? 'fa-chart-line' : 'fa-info-circle',
                        text: text.trim()
                    }));
                }
            } catch (error) {
                console.error('AI insights error:', error);
            }
            
            // Fallback insights
            return [
                { icon: 'fa-chart-line', text: 'Customer acquisition cost decreased by 15% this quarter.' },
                { icon: 'fa-info-circle', text: 'Mobile traffic now accounts for 68% of total visits.' }
            ];
        },

        // Initialize charts
        initializeCharts: function() {
            const canvas = document.getElementById('suite-chart-1');
            if (canvas && window.Chart) {
                const ctx = canvas.getContext('2d');
                this.state.charts['suite-chart-1'] = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                        datasets: [{
                            label: 'Revenue',
                            data: [65, 68, 72, 78, 85, 92],
                            borderColor: 'rgb(75, 192, 192)',
                            tension: 0.1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false
                    }
                });
            }
        },

        // Apply filters
        applyFilters: function() {
            const startDate = document.getElementById('filter-start-date').value;
            const endDate = document.getElementById('filter-end-date').value;
            
            if (startDate && endDate) {
                const filter = {
                    type: 'dateRange',
                    start: startDate,
                    end: endDate
                };
                
                this.state.filters.push(filter);
                this.updateActiveFilters();
                this.refreshCharts();
            }
        },

        // Update active filters display
        updateActiveFilters: function() {
            const filtersSection = document.querySelector('.filters-section');
            const activeFilters = filtersSection.querySelector('.filter-item');
            
            // Update display
            this.refreshData();
        },

        // Refresh data
        refreshData: function() {
            // Show refresh animation
            const refreshBtn = document.querySelector('.refresh-data-btn i');
            if (refreshBtn) {
                refreshBtn.classList.add('fa-spin');
                
                setTimeout(() => {
                    refreshBtn.classList.remove('fa-spin');
                    
                    // Update last refresh time
                    const lastRefresh = document.querySelector('.last-refresh');
                    if (lastRefresh) {
                        lastRefresh.innerHTML = '<i class="fas fa-sync"></i> Last refresh: just now';
                    }
                    
                    // Refresh all charts
                    this.refreshCharts();
                }, 1000);
            }
        },

        // Refresh all charts
        refreshCharts: function() {
            Object.values(this.state.charts).forEach(chart => {
                if (chart && chart.data) {
                    // Update with new random data
                    chart.data.datasets.forEach(dataset => {
                        dataset.data = dataset.data.map(() => Math.floor(Math.random() * 100) + 20);
                    });
                    chart.update();
                }
            });
        },

        // Export dashboard
        exportDashboard: function() {
            const exportOptions = ['PDF', 'Excel', 'PowerPoint'];
            const selected = prompt(`Export as:\n${exportOptions.join('\n')}`);
            
            if (selected) {
                alert(`Exporting dashboard as ${selected}...`);
                // In a real implementation, this would generate the export
            }
        },

        // Share dashboard
        shareDashboard: function() {
            const shareLink = `${window.location.origin}/analytics/shared/${Date.now()}`;
            prompt('Share this link:', shareLink);
        },

        // Initialize panel resizing
        initializePanelResizing: function() {
            // This would implement draggable panel borders for resizing
            // For now, we'll use CSS flex for responsive sizing
        },

        // Load context from side panel
        loadContext: function() {
            // Transfer any relevant state from the side panel
            if (window.Analytics && window.Analytics.state.parsedFiles) {
                const parsedFiles = window.Analytics.state.parsedFiles;
                
                // Update data sources list
                const sourcesList = document.querySelector('.data-sources-list');
                if (sourcesList) {
                    // Clear existing demo sources
                    const demoSources = sourcesList.querySelectorAll('.source-item');
                    demoSources.forEach(item => item.remove());
                    
                    // Add parsed files as data sources
                    Object.entries(parsedFiles).forEach(([fileName, parsedData], index) => {
                        const sourceDiv = document.createElement('div');
                        sourceDiv.className = 'source-item' + (index === 0 ? ' active' : '');
                        sourceDiv.innerHTML = `
                            <i class="fas fa-file-${parsedData.type === 'pdf' ? 'pdf' : 'excel'}"></i>
                            <span>${fileName}</span>
                            <button class="source-action"><i class="fas fa-ellipsis-v"></i></button>
                        `;
                        sourcesList.insertBefore(sourceDiv, sourcesList.querySelector('.add-source-btn'));
                    });
                }
                
                // Update available fields based on first parsed file
                const firstFile = Object.values(parsedFiles)[0];
                if (firstFile && firstFile.type !== 'pdf') {
                    const fieldsList = document.querySelector('.fields-list');
                    if (fieldsList) {
                        fieldsList.innerHTML = '';
                        
                        // Add fields from parsed data
                        const fields = firstFile.headers || Object.keys(firstFile.data[0] || {});
                        fields.forEach(field => {
                            const fieldDiv = document.createElement('div');
                            fieldDiv.className = 'field-item';
                            fieldDiv.draggable = true;
                            
                            // Determine icon based on field type
                            let icon = 'fas fa-font';
                            if (firstFile.summary && firstFile.summary.columns[field]) {
                                if (firstFile.summary.columns[field].type === 'numeric') {
                                    icon = 'fas fa-hashtag';
                                } else if (firstFile.summary.dateColumns.includes(field)) {
                                    icon = 'fas fa-calendar';
                                }
                            }
                            
                            fieldDiv.innerHTML = `<i class="${icon}"></i> ${field}`;
                            fieldsList.appendChild(fieldDiv);
                            
                            // Re-initialize drag handlers
                            fieldDiv.addEventListener('dragstart', (e) => this.handleDragStart(e));
                            fieldDiv.addEventListener('dragend', (e) => this.handleDragEnd(e));
                        });
                    }
                }
            }
        },

        // Generate report view
        generateReport: function() {
            const dashboardGrid = document.getElementById('dashboard-grid');
            dashboardGrid.innerHTML = `
                <div class="report-view">
                    <h2>Analytics Report</h2>
                    <div class="report-section">
                        <h3>Executive Summary</h3>
                        <p>This report provides a comprehensive analysis of key business metrics for Q2 2024.</p>
                    </div>
                    <div class="report-section">
                        <h3>Key Findings</h3>
                        <ul>
                            <li>Revenue increased by 23% compared to Q1</li>
                            <li>Customer acquisition cost decreased by 15%</li>
                            <li>North American markets show strongest growth</li>
                        </ul>
                    </div>
                    <div class="report-section">
                        <h3>Visualizations</h3>
                        <p>See attached charts and graphs for detailed analysis.</p>
                    </div>
                    <button class="export-report-btn" onclick="AnalyticsSuite.exportDashboard()">
                        <i class="fas fa-download"></i> Export Report
                    </button>
                </div>
            `;
        },

        // Add new visualization
        addVisualization: function() {
            if (this.state.currentMode !== 'dashboard') {
                this.switchViewMode('dashboard');
            }
            
            const chartType = this.state.selectedChart || 'line';
            const widget = {
                id: `widget-${Date.now()}`,
                field: 'Custom Metric',
                type: chartType,
                title: 'New Visualization'
            };
            
            this.state.widgets.push(widget);
            this.addWidgetToDashboard(widget);
        },

        // Clear canvas
        clearCanvas: function() {
            if (confirm('Clear all visualizations?')) {
                const dashboardGrid = document.getElementById('dashboard-grid');
                dashboardGrid.innerHTML = '';
                
                // Clear state
                this.state.widgets = [];
                Object.values(this.state.charts).forEach(chart => chart.destroy());
                this.state.charts = {};
            }
        },

        // Configure widget
        configureWidget: function(widgetId) {
            // Switch to config tab
            this.switchTab('config');
            
            // Load widget configuration
            const widget = this.state.widgets.find(w => w.id === widgetId);
            if (widget) {
                document.getElementById('chart-title').value = widget.title;
            }
        },

        // Expand widget
        expandWidget: function(widgetId) {
            const widget = document.querySelector(`[data-widget-id="${widgetId}"]`);
            if (widget) {
                widget.classList.toggle('expanded');
                
                // Update chart size
                if (this.state.charts[widgetId]) {
                    setTimeout(() => {
                        this.state.charts[widgetId].resize();
                    }, 300);
                }
            }
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => AnalyticsSuite.init());
    } else {
        AnalyticsSuite.init();
    }

    // Update Analytics module to open suite
    if (window.Analytics) {
        window.Analytics.openFullSuite = function() {
            AnalyticsSuite.openSuite();
        };
    }
})();