/**
 * Main Application Controller - SUPPLY-DEMAND MATCHING SYSTEM
 * Crystal Intelligence WhatsApp Lead Capture & Property Matching
 * 
 * CORE FUNCTIONALITY: MATCHES SUPPLY WITH DEMAND (NO AUTO-RESPONSES)
 * 
 * Coordinates:
 * - WhatsApp lead capture (incoming messages)
 * - AI-powered requirement extraction
 * - Property inventory management (supply)
 * - Customer requirement tracking (demand)
 * - Intelligent property matching algorithms
 * - Human agent action recommendations
 */"}

class CrystalWhatsAppApp {
    constructor() {
        this.initialized = false;
        this.components = {};
        this.config = {};
        this.dataStore = {
            properties: [],
            conversations: new Map(),
            leads: new Map(),
            templates: new Map(),
            analytics: {}
        };
        
        // Component instances
        this.whatsAppAPI = null;
        this.aiProcessor = null;
        this.uiManager = null;
        this.whatsAppGroups = null;
        
        // Application state
        this.state = {
            connected: false,
            loading: false,
            error: null,
            lastSync: null
        };
        
        console.log('[Crystal WhatsApp App] Application initialized');
    }

    /**
     * Initialize the application
     */
    async initialize() {
        try {
            console.log('[Crystal WhatsApp App] Starting application initialization...');
            
            this.setState({ loading: true });
            
            // Initialize components
            await this.initializeComponents();
            
            // Setup component integration
            this.setupComponentIntegration();
            
            // Load initial data
            await this.loadInitialData();
            
            // Setup periodic tasks
            this.setupPeriodicTasks();
            
            // Setup error handling
            this.setupErrorHandling();
            
            this.initialized = true;
            this.setState({ loading: false, error: null });
            
            console.log('[Crystal WhatsApp App] Application initialization complete');
            
            return { success: true };
            
        } catch (error) {
            console.error('[Crystal WhatsApp App] Initialization failed:', error);
            this.setState({ loading: false, error: error.message });
            
            return { success: false, error: error.message };
        }
    }

    /**
     * Initialize all components
     */
    async initializeComponents() {
        try {
            console.log('[Crystal WhatsApp App] Initializing components...');
            
            // Initialize WhatsApp API
            if (typeof WhatsAppAPI !== 'undefined') {
                this.whatsAppAPI = new WhatsAppAPI();
                console.log('[Crystal WhatsApp App] WhatsApp API component initialized');
            } else {
                throw new Error('WhatsApp API component not available');
            }
            
            // Initialize AI Processor
            if (typeof AIProcessor !== 'undefined') {
                this.aiProcessor = new AIProcessor();
                console.log('[Crystal WhatsApp App] AI Processor component initialized');
            } else {
                throw new Error('AI Processor component not available');
            }
            
            // Initialize UI Manager
            if (typeof UIManager !== 'undefined') {
                this.uiManager = new UIManager();
                await this.uiManager.initialize();
                console.log('[Crystal WhatsApp App] UI Manager component initialized');
            } else {
                throw new Error('UI Manager component not available');
            }

            // Initialize WhatsApp Groups Manager
            if (typeof WhatsAppGroups !== 'undefined') {
                this.whatsAppGroups = new WhatsAppGroups(this.whatsAppAPI, this.aiProcessor);
                console.log('[Crystal WhatsApp App] WhatsApp Groups component initialized');
            } else {
                throw new Error('WhatsApp Groups component not available');
            }
            
            // Initialize Table API schemas
            await this.initializeTableSchemas();
            
            console.log('[Crystal WhatsApp App] All components initialized successfully');
            
        } catch (error) {
            console.error('[Crystal WhatsApp App] Component initialization failed:', error);
            throw error;
        }
    }

