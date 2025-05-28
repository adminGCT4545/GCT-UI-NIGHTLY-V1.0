// Analytics Document Parser Module
(function() {
    'use strict';

    // Analytics Parser namespace
    window.AnalyticsParser = {
        // Supported file types
        supportedTypes: {
            excel: ['.xlsx', '.xls'],
            csv: ['.csv'],
            pdf: ['.pdf']
        },

        // Initialize the parser
        init: function() {
            console.log('Initializing Analytics Parser...');
            this.loadParsingLibraries();
        },

        // Load required parsing libraries
        loadParsingLibraries: function() {
            // Load SheetJS for Excel parsing
            if (!window.XLSX) {
                const xlsxScript = document.createElement('script');
                xlsxScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
                xlsxScript.onload = () => console.log('SheetJS loaded successfully');
                document.head.appendChild(xlsxScript);
            }

            // Load PDF.js for PDF parsing
            if (!window.pdfjsLib) {
                const pdfScript = document.createElement('script');
                pdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
                pdfScript.onload = () => {
                    console.log('PDF.js loaded successfully');
                    // Set worker source
                    if (window.pdfjsLib) {
                        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
                            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                    }
                };
                document.head.appendChild(pdfScript);
            }
        },

        // Parse uploaded file
        parseFile: async function(file) {
            const extension = this.getFileExtension(file.name);
            
            try {
                if (this.supportedTypes.excel.includes(extension)) {
                    return await this.parseExcel(file);
                } else if (this.supportedTypes.csv.includes(extension)) {
                    return await this.parseCSV(file);
                } else if (this.supportedTypes.pdf.includes(extension)) {
                    return await this.parsePDF(file);
                } else {
                    throw new Error(`Unsupported file type: ${extension}`);
                }
            } catch (error) {
                console.error('File parsing error:', error);
                throw error;
            }
        },

        // Parse Excel file
        parseExcel: async function(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                
                reader.onload = (e) => {
                    try {
                        if (!window.XLSX) {
                            throw new Error('SheetJS library not loaded');
                        }

                        const data = new Uint8Array(e.target.result);
                        const workbook = window.XLSX.read(data, { type: 'array' });
                        
                        // Parse all sheets
                        const parsedData = {
                            type: 'excel',
                            fileName: file.name,
                            sheets: {},
                            summary: {},
                            rawData: []
                        };

                        workbook.SheetNames.forEach(sheetName => {
                            const worksheet = workbook.Sheets[sheetName];
                            const jsonData = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                            const headers = jsonData[0] || [];
                            const rows = jsonData.slice(1);
                            
                            parsedData.sheets[sheetName] = {
                                headers: headers,
                                data: rows,
                                rowCount: rows.length,
                                columnCount: headers.length
                            };

                            // Convert to objects for easier analysis
                            const objectData = rows.map(row => {
                                const obj = {};
                                headers.forEach((header, index) => {
                                    obj[header] = row[index];
                                });
                                return obj;
                            });

                            parsedData.rawData.push(...objectData);
                        });

                        // Generate summary
                        parsedData.summary = this.generateDataSummary(parsedData.rawData);
                        
                        resolve(parsedData);
                    } catch (error) {
                        reject(error);
                    }
                };

                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsArrayBuffer(file);
            });
        },

        // Parse CSV file
        parseCSV: async function(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                
                reader.onload = (e) => {
                    try {
                        const text = e.target.result;
                        const rows = this.parseCSVText(text);
                        const headers = rows[0] || [];
                        const data = rows.slice(1);
                        
                        // Convert to objects
                        const objectData = data.map(row => {
                            const obj = {};
                            headers.forEach((header, index) => {
                                obj[header] = row[index];
                            });
                            return obj;
                        });

                        const parsedData = {
                            type: 'csv',
                            fileName: file.name,
                            headers: headers,
                            data: objectData,
                            rowCount: data.length,
                            columnCount: headers.length,
                            summary: this.generateDataSummary(objectData)
                        };
                        
                        resolve(parsedData);
                    } catch (error) {
                        reject(error);
                    }
                };

                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsText(file);
            });
        },

        // Parse CSV text
        parseCSVText: function(text) {
            const rows = [];
            const lines = text.split('\n');
            
            for (let line of lines) {
                if (line.trim()) {
                    // Simple CSV parsing (handles basic cases)
                    const row = [];
                    let current = '';
                    let inQuotes = false;
                    
                    for (let i = 0; i < line.length; i++) {
                        const char = line[i];
                        
                        if (char === '"') {
                            inQuotes = !inQuotes;
                        } else if (char === ',' && !inQuotes) {
                            row.push(current.trim());
                            current = '';
                        } else {
                            current += char;
                        }
                    }
                    
                    row.push(current.trim());
                    rows.push(row);
                }
            }
            
            return rows;
        },

        // Parse PDF file
        parsePDF: async function(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                
                reader.onload = async (e) => {
                    try {
                        if (!window.pdfjsLib) {
                            throw new Error('PDF.js library not loaded');
                        }

                        const typedArray = new Uint8Array(e.target.result);
                        const pdf = await window.pdfjsLib.getDocument(typedArray).promise;
                        
                        const parsedData = {
                            type: 'pdf',
                            fileName: file.name,
                            pageCount: pdf.numPages,
                            text: '',
                            tables: [],
                            extractedData: []
                        };

                        // Extract text from all pages
                        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                            const page = await pdf.getPage(pageNum);
                            const textContent = await page.getTextContent();
                            const pageText = textContent.items.map(item => item.str).join(' ');
                            parsedData.text += pageText + '\n';
                        }

                        // Extract tables and structured data
                        parsedData.tables = this.extractTablesFromText(parsedData.text);
                        parsedData.extractedData = this.extractStructuredData(parsedData.text);
                        
                        // Generate summary
                        parsedData.summary = this.generatePDFSummary(parsedData);
                        
                        resolve(parsedData);
                    } catch (error) {
                        reject(error);
                    }
                };

                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsArrayBuffer(file);
            });
        },

        // Extract tables from PDF text
        extractTablesFromText: function(text) {
            const tables = [];
            const lines = text.split('\n');
            let currentTable = [];
            let inTable = false;
            
            for (let line of lines) {
                // Simple heuristic: lines with multiple spaces might be table rows
                if (line.includes('  ') && line.trim().length > 0) {
                    const cells = line.split(/\s{2,}/).filter(cell => cell.trim());
                    if (cells.length > 1) {
                        currentTable.push(cells);
                        inTable = true;
                    }
                } else if (inTable && line.trim().length === 0) {
                    if (currentTable.length > 1) {
                        tables.push({
                            headers: currentTable[0],
                            rows: currentTable.slice(1)
                        });
                    }
                    currentTable = [];
                    inTable = false;
                }
            }
            
            return tables;
        },

        // Extract structured data from PDF text
        extractStructuredData: function(text) {
            const data = [];
            
            // Extract numbers with labels
            const numberPattern = /([A-Za-z\s]+):\s*\$?([0-9,]+\.?\d*)/g;
            let match;
            
            while ((match = numberPattern.exec(text)) !== null) {
                data.push({
                    label: match[1].trim(),
                    value: parseFloat(match[2].replace(/,/g, ''))
                });
            }
            
            // Extract dates
            const datePattern = /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/g;
            const dates = text.match(datePattern) || [];
            
            // Extract percentages
            const percentPattern = /(\d+\.?\d*)\s*%/g;
            const percentages = [];
            
            while ((match = percentPattern.exec(text)) !== null) {
                percentages.push(parseFloat(match[1]));
            }
            
            return {
                metrics: data,
                dates: dates,
                percentages: percentages
            };
        },

        // Generate data summary for Excel/CSV
        generateDataSummary: function(data) {
            if (!data || data.length === 0) return {};
            
            const summary = {
                totalRows: data.length,
                columns: {},
                dateColumns: [],
                numericColumns: []
            };

            // Analyze columns
            const firstRow = data[0];
            Object.keys(firstRow).forEach(column => {
                const values = data.map(row => row[column]).filter(v => v !== null && v !== undefined);
                const numericValues = values.filter(v => !isNaN(parseFloat(v)));
                
                summary.columns[column] = {
                    type: numericValues.length > values.length * 0.8 ? 'numeric' : 'text',
                    uniqueValues: [...new Set(values)].length,
                    nullCount: data.length - values.length
                };

                if (summary.columns[column].type === 'numeric') {
                    const numbers = numericValues.map(v => parseFloat(v));
                    summary.columns[column].min = Math.min(...numbers);
                    summary.columns[column].max = Math.max(...numbers);
                    summary.columns[column].avg = numbers.reduce((a, b) => a + b, 0) / numbers.length;
                    summary.numericColumns.push(column);
                }

                // Check if it's a date column
                if (this.isDateColumn(values)) {
                    summary.dateColumns.push(column);
                }
            });

            return summary;
        },

        // Generate PDF summary
        generatePDFSummary: function(parsedData) {
            return {
                pageCount: parsedData.pageCount,
                textLength: parsedData.text.length,
                tableCount: parsedData.tables.length,
                extractedMetrics: parsedData.extractedData.metrics.length,
                hasFinancialData: parsedData.extractedData.metrics.some(m => 
                    m.label.toLowerCase().includes('revenue') || 
                    m.label.toLowerCase().includes('profit') ||
                    m.label.toLowerCase().includes('cost')
                )
            };
        },

        // Check if column contains dates
        isDateColumn: function(values) {
            const datePattern = /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/;
            const dateCount = values.filter(v => 
                typeof v === 'string' && datePattern.test(v.trim())
            ).length;
            
            return dateCount > values.length * 0.5;
        },

        // Get file extension
        getFileExtension: function(filename) {
            return filename.slice(filename.lastIndexOf('.')).toLowerCase();
        },

        // Validate parsed data
        validateData: function(parsedData) {
            if (!parsedData) {
                throw new Error('No data to validate');
            }

            if (parsedData.type === 'excel' || parsedData.type === 'csv') {
                if (!parsedData.data || parsedData.data.length === 0) {
                    throw new Error('No data rows found in file');
                }
                if (!parsedData.headers || parsedData.headers.length === 0) {
                    throw new Error('No headers found in file');
                }
            }

            if (parsedData.type === 'pdf') {
                if (!parsedData.text || parsedData.text.trim().length === 0) {
                    throw new Error('No text content found in PDF');
                }
            }

            return true;
        },

        // Convert parsed data to chart-ready format
        prepareChartData: function(parsedData, xField, yField, chartType) {
            if (parsedData.type === 'pdf') {
                // For PDFs, use extracted metrics
                const metrics = parsedData.extractedData.metrics;
                return {
                    labels: metrics.map(m => m.label),
                    datasets: [{
                        label: 'Values',
                        data: metrics.map(m => m.value)
                    }]
                };
            }

            // For Excel/CSV
            const data = parsedData.rawData || parsedData.data;
            
            if (chartType === 'pie' || chartType === 'doughnut') {
                // For pie charts, aggregate by category
                const aggregated = {};
                data.forEach(row => {
                    const label = row[xField] || 'Unknown';
                    const value = parseFloat(row[yField]) || 0;
                    aggregated[label] = (aggregated[label] || 0) + value;
                });

                return {
                    labels: Object.keys(aggregated),
                    datasets: [{
                        data: Object.values(aggregated),
                        backgroundColor: this.generateColors(Object.keys(aggregated).length)
                    }]
                };
            }

            // For line/bar charts
            return {
                labels: data.map(row => row[xField]),
                datasets: [{
                    label: yField,
                    data: data.map(row => parseFloat(row[yField]) || 0)
                }]
            };
        },

        // Generate colors for charts
        generateColors: function(count) {
            const colors = [
                'rgba(255, 99, 132, 0.8)',
                'rgba(54, 162, 235, 0.8)',
                'rgba(255, 205, 86, 0.8)',
                'rgba(75, 192, 192, 0.8)',
                'rgba(153, 102, 255, 0.8)',
                'rgba(255, 159, 64, 0.8)'
            ];
            
            const result = [];
            for (let i = 0; i < count; i++) {
                result.push(colors[i % colors.length]);
            }
            return result;
        },

        // Generate analysis prompt for LLM
        generateAnalysisPrompt: function(parsedData) {
            let prompt = `Analyze the following data from ${parsedData.fileName}:\n\n`;
            
            if (parsedData.type === 'pdf') {
                prompt += `Document Type: PDF with ${parsedData.pageCount} pages\n`;
                prompt += `Extracted Metrics:\n`;
                parsedData.extractedData.metrics.forEach(m => {
                    prompt += `- ${m.label}: ${m.value}\n`;
                });
            } else {
                prompt += `Data Type: ${parsedData.type.toUpperCase()}\n`;
                prompt += `Rows: ${parsedData.rowCount}, Columns: ${parsedData.columnCount}\n`;
                prompt += `Columns: ${Object.keys(parsedData.summary.columns).join(', ')}\n`;
                
                if (parsedData.summary.numericColumns.length > 0) {
                    prompt += `\nNumeric Column Statistics:\n`;
                    parsedData.summary.numericColumns.forEach(col => {
                        const stats = parsedData.summary.columns[col];
                        prompt += `- ${col}: Min=${stats.min}, Max=${stats.max}, Avg=${stats.avg.toFixed(2)}\n`;
                    });
                }
            }
            
            prompt += `\nPlease provide insights, trends, and forecasts based on this data.`;
            return prompt;
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => AnalyticsParser.init());
    } else {
        AnalyticsParser.init();
    }
})();