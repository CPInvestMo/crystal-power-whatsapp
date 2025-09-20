/**
 * Supply-Demand Matching UI Manager
 * Crystal Intelligence WhatsApp Integration System
 * 
 * Core Focus: SUPPLY-DEMAND MATCHING INTERFACE (NO AUTO-RESPONSES)
 * 
 * Manages:
 * - Property inventory dashboard (SUPPLY)
 * - Customer requirements tracking (DEMAND)
 * - Matching results visualization
 * - Agent action recommendations
 * - Lead quality assessment
 * - Real-time matching updates
 */

class UIManager {
    constructor() {
        this.initialized = false;
        this.currentView = 'matching-dashboard';
        this.supplyData = new Map(); // Properties available
        this.demandData = new Map(); // Customer requirements
        this.matchingResults = new Map(); // Current matches
        this.refreshInterval = null;
        this.charts = {};
        this.notifications = [];
        this.settings = {
            autoRefresh: true,
            refreshRate: 10000, // 10 seconds for matching updates
            soundNotifications: true,
            showMatchingScore: true,
            minimumMatchScore: 0.75
        };
        
        // Event callbacks for human agent actions
        this.onContactCustomer = null;
        this.onPropertyUpdate = null;
        this.onMatchingUpdate = null;
        
        console.log('[Supply-Demand UI] Matching Interface Initialized');
    }

    /**
     * Initialize the Supply-Demand Matching UI
     */
    async initialize() {
        try {
            console.log('[Supply-Demand UI] Starting initialization...');
            
            // Initialize components for matching system
            this.initializeEventListeners();
            this.initializeMatchingCharts();
            this.initializeSupplyManagement();
            this.initializeDemandTracking();
            this.initializeActionRecommendations();
            this.setupResponsiveDesign();
            
            // Load initial data
            await this.loadSupplyData();
            await this.loadDemandData();
            await this.loadMatchingResults();
            
            // Start auto-refresh for real-time matching
            if (this.settings.autoRefresh) {
                this.startAutoRefresh();
            }
            
            // Show matching dashboard by default
            this.showMatchingDashboard();
            
            this.initialized = true;
            console.log('[Supply-Demand UI] Initialization completed successfully');
            
        } catch (error) {
            console.error('[Supply-Demand UI] Initialization failed:', error);
            this.showError('Failed to initialize matching interface: ' + error.message);
        }
    }