    /**
     * Setup integration between components
     */
    setupComponentIntegration() {
        console.log('[Crystal WhatsApp App] Setting up component integration...');
        
        // WhatsApp API event handlers
        if (this.whatsAppAPI) {
            this.whatsAppAPI.onMessageReceived = (message) => {
                this.handleIncomingMessage(message);
            };
            
            this.whatsAppAPI.onConnectionStatusChange = (connected) => {
                this.handleConnectionStatusChange(connected);
            };
            
            this.whatsAppAPI.onError = (type, error) => {
                this.handleComponentError('WhatsApp API', type, error);
            };
        }
        
        // UI Manager event handlers
        if (this.uiManager) {
            this.uiManager.onSetup = (config) => {
                return this.setupWhatsAppConnection(config);
            };
            
            this.uiManager.onMessageSend = (to, message) => {
                return this.sendMessage(to, message);
            };
            
            this.uiManager.onSettingsChange = (settings) => {
                this.handleSettingsChange(settings);
            };
        }
        
        // Set property database for AI Processor
        if (this.aiProcessor) {
            this.aiProcessor.setPropertyDatabase(this.dataStore.properties);
        }

        // Connect groups manager to WhatsApp API
        if (this.whatsAppAPI && this.whatsAppGroups) {
            this.whatsAppAPI.setGroupsManager(this.whatsAppGroups);
        }
        
        console.log('[Crystal WhatsApp App] Component integration setup complete');
    }

    /**
     * Load initial data
     */
    async loadInitialData() {
        try {
            console.log('[Crystal WhatsApp App] Loading initial data...');
            
            // Load properties data
            await this.loadProperties();
            
            // Load conversation history
            await this.loadConversationHistory();
            
            // Load message templates
            await this.loadMessageTemplates();
            
            // Load application settings
            await this.loadSettings();
            
            console.log('[Crystal WhatsApp App] Initial data loaded successfully');
            
        } catch (error) {
            console.error('[Crystal WhatsApp App] Failed to load initial data:', error);
            throw error;
        }
    }

