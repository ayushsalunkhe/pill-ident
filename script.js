// MediScan - AI Medicine Analyzer
class MediScan {
    constructor() {
        this.selectedFile = null;
        this.geminiApiKey = 'AIzaSyCE1jtt0YLHgr_mNB_mEbfvYaQlyKKaXZk'; // Replace with your actual API key
        this.openrouterApiKey = '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'; // Replace with your actual API key
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeLucide();
    }

    initializeLucide() {
        // Wait for Lucide to be available
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        } else {
            // Retry after a short delay if Lucide isn't ready yet
            setTimeout(() => {
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }, 100);
        }
    }

    setupEventListeners() {
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('file-input');
        const analyzeBtn = document.getElementById('analyze-btn');
        const changeImageBtn = document.getElementById('change-image-btn');

        // File input handling - only allow click when no file is selected
        uploadArea.addEventListener('click', (e) => {
            // Don't open file dialog if we're clicking on buttons or preview content
            if (e.target.closest('#analyze-btn') || e.target.closest('#change-image-btn') || e.target.closest('#preview-content')) {
                return;
            }
            // Only open file dialog if no file is selected
            if (!this.selectedFile) {
                fileInput.click();
            }
        });
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('border-white/60');
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('border-white/60');
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('border-white/60');
            this.handleFileSelect(e.dataTransfer.files[0]);
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.handleFileSelect(e.target.files[0]);
            }
        });

        analyzeBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering upload area click
            this.analyzeMedicine();
        });

        changeImageBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering upload area click
            fileInput.click();
        });
    }

    handleFileSelect(file) {
        console.log('File selected:', file); // Debug log
        
        if (!file) {
            console.log('No file provided');
            this.showError('No file selected');
            return;
        }
        
        if (!file.type.startsWith('image/')) {
            console.log('Invalid file type:', file.type);
            this.showError('Please select a valid image file (JPG, PNG, WebP)');
            return;
        }

        console.log('File validation passed, setting selectedFile');
        this.selectedFile = file;
        this.showPreview(file);
        this.hideError(); // Clear any previous errors
    }

    showPreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('preview-image').src = e.target.result;
            document.getElementById('file-name').textContent = file.name;
            document.getElementById('upload-content').classList.add('hidden');
            document.getElementById('preview-content').classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }

    async analyzeMedicine() {
        console.log('Analyze medicine called, selectedFile:', this.selectedFile);
        
        if (!this.selectedFile) {
            console.log('No file selected for analysis');
            this.showError('Please select an image file first');
            return;
        }

        console.log('Starting analysis with file:', this.selectedFile.name, 'type:', this.selectedFile.type);
        this.showProgress();
        this.hideResults();
        this.hideError();

        try {
            // Step 1: Extract medicine information using Gemini
            this.updateProgress('image_analysis', 'Analyzing image with AI...', false);
            const extractedInfo = await this.extractWithGemini();
            this.updateProgress('image_analysis', 'Image analysis complete', true);

            // Step 2: Generate search variations
            this.updateProgress('name_generation', 'Generating search variations...', false);
            const searchTerms = this.generateSearchVariations(extractedInfo);
            this.updateProgress('name_generation', 'Search terms generated', true);

            // Step 3: Search FDA database
            this.updateProgress('fda_search', 'Searching FDA database...', false);
            let result = await this.searchFDA(searchTerms);
            
            if (result) {
                this.updateProgress('fda_search', 'Found in FDA database', true);
                result.source = 'fda';
            } else {
                // Step 4: Fallback to OpenRouter
                this.updateProgress('fda_search', 'Not found in FDA database', true);
                this.updateProgress('ai_fallback', 'Using AI fallback for analysis...', false);
                result = await this.analyzeWithOpenRouter(extractedInfo);
                this.updateProgress('ai_fallback', 'AI analysis complete', true);
            }

            this.showResults(result);

        } catch (error) {
            console.error('Analysis error:', error);
            this.showError(error.message || 'Analysis failed. Please try again.');
        }
    }

    async extractWithGemini() {
        const base64Image = await this.fileToBase64(this.selectedFile);
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${this.geminiApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Analyze this medicine package image and extract the following information in JSON format:
{
    "brand_name": "Brand name of the medicine",
    "generic_name": "Generic/scientific name",
    "dosage": "Dosage strength (e.g., 500mg)",
    "manufacturer": "Manufacturer name",
    "form": "Form (tablet, capsule, syrup, etc.)",
    "purpose": "What condition it treats",
    "active_ingredients": ["List of active ingredients"],
    "text_found": "All text visible in the image"
}

If you cannot clearly identify any field, set it to null. Focus on accuracy over completeness.`
                    }, {
                        inline_data: {
                            mime_type: this.selectedFile.type,
                            data: base64Image
                        }
                    }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates[0].content.parts[0].text;
        
        try {
            // Extract JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON found in response');
            }
        } catch (e) {
            // Fallback: return basic info
            return {
                brand_name: null,
                generic_name: null,
                dosage: null,
                manufacturer: null,
                form: null,
                purpose: null,
                active_ingredients: [],
                text_found: text
            };
        }
    }

    generateSearchVariations(extractedInfo) {
        const variations = [];
        
        if (extractedInfo.brand_name) {
            variations.push(extractedInfo.brand_name);
            variations.push(this.normalizeMedicineName(extractedInfo.brand_name));
        }
        
        if (extractedInfo.generic_name) {
            variations.push(extractedInfo.generic_name);
            variations.push(this.normalizeMedicineName(extractedInfo.generic_name));
        }

        // Add common name mappings
        const nameMappings = {
            'acetaminophen': ['paracetamol', 'tylenol'],
            'paracetamol': ['acetaminophen', 'tylenol'],
            'ibuprofen': ['advil', 'motrin'],
            'aspirin': ['bayer', 'bufferin'],
        };

        for (const variation of variations.slice()) {
            const normalized = this.normalizeMedicineName(variation);
            if (nameMappings[normalized]) {
                variations.push(...nameMappings[normalized]);
            }
        }

        return [...new Set(variations.filter(v => v && v.length > 2))];
    }

    normalizeMedicineName(name) {
        if (!name) return '';
        
        return name.toLowerCase()
            .replace(/\b\d+\s*(mg|g|ml|mcg|iu|units?)\b/g, '')
            .replace(/\b(tablet|tab|caps?|capsule|syrup|injection|cream|ointment)\b/g, '')
            .replace(/\b(extended|release|er|sr|xl|cr)\b/g, '')
            .replace(/\s*\([^)]*\)/g, '')
            .replace(/\s*-\s*\d+.*$/g, '')
            .trim();
    }

    async searchFDA(searchTerms) {
        const endpoints = [
            '/label.json',
            '/ndc.json',
            '/drugsfda.json'
        ];
        
        const searchFields = [
            'openfda.brand_name',
            'openfda.generic_name',
            'openfda.substance_name'
        ];

        for (const endpoint of endpoints) {
            for (const field of searchFields) {
                for (const term of searchTerms) {
                    if (!term || term.length < 2) continue;

                    try {
                        const cleanTerm = term.replace(/[^a-zA-Z0-9\s]/g, '').trim();
                        if (!cleanTerm) continue;

                        const url = `https://api.fda.gov/drug${endpoint}?search=${field}:"${encodeURIComponent(cleanTerm)}"&limit=1`;
                        
                        const response = await fetch(url);
                        if (response.ok) {
                            const data = await response.json();
                            if (data.results && data.results.length > 0) {
                                return this.formatFDAResult(data.results[0]);
                            }
                        }
                    } catch (error) {
                        console.warn(`FDA search failed for ${term}:`, error);
                        continue;
                    }
                }
            }
        }

        return null;
    }

    formatFDAResult(result) {
        const openfda = result.openfda || {};
        
        return {
            brand_name: openfda.brand_name?.[0] || null,
            generic_name: openfda.generic_name?.[0] || null,
            manufacturer: openfda.manufacturer_name?.[0] || null,
            purpose: Array.isArray(result.purpose) ? result.purpose[0] : result.purpose || null,
            active_ingredients: openfda.substance_name || [],
            warnings: Array.isArray(result.warnings) ? result.warnings : [result.warnings].filter(Boolean),
            dosage: Array.isArray(result.dosage_and_administration) ? result.dosage_and_administration[0] : result.dosage_and_administration || null,
            form: openfda.product_type?.[0] || null
        };
    }

    async analyzeWithOpenRouter(extractedInfo) {
        const base64Image = await this.fileToBase64(this.selectedFile);
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.openrouterApiKey}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'MediScan',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'mistralai/mistral-small-3.2-24b-instruct:free',
                messages: [{
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: `Based on this extracted information from a medicine package, provide detailed medicine information in JSON format:

Extracted text: ${JSON.stringify(extractedInfo, null, 2)}

Please respond in this exact JSON format:
{
    "brand_name": "Brand name of the medicine",
    "generic_name": "Generic/scientific name", 
    "manufacturer": "Manufacturer name",
    "purpose": "What condition this medicine treats",
    "active_ingredients": ["List of active ingredients"],
    "warnings": ["List of important warnings or side effects"],
    "dosage": "Typical dosage information",
    "form": "Form (tablet, capsule, syrup, etc.)",
    "source": "ai"
}

Focus on providing accurate, helpful information especially for medicines that might not be in US FDA database (like Indian or international medicines).`
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:${this.selectedFile.type};base64,${base64Image}`
                            }
                        }
                    ]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`OpenRouter API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON found in response');
            }
        } catch (e) {
            // Fallback: return basic info from Gemini extraction
            return {
                ...extractedInfo,
                warnings: ['Please consult a healthcare professional before use', 'This information is extracted from the package image and may not be complete'],
                source: 'ai_fallback'
            };
        }
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = error => reject(error);
        });
    }

    showProgress() {
        document.getElementById('progress-section').classList.remove('hidden');
        document.getElementById('progress-steps').innerHTML = '';
    }

    updateProgress(step, message, completed) {
        const progressSteps = document.getElementById('progress-steps');
        
        let stepElement = document.querySelector(`[data-step="${step}"]`);
        if (!stepElement) {
            stepElement = document.createElement('div');
            stepElement.setAttribute('data-step', step);
            stepElement.className = 'flex items-center space-x-3 p-3 bg-white/5 rounded-lg';
            
            const icon = document.createElement('div');
            icon.className = `p-2 rounded-full ${completed ? 'bg-green-500/20 text-green-300' : 'bg-blue-500/20 text-blue-300'}`;
            
             const iconElement = document.createElement('span');
             iconElement.setAttribute('data-lucide', completed ? 'check' : 'loader');
             if (!completed) iconElement.classList.add('animate-spin');
             
             // Fallback text content in case icons don't load
             iconElement.textContent = completed ? '✓' : '⟳';
             iconElement.style.fontSize = '16px';
             iconElement.style.fontWeight = 'bold';
             
             icon.appendChild(iconElement);
             
             // Initialize the icon immediately
             if (typeof lucide !== 'undefined') {
                 lucide.createIcons();
             }
            
            const text = document.createElement('div');
            text.className = 'flex-1 text-white';
            text.innerHTML = `<p class="font-medium">${message}</p>`;
            
            const badge = document.createElement('span');
            badge.className = `px-2 py-1 rounded-full text-xs font-medium ${completed ? 'bg-green-500/20 text-green-300' : 'bg-blue-500/20 text-blue-300'}`;
            badge.textContent = completed ? 'Complete' : 'Processing...';
            
            stepElement.appendChild(icon);
            stepElement.appendChild(text);
            stepElement.appendChild(badge);
            
            progressSteps.appendChild(stepElement);
         } else {
             const icon = stepElement.querySelector('i');
             const text = stepElement.querySelector('p');
             const badge = stepElement.querySelector('span');
             
             if (icon) {
                 const iconElement = icon.querySelector('span, i');
                 if (iconElement) {
                     iconElement.setAttribute('data-lucide', completed ? 'check' : 'loader');
                     iconElement.textContent = completed ? '✓' : '⟳';
                     iconElement.style.fontSize = '16px';
                     iconElement.style.fontWeight = 'bold';
                     if (!completed) iconElement.classList.add('animate-spin');
                 }
                 
                 // Re-initialize the icon
                 if (typeof lucide !== 'undefined') {
                     lucide.createIcons();
                 }
             }
             
             if (text) text.textContent = message;
             if (badge) {
                 badge.textContent = completed ? 'Complete' : 'Processing...';
                 badge.className = `px-2 py-1 rounded-full text-xs font-medium ${completed ? 'bg-green-500/20 text-green-300' : 'bg-blue-500/20 text-blue-300'}`;
             }
         }
        
        this.initializeLucide();
    }

    showResults(result) {
        const resultsSection = document.getElementById('results-section');
        const medicineInfo = document.getElementById('medicine-info');
        const sourceBadge = document.getElementById('source-badge');
        
        // Update source badge
        sourceBadge.textContent = result.source === 'fda' ? 'FDA Database' : 'AI Analysis';
        sourceBadge.className = `px-3 py-1 rounded-full text-sm font-medium ${result.source === 'fda' ? 'bg-green-500/20 text-green-300' : 'bg-blue-500/20 text-blue-300'}`;
        
        // Display medicine information
        medicineInfo.innerHTML = `
            <div class="space-y-4">
                <div>
                    <h4 class="font-semibold text-white/80 mb-1">Brand Name</h4>
                    <p class="text-white">${result.brand_name || 'Not specified'}</p>
                </div>
                <div>
                    <h4 class="font-semibold text-white/80 mb-1">Generic Name</h4>
                    <p class="text-white">${result.generic_name || 'Not specified'}</p>
                </div>
                <div>
                    <h4 class="font-semibold text-white/80 mb-1">Manufacturer</h4>
                    <p class="text-white">${result.manufacturer || 'Not specified'}</p>
                </div>
                <div>
                    <h4 class="font-semibold text-white/80 mb-1">Form</h4>
                    <p class="text-white">${result.form || 'Not specified'}</p>
                </div>
            </div>
            <div class="space-y-4">
                <div>
                    <h4 class="font-semibold text-white/80 mb-1">Dosage</h4>
                    <p class="text-white">${result.dosage || 'Not specified'}</p>
                </div>
                <div>
                    <h4 class="font-semibold text-white/80 mb-1">Purpose</h4>
                    <p class="text-white">${result.purpose || 'Not specified'}</p>
                </div>
                ${result.active_ingredients && result.active_ingredients.length > 0 ? `
                <div>
                    <h4 class="font-semibold text-white/80 mb-2">Active Ingredients</h4>
                    <div class="flex flex-wrap gap-2">
                        ${result.active_ingredients.map(ingredient => 
                            `<span class="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">${ingredient}</span>`
                        ).join('')}
                    </div>
                </div>
                ` : ''}
                ${result.warnings && result.warnings.length > 0 ? `
                <div>
                    <h4 class="font-semibold text-red-300 mb-2 flex items-center">
                        <i data-lucide="alert-triangle" class="w-4 h-4 mr-1"></i>
                        Warnings
                    </h4>
                    <div class="space-y-2">
                        ${result.warnings.map(warning => 
                            `<div class="p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <p class="text-red-200 text-sm">${warning}</p>
                            </div>`
                        ).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
        `;
        
        resultsSection.classList.remove('hidden');
        this.initializeLucide();
    }

    showError(message) {
        document.getElementById('error-message').textContent = message;
        document.getElementById('error-section').classList.remove('hidden');
    }

    hideResults() {
        document.getElementById('results-section').classList.add('hidden');
    }

    hideError() {
        document.getElementById('error-section').classList.add('hidden');
    }

    resetUpload() {
        this.selectedFile = null;
        document.getElementById('upload-content').classList.remove('hidden');
        document.getElementById('preview-content').classList.add('hidden');
        document.getElementById('file-input').value = '';
        this.hideError();
        this.hideResults();
        this.hideProgress();
    }

    hideProgress() {
        document.getElementById('progress-section').classList.add('hidden');
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new MediScan();
});