    /**
     * Initialize event listeners for matching interface
     */
    initializeEventListeners() {
        // Navigation between supply, demand, and matching views
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-view]')) {
                const view = e.target.dataset.view;
                this.switchView(view);
            }
            
            // Property management actions
            if (e.target.matches('[data-action="add-property"]')) {
                this.showAddPropertyModal();
            }
            
            if (e.target.matches('[data-action="edit-property"]')) {
                const propertyId = e.target.dataset.propertyId;
                this.showEditPropertyModal(propertyId);
            }
            
            if (e.target.matches('[data-action="remove-property"]')) {
                const propertyId = e.target.dataset.propertyId;
                this.confirmRemoveProperty(propertyId);
            }
            
            // Customer contact actions
            if (e.target.matches('[data-action="contact-customer"]')) {
                const customerId = e.target.dataset.customerId;
                this.initiateCustomerContact(customerId);
            }
            
            // Matching actions
            if (e.target.matches('[data-action="view-matches"]')) {
                const customerId = e.target.dataset.customerId;
                this.showCustomerMatches(customerId);
            }
            
            if (e.target.matches('[data-action="refresh-matching"]')) {
                this.refreshAllMatching();
            }
            
            // Settings
            if (e.target.matches('[data-action="settings"]')) {
                this.showSettingsModal();
            }
        });

        // Form submissions
        document.addEventListener('submit', (e) => {
            if (e.target.matches('#property-form')) {
                e.preventDefault();
                this.handlePropertyFormSubmit(e.target);
            }
            
            if (e.target.matches('#settings-form')) {
                e.preventDefault();
                this.handleSettingsFormSubmit(e.target);
            }
        });

        // Real-time updates from WhatsApp processor
        document.addEventListener('whatsapp-message', (e) => {
            this.handleIncomingMessage(e.detail);
        });

        // Matching updates from AI processor
        document.addEventListener('matching-update', (e) => {
            this.handleMatchingUpdate(e.detail);
        });
    }

    /**
     * Initialize charts for supply-demand analytics
     */
    initializeMatchingCharts() {
        // Supply vs Demand Overview Chart
        const supplyDemandCtx = document.getElementById('supply-demand-chart');
        if (supplyDemandCtx) {
            this.charts.supplyDemand = new Chart(supplyDemandCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Available Properties', 'Matched Properties', 'Customer Requirements', 'Unmatched Demands'],
                    datasets: [{
                        data: [0, 0, 0, 0],
                        backgroundColor: [
                            '#10B981', // Green for available
                            '#3B82F6', // Blue for matched
                            '#F59E0B', // Amber for requirements
                            '#EF4444'  // Red for unmatched
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Supply vs Demand Overview'
                        }
                    }
                }
            });
        }

        // Matching Success Rate Chart
        const matchingRateCtx = document.getElementById('matching-rate-chart');
        if (matchingRateCtx) {
            this.charts.matchingRate = new Chart(matchingRateCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Matching Success Rate (%)',
                        data: [],
                        borderColor: '#3B82F6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Matching Success Rate Over Time'
                        }
                    }
                }
            });
        }

        // Lead Quality Distribution Chart
        const leadQualityCtx = document.getElementById('lead-quality-chart');
        if (leadQualityCtx) {
            this.charts.leadQuality = new Chart(leadQualityCtx, {
                type: 'bar',
                data: {
                    labels: ['High Quality', 'Medium Quality', 'Low Quality'],
                    datasets: [{
                        label: 'Number of Leads',
                        data: [0, 0, 0],
                        backgroundColor: [
                            '#10B981', // Green for high
                            '#F59E0B', // Amber for medium
                            '#EF4444'  // Red for low
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Lead Quality Distribution'
                        }
                    }
                }
            });
        }
    }

    /**
     * Switch between different views (supply, demand, matching)
     */
    switchView(view) {
        this.currentView = view;
        
        // Hide all views
        document.querySelectorAll('.view-content').forEach(el => {
            el.classList.add('hidden');
        });
        
        // Show selected view
        const targetView = document.getElementById(view);
        if (targetView) {
            targetView.classList.remove('hidden');
        }
        
        // Update navigation
        document.querySelectorAll('[data-view]').forEach(el => {
            el.classList.remove('active', 'bg-blue-100', 'text-blue-700');
        });
        
        document.querySelector(`[data-view="${view}"]`)?.classList.add('active', 'bg-blue-100', 'text-blue-700');
        
        // Load view-specific data
        this.loadViewData(view);
        
        console.log(`[Supply-Demand UI] Switched to ${view} view`);
    }

    /**
     * Show the main matching dashboard
     */
    showMatchingDashboard() {
        this.switchView('matching-dashboard');
        this.updateMatchingDashboard();
    }

    /**
     * Update the matching dashboard with current data
     */
    async updateMatchingDashboard() {
        try {
            // Update statistics cards
            this.updateStatisticsCards();
            
            // Update charts
            this.updateSupplyDemandChart();
            this.updateMatchingRateChart();
            this.updateLeadQualityChart();
            
            // Update recent matches table
            this.updateRecentMatchesTable();
            
            // Update action recommendations
            this.updateActionRecommendations();
            
        } catch (error) {
            console.error('[Supply-Demand UI] Error updating dashboard:', error);
        }
    }

    /**
     * Update statistics cards
     */
    updateStatisticsCards() {
        const stats = this.calculateStatistics();
        
        // Total Properties (Supply)
        this.updateStatCard('total-properties', stats.totalProperties, 'properties');
        
        // Available Properties
        this.updateStatCard('available-properties', stats.availableProperties, 'available');
        
        // Customer Requirements (Demand)
        this.updateStatCard('total-requirements', stats.totalRequirements, 'requirements');
        
        // Active Matches
        this.updateStatCard('active-matches', stats.activeMatches, 'matches');
        
        // Matching Success Rate
        this.updateStatCard('success-rate', `${stats.successRate.toFixed(1)}%`, 'success rate');
        
        // High Priority Actions
        this.updateStatCard('priority-actions', stats.priorityActions, 'urgent actions');
    }

    /**
     * Update individual statistic card
     */
    updateStatCard(cardId, value, label) {
        const card = document.getElementById(cardId);
        if (card) {
            const valueEl = card.querySelector('.stat-value');
            const labelEl = card.querySelector('.stat-label');
            
            if (valueEl) valueEl.textContent = value;
            if (labelEl) labelEl.textContent = label;
        }
    }

    /**
     * Calculate current statistics
     */
    calculateStatistics() {
        const totalProperties = this.supplyData.size;
        const availableProperties = Array.from(this.supplyData.values()).filter(p => p.status === 'available').length;
        const totalRequirements = this.demandData.size;
        
        let activeMatches = 0;
        let excellentMatches = 0;
        let priorityActions = 0;
        
        for (const [customerId, matches] of this.matchingResults) {
            activeMatches += matches.length;
            excellentMatches += matches.filter(m => m.matchScore >= 0.9).length;
            
            // Count priority actions (high-quality leads with good matches)
            const customerReq = this.demandData.get(customerId);
            if (customerReq && matches.length > 0 && matches[0].matchScore >= 0.8) {
                priorityActions++;
            }
        }
        
        const successRate = totalRequirements > 0 ? (activeMatches / totalRequirements) * 100 : 0;
        
        return {
            totalProperties,
            availableProperties,
            totalRequirements,
            activeMatches,
            excellentMatches,
            priorityActions,
            successRate
        };
    }

    /**
     * Update supply vs demand chart
     */
    updateSupplyDemandChart() {
        if (!this.charts.supplyDemand) return;
        
        const stats = this.calculateStatistics();
        const unmatched = stats.totalRequirements - stats.activeMatches;
        
        this.charts.supplyDemand.data.datasets[0].data = [
            stats.availableProperties,
            stats.activeMatches,
            stats.totalRequirements,
            Math.max(0, unmatched)
        ];
        
        this.charts.supplyDemand.update();
    }

    /**
     * Load supply data (properties)
     */
    async loadSupplyData() {
        try {
            // Get properties from AI processor
            if (window.aiProcessor) {
                const properties = window.aiProcessor.getAllPropertyInventory();
                
                this.supplyData.clear();
                properties.forEach(property => {
                    this.supplyData.set(property.id, property);
                });
                
                console.log(`[Supply-Demand UI] Loaded ${properties.length} properties`);
            }
            
            // Update supply view
            this.updateSupplyView();
            
        } catch (error) {
            console.error('[Supply-Demand UI] Error loading supply data:', error);
        }
    }

    /**
     * Load demand data (customer requirements)
     */
    async loadDemandData() {
        try {
            // Get customer requirements from AI processor
            if (window.aiProcessor) {
                const demands = window.aiProcessor.getAllCustomerRequirements();
                
                this.demandData.clear();
                demands.forEach(demand => {
                    this.demandData.set(demand.customerId, demand);
                });
                
                console.log(`[Supply-Demand UI] Loaded ${demands.length} customer requirements`);
            }
            
            // Update demand view
            this.updateDemandView();
            
        } catch (error) {
            console.error('[Supply-Demand UI] Error loading demand data:', error);
        }
    }

    /**
     * Load current matching results
     */
    async loadMatchingResults() {
        try {
            // Get matching results from AI processor
            if (window.aiProcessor) {
                // This would get matching results for all customers
                for (const [customerId, customerData] of this.demandData) {
                    const matches = await window.aiProcessor.findMatchingProperties(
                        customerData.requirements, 
                        customerId
                    );
                    this.matchingResults.set(customerId, matches);
                }
                
                console.log(`[Supply-Demand UI] Loaded matching results for ${this.matchingResults.size} customers`);
            }
            
        } catch (error) {
            console.error('[Supply-Demand UI] Error loading matching results:', error);
        }
    }

    /**
     * Update supply view (property inventory)
     */
    updateSupplyView() {
        const supplyContainer = document.getElementById('supply-properties');
        if (!supplyContainer) return;
        
        const properties = Array.from(this.supplyData.values());
        
        supplyContainer.innerHTML = `
            <div class="mb-4 flex justify-between items-center">
                <h3 class="text-lg font-semibold">Property Inventory (${properties.length})</h3>
                <button data-action="add-property" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                    Add Property
                </button>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${properties.map(property => this.renderPropertyCard(property)).join('')}
            </div>
        `;
    }

    /**
     * Render a property card
     */
    renderPropertyCard(property) {
        const statusColor = property.status === 'available' ? 'green' : 
                          property.status === 'matched' ? 'blue' : 'gray';
        
        return `
            <div class="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-semibold text-gray-900">${property.title || `${property.type} - ${property.location}`}</h4>
                    <span class="px-2 py-1 text-xs rounded-full bg-${statusColor}-100 text-${statusColor}-800">
                        ${property.status}
                    </span>
                </div>
                
                <div class="space-y-1 text-sm text-gray-600">
                    <p><i class="fas fa-map-marker-alt"></i> ${property.location}</p>
                    <p><i class="fas fa-home"></i> ${property.type}</p>
                    <p><i class="fas fa-expand-arrows-alt"></i> ${property.size} sqm</p>
                    <p><i class="fas fa-money-bill-wave"></i> ${property.price?.toLocaleString()} EGP</p>
                    ${property.bedrooms ? `<p><i class="fas fa-bed"></i> ${property.bedrooms} bedrooms</p>` : ''}
                </div>
                
                <div class="mt-4 flex space-x-2">
                    <button data-action="edit-property" data-property-id="${property.id}" 
                            class="flex-1 bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200">
                        Edit
                    </button>
                    <button data-action="remove-property" data-property-id="${property.id}"
                            class="flex-1 bg-red-100 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-200">
                        Remove
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Update demand view (customer requirements)
     */
    updateDemandView() {
        const demandContainer = document.getElementById('demand-requirements');
        if (!demandContainer) return;
        
        const demands = Array.from(this.demandData.values());
        
        demandContainer.innerHTML = `
            <div class="mb-4">
                <h3 class="text-lg font-semibold">Customer Requirements (${demands.length})</h3>
            </div>
            
            <div class="space-y-4">
                ${demands.map(demand => this.renderDemandCard(demand)).join('')}
            </div>
        `;
    }

    /**
     * Render a customer demand card
     */
    renderDemandCard(demand) {
        const matches = this.matchingResults.get(demand.customerId) || [];
        const bestMatch = matches.length > 0 ? matches[0] : null;
        const qualityColor = demand.leadQuality.quality === 'HIGH' ? 'green' : 
                           demand.leadQuality.quality === 'MEDIUM' ? 'amber' : 'red';
        
        return `
            <div class="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <h4 class="font-semibold text-gray-900">Customer ${demand.customerId.substring(0, 8)}...</h4>
                        <span class="px-2 py-1 text-xs rounded-full bg-${qualityColor}-100 text-${qualityColor}-800">
                            ${demand.leadQuality.quality} Quality
                        </span>
                    </div>
                    <div class="text-right">
                        <p class="text-sm text-gray-600">
                            ${matches.length} matches
                        </p>
                        ${bestMatch ? `<p class="text-xs text-blue-600">${Math.round(bestMatch.matchScore * 100)}% match</p>` : ''}
                    </div>
                </div>
                
                <div class="space-y-1 text-sm text-gray-600 mb-3">
                    ${demand.requirements.budget ? `<p><i class="fas fa-money-bill-wave"></i> Budget: ${demand.requirements.budget.amount.toLocaleString()} EGP</p>` : ''}
                    ${demand.requirements.location ? `<p><i class="fas fa-map-marker-alt"></i> Location: ${demand.requirements.location.area}</p>` : ''}
                    ${demand.requirements.propertyType ? `<p><i class="fas fa-home"></i> Type: ${demand.requirements.propertyType.type}</p>` : ''}
                    ${demand.requirements.size ? `<p><i class="fas fa-expand-arrows-alt"></i> Size: ${demand.requirements.size.area} sqm</p>` : ''}
                    ${demand.requirements.intent ? `<p><i class="fas fa-bullseye"></i> Intent: ${demand.requirements.intent.intent}</p>` : ''}
                </div>
                
                <div class="flex space-x-2">
                    <button data-action="view-matches" data-customer-id="${demand.customerId}"
                            class="flex-1 bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200">
                        View Matches (${matches.length})
                    </button>
                    <button data-action="contact-customer" data-customer-id="${demand.customerId}"
                            class="flex-1 bg-green-100 text-green-700 px-3 py-1 rounded text-sm hover:bg-green-200">
                        Contact Customer
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Update action recommendations
     */
    updateActionRecommendations() {
        const actionsContainer = document.getElementById('action-recommendations');
        if (!actionsContainer) return;
        
        const recommendations = this.generateActionRecommendations();
        
        actionsContainer.innerHTML = `
            <div class="mb-4">
                <h3 class="text-lg font-semibold">Recommended Actions</h3>
            </div>
            
            <div class="space-y-3">
                ${recommendations.map(action => this.renderActionRecommendation(action)).join('')}
            </div>
        `;
    }

    /**
     * Generate action recommendations based on current matching state
     */
    generateActionRecommendations() {
        const recommendations = [];
        
        for (const [customerId, demand] of this.demandData) {
            const matches = this.matchingResults.get(customerId) || [];
            
            if (matches.length > 0 && matches[0].matchScore >= 0.9) {
                recommendations.push({
                    type: 'EXCELLENT_MATCH',
                    priority: 'HIGH',
                    customerId: customerId,
                    action: `Contact customer immediately - excellent match found (${Math.round(matches[0].matchScore * 100)}%)`,
                    propertyId: matches[0].propertyId
                });
            } else if (matches.length === 0 && demand.leadQuality.quality === 'HIGH') {
                recommendations.push({
                    type: 'NO_MATCHES_HIGH_QUALITY',
                    priority: 'MEDIUM',
                    customerId: customerId,
                    action: 'High-quality lead with no matches - consider expanding inventory or adjusting search criteria'
                });
            } else if (demand.requirements.urgency === 'high') {
                recommendations.push({
                    type: 'URGENT_REQUIREMENT',
                    priority: 'HIGH',
                    customerId: customerId,
                    action: 'Customer indicated urgent requirements - priority follow-up needed'
                });
            }
        }
        
        return recommendations.sort((a, b) => {
            const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        }).slice(0, 10); // Top 10 recommendations
    }

    /**
     * Render action recommendation
     */
    renderActionRecommendation(action) {
        const priorityColor = action.priority === 'HIGH' ? 'red' : 
                            action.priority === 'MEDIUM' ? 'amber' : 'blue';
        
        return `
            <div class="bg-white rounded-lg shadow-sm p-4 border-l-4 border-${priorityColor}-500">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="flex items-center mb-1">
                            <span class="px-2 py-1 text-xs rounded-full bg-${priorityColor}-100 text-${priorityColor}-800 mr-2">
                                ${action.priority}
                            </span>
                            <span class="text-xs text-gray-500">Customer ${action.customerId.substring(0, 8)}...</span>
                        </div>
                        <p class="text-sm text-gray-900">${action.action}</p>
                    </div>
                    <button data-action="contact-customer" data-customer-id="${action.customerId}"
                            class="ml-4 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                        Take Action
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Handle incoming WhatsApp message (capture requirements, no auto-response)
     */
    handleIncomingMessage(messageData) {
        console.log('[Supply-Demand UI] New message received for analysis:', messageData);
        
        // Show notification for new customer requirement
        this.showNotification({
            type: 'info',
            title: 'New Customer Message',
            message: `Analyzing requirements from ${messageData.sender}`,
            duration: 5000
        });
        
        // Refresh demand data to include new requirements
        setTimeout(() => {
            this.loadDemandData();
            this.loadMatchingResults();
            this.updateMatchingDashboard();
        }, 2000);
    }

    /**
     * Handle matching updates from AI processor
     */
    handleMatchingUpdate(updateData) {
        console.log('[Supply-Demand UI] Matching update received:', updateData);
        
        // Update matching results
        this.matchingResults.set(updateData.customerId, updateData.matches);
        
        // Refresh UI
        this.updateMatchingDashboard();
        
        // Show notification if excellent match found
        if (updateData.matches.length > 0 && updateData.matches[0].matchScore >= 0.9) {
            this.showNotification({
                type: 'success',
                title: 'Excellent Match Found!',
                message: `${Math.round(updateData.matches[0].matchScore * 100)}% match for customer requirements`,
                duration: 10000
            });
        }
    }

    /**
     * Initiate customer contact (human agent action)
     */
    initiateCustomerContact(customerId) {
        const customer = this.demandData.get(customerId);
        const matches = this.matchingResults.get(customerId) || [];
        
        if (!customer) {
            this.showError('Customer data not found');
            return;
        }
        
        // Show contact modal with customer info and matches
        this.showCustomerContactModal(customer, matches);
    }

    /**
     * Show customer contact modal
     */
    showCustomerContactModal(customer, matches) {
        const modalHtml = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
                    <h3 class="text-lg font-semibold mb-4">Contact Customer</h3>
                    
                    <div class="mb-4">
                        <h4 class="font-medium text-gray-900 mb-2">Customer Requirements:</h4>
                        <div class="bg-gray-50 rounded-lg p-3 text-sm">
                            ${this.formatCustomerRequirements(customer.requirements)}
                        </div>
                    </div>
                    
                    ${matches.length > 0 ? `
                        <div class="mb-4">
                            <h4 class="font-medium text-gray-900 mb-2">Matching Properties (${matches.length}):</h4>
                            <div class="space-y-2 max-h-32 overflow-y-auto">
                                ${matches.slice(0, 3).map(match => `
                                    <div class="bg-blue-50 rounded-lg p-2 text-sm">
                                        <div class="flex justify-between items-center">
                                            <span class="font-medium">${match.property.title || match.property.type}</span>
                                            <span class="text-blue-600">${Math.round(match.matchScore * 100)}% match</span>
                                        </div>
                                        <p class="text-gray-600">${match.property.location} - ${match.property.price?.toLocaleString()} EGP</p>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="flex space-x-3 justify-end">
                        <button onclick="this.closest('.fixed').remove()" 
                                class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                            Cancel
                        </button>
                        <button onclick="window.open('https://wa.me/${customer.customerId}', '_blank'); this.closest('.fixed').remove();"
                                class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                            Contact via WhatsApp
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    /**
     * Format customer requirements for display
     */
    formatCustomerRequirements(requirements) {
        const parts = [];
        
        if (requirements.budget) {
            parts.push(`Budget: ${requirements.budget.amount.toLocaleString()} EGP`);
        }
        if (requirements.location) {
            parts.push(`Location: ${requirements.location.area}`);
        }
        if (requirements.propertyType) {
            parts.push(`Type: ${requirements.propertyType.type}`);
        }
        if (requirements.size) {
            parts.push(`Size: ${requirements.size.area} sqm`);
        }
        if (requirements.intent) {
            parts.push(`Intent: ${requirements.intent.intent}`);
        }
        if (requirements.urgency) {
            parts.push(`Urgency: ${requirements.urgency}`);
        }
        
        return parts.join('<br>');
    }

    /**
     * Refresh all matching results
     */
    async refreshAllMatching() {
        console.log('[Supply-Demand UI] Refreshing all matching results...');
        
        this.showNotification({
            type: 'info',
            title: 'Refreshing Matches',
            message: 'Updating all property matches...',
            duration: 3000
        });
        
        await this.loadMatchingResults();
        this.updateMatchingDashboard();
    }

    /**
     * Start auto-refresh for real-time updates
     */
    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        this.refreshInterval = setInterval(async () => {
            if (document.visibilityState === 'visible') {
                await this.loadDemandData();
                await this.loadMatchingResults();
                this.updateMatchingDashboard();
            }
        }, this.settings.refreshRate);
        
        console.log(`[Supply-Demand UI] Auto-refresh started (${this.settings.refreshRate}ms)`);
    }

    /**
     * Show notification
     */
    showNotification(notification) {
        const notificationHtml = `
            <div class="fixed top-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm z-50 notification">
                <div class="flex items-start">
                    <div class="flex-shrink-0">
                        ${notification.type === 'success' ? '<i class="fas fa-check-circle text-green-500"></i>' :
                          notification.type === 'error' ? '<i class="fas fa-exclamation-circle text-red-500"></i>' :
                          '<i class="fas fa-info-circle text-blue-500"></i>'}
                    </div>
                    <div class="ml-3">
                        <p class="text-sm font-medium text-gray-900">${notification.title}</p>
                        <p class="text-sm text-gray-500">${notification.message}</p>
                    </div>
                    <button onclick="this.closest('.notification').remove()" 
                            class="ml-4 text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', notificationHtml);
        
        // Auto-remove after duration
        if (notification.duration) {
            setTimeout(() => {
                const notificationEl = document.querySelector('.notification:last-child');
                if (notificationEl) notificationEl.remove();
            }, notification.duration);
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        this.showNotification({
            type: 'error',
            title: 'Error',
            message: message,
            duration: 8000
        });
    }

    /**
     * Load view-specific data
     */
    async loadViewData(view) {
        switch (view) {
            case 'supply-management':
                await this.loadSupplyData();
                break;
            case 'demand-tracking':
                await this.loadDemandData();
                break;
            case 'matching-dashboard':
                await this.loadMatchingResults();
                this.updateMatchingDashboard();
                break;
        }
    }

    /**
     * Setup responsive design handlers
     */
    setupResponsiveDesign() {
        // Handle mobile menu toggle
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        
        if (mobileMenuBtn && mobileMenu) {
            mobileMenuBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });
        }
        
        // Handle window resize for charts
        window.addEventListener('resize', () => {
            Object.values(this.charts).forEach(chart => {
                if (chart) chart.resize();
            });
        });
    }

    /**
     * Public method to update matching results (called from AI processor)
     */
    updateMatchingResults() {
        this.loadMatchingResults();
        this.updateMatchingDashboard();
    }
}

// Export for use in other modules
window.UIManager = UIManager;