    /**
     * Initialize table schemas for data storage
     */
    async initializeTableSchemas() {
        try {
            console.log('[Crystal WhatsApp App] Initializing table schemas...');
            
            // Conversations table
            await this.createTableSchema('conversations', [
                { name: 'id', type: 'text', description: 'Unique conversation identifier' },
                { name: 'contact_name', type: 'text', description: 'Contact name' },
                { name: 'contact_phone', type: 'text', description: 'Contact phone number' },
                { name: 'stage', type: 'text', description: 'Conversation stage', options: ['initial', 'qualification', 'matching', 'followup'] },
                { name: 'intent', type: 'text', description: 'Last message intent' },
                { name: 'sentiment', type: 'text', description: 'Conversation sentiment', options: ['positive', 'neutral', 'negative'] },
                { name: 'qualified', type: 'bool', description: 'Is lead qualified' },
                { name: 'last_activity', type: 'datetime', description: 'Last activity timestamp' },
                { name: 'message_count', type: 'number', description: 'Total message count' },
                { name: 'lead_data', type: 'rich_text', description: 'Lead information JSON' }
            ]);
            
            // Properties table
            await this.createTableSchema('properties', [
                { name: 'id', type: 'text', description: 'Unique property identifier' },
                { name: 'title', type: 'text', description: 'Property title' },
                { name: 'type', type: 'text', description: 'Property type', options: ['apartment', 'villa', 'office', 'shop', 'land'] },
                { name: 'location', type: 'text', description: 'Property location' },
                { name: 'price', type: 'number', description: 'Property price in EGP' },
                { name: 'area', type: 'number', description: 'Property area in sqm' },
                { name: 'bedrooms', type: 'number', description: 'Number of bedrooms' },
                { name: 'bathrooms', type: 'number', description: 'Number of bathrooms' },
                { name: 'amenities', type: 'array', description: 'Property amenities' },
                { name: 'description', type: 'rich_text', description: 'Property description' },
                { name: 'images', type: 'array', description: 'Property image URLs' },
                { name: 'available', type: 'bool', description: 'Is property available' },
                { name: 'featured', type: 'bool', description: 'Is featured property' }
            ]);
            
            // Messages table
            await this.createTableSchema('messages', [
                { name: 'id', type: 'text', description: 'Unique message identifier' },
                { name: 'conversation_id', type: 'text', description: 'Parent conversation ID' },
                { name: 'from_phone', type: 'text', description: 'Sender phone number' },
                { name: 'message_type', type: 'text', description: 'Message type', options: ['text', 'image', 'document', 'audio', 'video', 'location'] },
                { name: 'content', type: 'rich_text', description: 'Message content' },
                { name: 'timestamp', type: 'datetime', description: 'Message timestamp' },
                { name: 'direction', type: 'text', description: 'Message direction', options: ['incoming', 'outgoing'] },
                { name: 'status', type: 'text', description: 'Message status', options: ['sent', 'delivered', 'read', 'failed'] },
                { name: 'ai_processed', type: 'bool', description: 'Has been processed by AI' },
                { name: 'extracted_data', type: 'rich_text', description: 'AI extracted data JSON' }
            ]);
            
            // Templates table
            await this.createTableSchema('templates', [
                { name: 'id', type: 'text', description: 'Unique template identifier' },
                { name: 'name', type: 'text', description: 'Template name' },
                { name: 'category', type: 'text', description: 'Template category', options: ['greeting', 'followup', 'booking', 'pricing', 'information'] },
                { name: 'content', type: 'rich_text', description: 'Template content' },
                { name: 'variables', type: 'array', description: 'Template variables' },
                { name: 'usage_count', type: 'number', description: 'Usage count' },
                { name: 'active', type: 'bool', description: 'Is template active' }
            ]);
            
            // Analytics table
            await this.createTableSchema('analytics', [
                { name: 'id', type: 'text', description: 'Unique analytics identifier' },
                { name: 'date', type: 'datetime', description: 'Analytics date' },
                { name: 'metric_type', type: 'text', description: 'Metric type', options: ['messages', 'leads', 'conversions', 'response_time'] },
                { name: 'value', type: 'number', description: 'Metric value' },
                { name: 'metadata', type: 'rich_text', description: 'Additional metadata JSON' }
            ]);
            
            console.log('[Crystal WhatsApp App] Table schemas initialized successfully');
            
        } catch (error) {
            console.error('[Crystal WhatsApp App] Failed to initialize table schemas:', error);
            throw error;
        }
    }

    /**
     * Create table schema wrapper
     * @param {string} tableName - Table name
     * @param {Array} fields - Field definitions
     */
    async createTableSchema(tableName, fields) {
        try {
            // Add required ID field if not present
            const hasId = fields.some(field => field.name === 'id');
            if (!hasId) {
                fields.unshift({ name: 'id', type: 'text', description: 'Unique identifier' });
            }
            
            // This would call the TableSchemaUpdate function
            // For now, we'll simulate it
            console.log(`[Crystal WhatsApp App] Creating schema for table: ${tableName}`);
            
            return { success: true };
        } catch (error) {
            console.error(`[Crystal WhatsApp App] Failed to create schema for ${tableName}:`, error);
            throw error;
        }
    }

    /**
     * Setup WhatsApp connection
     * @param {Object} config - WhatsApp configuration
     */
    async setupWhatsAppConnection(config) {
        try {
            console.log('[Crystal WhatsApp App] Setting up WhatsApp connection...');
            
            if (!this.whatsAppAPI) {
                throw new Error('WhatsApp API not initialized');
            }
            
            const result = await this.whatsAppAPI.setup(config);
            
            if (result.success) {
                this.config.whatsapp = config;
                this.setState({ connected: true });
                
                // Save configuration
                await this.saveConfiguration();
                
                console.log('[Crystal WhatsApp App] WhatsApp connection established successfully');
            }
            
            return result;
            
        } catch (error) {
            console.error('[Crystal WhatsApp App] WhatsApp connection setup failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle incoming WhatsApp message
     * @param {Object} message - Incoming message
     */
    async handleIncomingMessage(message) {
        try {
            console.log('[Crystal WhatsApp App] Processing incoming message:', message);
            
            const conversationId = message.from;
            
            // Get or create conversation
            let conversation = this.dataStore.conversations.get(conversationId);
            if (!conversation) {
                conversation = {
                    id: conversationId,
                    contact: message.contact,
                    messages: [],
                    leadInfo: {},
                    stage: 'initial',
                    intent: 'inquiry',
                    sentiment: 'neutral',
                    qualified: false,
                    lastActivity: new Date(),
                    messageCount: 0
                };
                
                this.dataStore.conversations.set(conversationId, conversation);
                
                // Add to UI
                if (this.uiManager) {
                    this.uiManager.addConversation(conversation);
                }
            }
            
            // Add message to conversation
            conversation.messages.push(message);
            conversation.lastActivity = message.timestamp;
            conversation.messageCount++;
            
            // Process message with AI
            if (this.aiProcessor) {
                const aiResult = await this.aiProcessor.processMessage(message, conversationId);
                
                if (aiResult) {
                    // Update conversation with AI insights
                    conversation.leadInfo = { ...conversation.leadInfo, ...aiResult.leadInfo };
                    conversation.stage = aiResult.stage;
                    conversation.intent = aiResult.intent;
                    conversation.sentiment = aiResult.sentiment;
                    conversation.qualified = this.isLeadQualified(conversation.leadInfo);
                    
                    // Send suggested response if available
                    if (aiResult.suggestedResponse && this.config.autoRespond) {
                        await this.sendMessage(message.from, aiResult.suggestedResponse);
                    }
                    
                    // Update UI with AI insights
                    if (this.uiManager) {
                        this.uiManager.updateConversation(conversationId, {
                            leadInfo: conversation.leadInfo,
                            stage: conversation.stage,
                            intent: conversation.intent,
                            sentiment: conversation.sentiment,
                            qualified: conversation.qualified
                        });
                    }
                }
            }
            
            // Update UI with new message
            if (this.uiManager) {
                this.uiManager.addMessage(conversationId, message);
            }
            
            // Save conversation to database
            await this.saveConversation(conversation);
            
            // Save message to database
            await this.saveMessage(message, conversationId);
            
            // Update analytics
            await this.updateAnalytics('messages', 1, { type: 'incoming' });
            
            console.log('[Crystal WhatsApp App] Message processed successfully');
            
        } catch (error) {
            console.error('[Crystal WhatsApp App] Error processing incoming message:', error);
            this.handleError(error, 'message_processing');
        }
    }

    /**
     * Send WhatsApp message
     * @param {string} to - Recipient phone number
     * @param {string} message - Message text
     */
    async sendMessage(to, message) {
        try {
            console.log('[Crystal WhatsApp App] Sending message:', { to, message: message.substring(0, 50) + '...' });
            
            if (!this.whatsAppAPI || !this.state.connected) {
                throw new Error('WhatsApp API not connected');
            }
            
            const result = await this.whatsAppAPI.sendMessage(to, message);
            
            // Create message object for local storage
            const messageObj = {
                id: result.messages?.[0]?.id || Date.now().toString(),
                from: 'system',
                to: to,
                timestamp: new Date(),
                type: 'text',
                data: { text: message },
                direction: 'outgoing',
                status: 'sent'
            };
            
            // Add to conversation
            const conversationId = to;
            const conversation = this.dataStore.conversations.get(conversationId);
            if (conversation) {
                conversation.messages.push(messageObj);
                conversation.lastActivity = new Date();
                conversation.messageCount++;
                
                // Update UI
                if (this.uiManager) {
                    this.uiManager.addMessage(conversationId, messageObj);
                }
                
                // Save to database
                await this.saveMessage(messageObj, conversationId);
            }
            
            // Update analytics
            await this.updateAnalytics('messages', 1, { type: 'outgoing' });
            
            console.log('[Crystal WhatsApp App] Message sent successfully');
            
            return result;
            
        } catch (error) {
            console.error('[Crystal WhatsApp App] Error sending message:', error);
            throw error;
        }
    }

    /**
     * Handle connection status change
     * @param {boolean} connected - Connection status
     */
    handleConnectionStatusChange(connected) {
        console.log('[Crystal WhatsApp App] Connection status changed:', connected);
        
        this.setState({ connected });
        
        if (this.uiManager) {
            this.uiManager.updateConnectionStatus(connected);
        }
        
        if (!connected) {
            this.handleError(new Error('WhatsApp connection lost'), 'connection');
        }
    }

    /**
     * Handle component errors
     * @param {string} component - Component name
     * @param {string} type - Error type
     * @param {Error} error - Error object
     */
    handleComponentError(component, type, error) {
        console.error(`[Crystal WhatsApp App] ${component} error (${type}):`, error);
        
        this.handleError(error, `${component.toLowerCase()}_${type}`);
    }

    /**
     * Handle settings changes
     * @param {Object} settings - New settings
     */
    handleSettingsChange(settings) {
        console.log('[Crystal WhatsApp App] Settings changed:', settings);
        
        this.config = { ...this.config, ui: settings };
        
        // Apply settings changes
        if (settings.autoRespond !== undefined) {
            this.config.autoRespond = settings.autoRespond;
        }
        
        // Save configuration
        this.saveConfiguration();
    }

    /**
     * Load properties data
     */
    async loadProperties() {
        try {
            console.log('[Crystal WhatsApp App] Loading properties...');
            
            // This would typically fetch from the properties table
            // For now, we'll create some sample data
            const sampleProperties = [
                {
                    id: 'prop_1',
                    title: 'Modern Apartment in New Capital',
                    type: 'apartment',
                    location: 'New Administrative Capital',
                    price: 2500000,
                    area: 120,
                    bedrooms: 2,
                    bathrooms: 2,
                    amenities: ['parking', 'gym', 'swimming pool', 'security'],
                    description: 'Beautiful modern apartment with stunning city views',
                    images: [],
                    available: true,
                    featured: true
                },
                {
                    id: 'prop_2',
                    title: 'Luxury Villa in Sheikh Zayed',
                    type: 'villa',
                    location: 'Sheikh Zayed City',
                    price: 8500000,
                    area: 350,
                    bedrooms: 4,
                    bathrooms: 3,
                    amenities: ['garden', 'garage', 'security', 'swimming pool'],
                    description: 'Spacious luxury villa with private garden',
                    images: [],
                    available: true,
                    featured: false
                }
            ];
            
            this.dataStore.properties = sampleProperties;
            
            // Update AI processor
            if (this.aiProcessor) {
                this.aiProcessor.setPropertyDatabase(sampleProperties);
            }
            
            console.log(`[Crystal WhatsApp App] Loaded ${sampleProperties.length} properties`);
            
        } catch (error) {
            console.error('[Crystal WhatsApp App] Error loading properties:', error);
        }
    }

    /**
     * Load conversation history
     */
    async loadConversationHistory() {
        try {
            console.log('[Crystal WhatsApp App] Loading conversation history...');
            
            // This would typically fetch from the conversations table
            // For now, we'll start with empty conversations
            this.dataStore.conversations.clear();
            
            console.log('[Crystal WhatsApp App] Conversation history loaded');
            
        } catch (error) {
            console.error('[Crystal WhatsApp App] Error loading conversation history:', error);
        }
    }

    /**
     * Load message templates
     */
    async loadMessageTemplates() {
        try {
            console.log('[Crystal WhatsApp App] Loading message templates...');
            
            const defaultTemplates = [
                {
                    id: 'greeting',
                    name: 'Welcome Greeting',
                    category: 'greeting',
                    content: "Hello! Welcome to Crystal Intelligence. I'm here to help you find your perfect property. How can I assist you today?",
                    variables: [],
                    usageCount: 0,
                    active: true
                },
                {
                    id: 'followup',
                    name: 'Follow Up',
                    category: 'followup',
                    content: "Thank you for your interest! I'll follow up with you shortly with more property options that match your criteria.",
                    variables: [],
                    usageCount: 0,
                    active: true
                },
                {
                    id: 'booking',
                    name: 'Schedule Viewing',
                    category: 'booking',
                    content: "I'd be happy to schedule a property viewing for you! When would be convenient for you to visit?",
                    variables: [],
                    usageCount: 0,
                    active: true
                }
            ];
            
            defaultTemplates.forEach(template => {
                this.dataStore.templates.set(template.id, template);
            });
            
            console.log(`[Crystal WhatsApp App] Loaded ${defaultTemplates.length} templates`);
            
        } catch (error) {
            console.error('[Crystal WhatsApp App] Error loading templates:', error);
        }
    }

    /**
     * Load application settings
     */
    async loadSettings() {
        try {
            console.log('[Crystal WhatsApp App] Loading settings...');
            
            // Load from localStorage or default settings
            const defaultSettings = {
                autoRespond: false,
                autoRefresh: true,
                refreshRate: 5000,
                soundNotifications: true,
                showTimestamps: true
            };
            
            const savedSettings = localStorage.getItem('crystal_whatsapp_settings');
            this.config = savedSettings ? JSON.parse(savedSettings) : defaultSettings;
            
            console.log('[Crystal WhatsApp App] Settings loaded');
            
        } catch (error) {
            console.error('[Crystal WhatsApp App] Error loading settings:', error);
        }
    }

    /**
     * Save conversation to database
     * @param {Object} conversation - Conversation object
     */
    async saveConversation(conversation) {
        try {
            const data = {
                id: conversation.id,
                contact_name: conversation.contact?.name || '',
                contact_phone: conversation.contact?.wa_id || conversation.id,
                stage: conversation.stage,
                intent: conversation.intent,
                sentiment: conversation.sentiment,
                qualified: conversation.qualified,
                last_activity: conversation.lastActivity,
                message_count: conversation.messageCount,
                lead_data: JSON.stringify(conversation.leadInfo)
            };
            
            // This would use the Table API to save
            console.log('[Crystal WhatsApp App] Conversation saved:', conversation.id);
            
        } catch (error) {
            console.error('[Crystal WhatsApp App] Error saving conversation:', error);
        }
    }

    /**
     * Save message to database
     * @param {Object} message - Message object
     * @param {string} conversationId - Conversation ID
     */
    async saveMessage(message, conversationId) {
        try {
            const data = {
                id: message.id,
                conversation_id: conversationId,
                from_phone: message.from,
                message_type: message.type,
                content: JSON.stringify(message.data),
                timestamp: message.timestamp,
                direction: message.from === 'system' ? 'outgoing' : 'incoming',
                status: message.status || 'received',
                ai_processed: false,
                extracted_data: JSON.stringify({})
            };
            
            // This would use the Table API to save
            console.log('[Crystal WhatsApp App] Message saved:', message.id);
            
        } catch (error) {
            console.error('[Crystal WhatsApp App] Error saving message:', error);
        }
    }

    /**
     * Save configuration
     */
    async saveConfiguration() {
        try {
            localStorage.setItem('crystal_whatsapp_settings', JSON.stringify(this.config));
            console.log('[Crystal WhatsApp App] Configuration saved');
        } catch (error) {
            console.error('[Crystal WhatsApp App] Error saving configuration:', error);
        }
    }

    /**
     * Update analytics
     * @param {string} metricType - Metric type
     * @param {number} value - Metric value
     * @param {Object} metadata - Additional metadata
     */
    async updateAnalytics(metricType, value, metadata = {}) {
        try {
            const data = {
                id: `${metricType}_${Date.now()}`,
                date: new Date(),
                metric_type: metricType,
                value: value,
                metadata: JSON.stringify(metadata)
            };
            
            // This would use the Table API to save
            console.log('[Crystal WhatsApp App] Analytics updated:', metricType, value);
            
        } catch (error) {
            console.error('[Crystal WhatsApp App] Error updating analytics:', error);
        }
    }

    /**
     * Setup periodic tasks
     */
    setupPeriodicTasks() {
        console.log('[Crystal WhatsApp App] Setting up periodic tasks...');
        
        // Analytics collection every 5 minutes
        setInterval(() => {
            this.collectAnalytics();
        }, 5 * 60 * 1000);
        
        // Data synchronization every 30 seconds
        setInterval(() => {
            this.syncData();
        }, 30 * 1000);
        
        // Cleanup old data daily
        setInterval(() => {
            this.cleanupOldData();
        }, 24 * 60 * 60 * 1000);
    }

    /**
     * Setup error handling
     */
    setupErrorHandling() {
        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('[Crystal WhatsApp App] Global error:', event.error);
            this.handleError(event.error, 'global');
        });
        
        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            console.error('[Crystal WhatsApp App] Unhandled rejection:', event.reason);
            this.handleError(new Error(event.reason), 'promise_rejection');
        });
    }

    /**
     * Collect analytics data
     */
    async collectAnalytics() {
        try {
            const now = new Date();
            const hour = now.getHours();
            
            // Count messages in the last hour
            let recentMessages = 0;
            for (const conversation of this.dataStore.conversations.values()) {
                const recentMsgs = (conversation.messages || []).filter(msg => {
                    const msgTime = new Date(msg.timestamp);
                    return (now - msgTime) < 60 * 60 * 1000; // Last hour
                });
                recentMessages += recentMsgs.length;
            }
            
            // Update hourly analytics
            await this.updateAnalytics('messages_hourly', recentMessages, { hour });
            
            // Count qualified leads
            let qualifiedLeads = 0;
            for (const conversation of this.dataStore.conversations.values()) {
                if (this.isLeadQualified(conversation.leadInfo)) {
                    qualifiedLeads++;
                }
            }
            
            await this.updateAnalytics('qualified_leads', qualifiedLeads);
            
        } catch (error) {
            console.error('[Crystal WhatsApp App] Error collecting analytics:', error);
        }
    }

    /**
     * Synchronize data
     */
    async syncData() {
        try {
            if (!this.state.connected) return;
            
            // Sync conversation updates
            // This would typically sync with external systems
            
            this.state.lastSync = new Date();
            
        } catch (error) {
            console.error('[Crystal WhatsApp App] Error syncing data:', error);
        }
    }

    /**
     * Cleanup old data
     */
    async cleanupOldData() {
        try {
            console.log('[Crystal WhatsApp App] Cleaning up old data...');
            
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days ago
            
            // Cleanup old conversations
            for (const [id, conversation] of this.dataStore.conversations.entries()) {
                if (conversation.lastActivity < cutoffDate && !conversation.qualified) {
                    this.dataStore.conversations.delete(id);
                }
            }
            
            console.log('[Crystal WhatsApp App] Old data cleanup complete');
            
        } catch (error) {
            console.error('[Crystal WhatsApp App] Error cleaning up old data:', error);
        }
    }

    /**
     * Handle errors
     * @param {Error} error - Error object
     * @param {string} context - Error context
     */
    handleError(error, context) {
        console.error(`[Crystal WhatsApp App] Error in ${context}:`, error);
        
        this.setState({ error: error.message });
        
        // Show user-friendly error message
        if (this.uiManager) {
            let userMessage = 'An error occurred. Please try again.';
            
            switch (context) {
                case 'connection':
                    userMessage = 'WhatsApp connection lost. Please check your settings.';
                    break;
                case 'message_processing':
                    userMessage = 'Error processing message. Some features may not work correctly.';
                    break;
                case 'setup':
                    userMessage = 'Setup failed. Please check your WhatsApp API credentials.';
                    break;
            }
            
            this.uiManager.showNotification(userMessage, 'error');
        }
        
        // Log error for monitoring
        this.logError(error, context);
    }

    /**
     * Log error for monitoring
     * @param {Error} error - Error object
     * @param {string} context - Error context
     */
    logError(error, context) {
        try {
            const errorLog = {
                timestamp: new Date(),
                context: context,
                message: error.message,
                stack: error.stack,
                state: { ...this.state }
            };
            
            // This would typically send to error monitoring service
            console.log('[Crystal WhatsApp App] Error logged:', errorLog);
            
        } catch (logError) {
            console.error('[Crystal WhatsApp App] Failed to log error:', logError);
        }
    }

    /**
     * Set application state
     * @param {Object} newState - New state values
     */
    setState(newState) {
        this.state = { ...this.state, ...newState };
        console.log('[Crystal WhatsApp App] State updated:', this.state);
    }

    /**
     * Check if lead is qualified
     * @param {Object} leadInfo - Lead information
     */
    isLeadQualified(leadInfo) {
        return !!(leadInfo && leadInfo.budget && leadInfo.location && leadInfo.propertyType);
    }

    /**
     * Get application status
     */
    getStatus() {
        return {
            initialized: this.initialized,
            connected: this.state.connected,
            loading: this.state.loading,
            error: this.state.error,
            lastSync: this.state.lastSync,
            conversations: this.dataStore.conversations.size,
            properties: this.dataStore.properties.length,
            templates: this.dataStore.templates.size
        };
    }

    /**
     * Export conversation data
     * @param {string} conversationId - Conversation ID
     */
    exportConversation(conversationId) {
        try {
            const conversation = this.dataStore.conversations.get(conversationId);
            if (!conversation) {
                throw new Error('Conversation not found');
            }
            
            const exportData = {
                id: conversation.id,
                contact: conversation.contact,
                leadInfo: conversation.leadInfo,
                stage: conversation.stage,
                qualified: conversation.qualified,
                messageCount: conversation.messageCount,
                messages: conversation.messages,
                exportedAt: new Date()
            };
            
            // Create and download file
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `conversation_${conversationId}_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('[Crystal WhatsApp App] Conversation exported:', conversationId);
            
        } catch (error) {
            console.error('[Crystal WhatsApp App] Error exporting conversation:', error);
            throw error;
        }
    }

    /**
     * Cleanup and shutdown
     */
    shutdown() {
        try {
            console.log('[Crystal WhatsApp App] Shutting down application...');
            
            // Disconnect WhatsApp
            if (this.whatsAppAPI) {
                this.whatsAppAPI.disconnect();
            }
            
            // Cleanup UI Manager
            if (this.uiManager) {
                this.uiManager.cleanup();
            }
            
            // Clear intervals
            // (Intervals would be stored in instance variables)
            
            // Save final state
            this.saveConfiguration();
            
            this.initialized = false;
            this.setState({ connected: false, loading: false });
            
            console.log('[Crystal WhatsApp App] Application shutdown complete');
            
        } catch (error) {
            console.error('[Crystal WhatsApp App] Error during shutdown:', error);
        }
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('[Crystal WhatsApp App] DOM ready, initializing application...');
        
        // Create global app instance
        window.crystalWhatsAppApp = new CrystalWhatsAppApp();
        
        // Initialize the application
        const result = await window.crystalWhatsAppApp.initialize();
        
        if (result.success) {
            console.log('[Crystal WhatsApp App] Application ready!');
        } else {
            console.error('[Crystal WhatsApp App] Application initialization failed:', result.error);
        }
        
    } catch (error) {
        console.error('[Crystal WhatsApp App] Critical initialization error:', error);
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CrystalWhatsAppApp;
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
    window.CrystalWhatsAppApp = CrystalWhatsAppApp;
}