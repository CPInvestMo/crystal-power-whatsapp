/**
 * WhatsApp Business API Client - LEAD CAPTURE MODE
 * Crystal Intelligence Supply-Demand Matching System
 * 
 * IMPORTANT: This system CAPTURES LEADS, does NOT send automated responses
 * 
 * Handles:
 * - Authentication and webhook setup
 * - Incoming message processing (lead capture)
 * - Manual message sending (human agent only)
 * - Lead data extraction and analysis
 * - Supply-demand matching triggers
 * - Human agent notifications
 */

class WhatsAppAPI {
    constructor() {
        this.baseURL = 'https://graph.facebook.com/v18.0';
        this.accessToken = 'vVXQWz4HTIRk__TfdjMCgSRzNFLq8rWXT92_aQjS'; // Crystal Power Investments
        this.phoneNumberId = '1302132225247452'; // Crystal Power Business Phone ID
        this.businessPhone = '+201005288884'; // Crystal Power Business Phone
        this.businessAccountId = null;
        this.webhookVerifyToken = 'crystal_power_verify_token_2025';
        this.isConnected = false;
        this.messageQueue = [];
        this.rateLimitCount = 0;
        this.rateLimitWindow = 60000; // 1 minute
        this.maxMessagesPerMinute = 80;
        this.retryAttempts = 3;
        this.webhookSecret = null;
        
        // Event listeners
        this.onMessageReceived = null;
        this.onConnectionStatusChange = null;
        this.onError = null;
        
        // Initialize rate limiting
        this.initRateLimiting();
        
        // Group message handling
        this.groupsManager = null; // Will be set by app.js
        
        console.log('[WhatsApp API] Client initialized');
    }

    /**
     * Initialize rate limiting mechanism
     */
    initRateLimiting() {
        setInterval(() => {
            this.rateLimitCount = 0;
        }, this.rateLimitWindow);
    }

    /**
     * Setup WhatsApp Business API connection
     * @param {Object} config - Configuration object
     * @param {string} config.accessToken - Facebook Graph API access token
     * @param {string} config.phoneNumberId - WhatsApp phone number ID
     * @param {string} config.businessAccountId - Business account ID
     * @param {string} config.webhookVerifyToken - Webhook verification token
     * @param {string} config.webhookSecret - Webhook secret for signature verification
     */
    async setup(config) {
        try {
            console.log('[WhatsApp API] Setting up connection...');
            
            this.accessToken = config.accessToken;
            this.phoneNumberId = config.phoneNumberId;
            this.businessAccountId = config.businessAccountId;
            this.webhookVerifyToken = config.webhookVerifyToken;
            this.webhookSecret = config.webhookSecret;

            // Verify credentials
            const isValid = await this.verifyCredentials();
            
            if (isValid) {
                this.isConnected = true;
                console.log('[WhatsApp API] Successfully connected to WhatsApp Business API');
                
                // Notify connection status change
                if (this.onConnectionStatusChange) {
                    this.onConnectionStatusChange(true);
                }
                
                return { success: true, message: 'WhatsApp Business API connected successfully' };
            } else {
                throw new Error('Invalid credentials provided');
            }
        } catch (error) {
            console.error('[WhatsApp API] Setup failed:', error);
            this.isConnected = false;
            
            if (this.onConnectionStatusChange) {
                this.onConnectionStatusChange(false);
            }
            
            if (this.onError) {
                this.onError('setup', error);
            }
            
            return { success: false, error: error.message };
        }
    }

    /**
     * Verify API credentials
     */
    async verifyCredentials() {
        try {
            const response = await fetch(`${this.baseURL}/${this.phoneNumberId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('[WhatsApp API] Credentials verified:', data);
                return true;
            } else {
                const error = await response.json();
                console.error('[WhatsApp API] Credential verification failed:', error);
                return false;
            }
        } catch (error) {
            console.error('[WhatsApp API] Error verifying credentials:', error);
            return false;
        }
    }

    /**
     * MANUAL MESSAGE SENDING (Human Agent Only)
     * This system does NOT send automated responses
     * @param {string} to - Recipient phone number
     * @param {string} message - Message text (human composed)
     * @param {boolean} preview_url - Whether to preview URLs
     */
    async sendManualMessage(to, message, preview_url = true) {
        if (!this.isConnected) {
            throw new Error('WhatsApp API not connected');
        }

        // Check rate limiting
        if (this.rateLimitCount >= this.maxMessagesPerMinute) {
            console.warn('[WhatsApp API] Rate limit exceeded, queuing message');
            return this.queueMessage('text', { to, message, preview_url });
        }

        try {
            const payload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: to,
                type: 'text',
                text: {
                    body: message,
                    preview_url: preview_url
                }
            };

            const response = await this.makeAPIRequest('POST', `/${this.phoneNumberId}/messages`, payload);
            
            if (response.success) {
                this.rateLimitCount++;
                console.log('[WhatsApp API] Manual message sent successfully (human agent):', response.data);
                return response.data;
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            console.error('[WhatsApp API] Failed to send message:', error);
            throw error;
        }
    }

    /**
     * Send a template message
     * @param {string} to - Recipient phone number
     * @param {string} templateName - Template name
     * @param {string} languageCode - Language code (e.g., 'en_US')
     * @param {Array} components - Template components
     */
    async sendTemplate(to, templateName, languageCode = 'en_US', components = []) {
        if (!this.isConnected) {
            throw new Error('WhatsApp API not connected');
        }

        // Check rate limiting
        if (this.rateLimitCount >= this.maxMessagesPerMinute) {
            console.warn('[WhatsApp API] Rate limit exceeded, queuing template');
            return this.queueMessage('template', { to, templateName, languageCode, components });
        }

        try {
            const payload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: to,
                type: 'template',
                template: {
                    name: templateName,
                    language: {
                        code: languageCode
                    },
                    components: components
                }
            };

            const response = await this.makeAPIRequest('POST', `/${this.phoneNumberId}/messages`, payload);
            
            if (response.success) {
                this.rateLimitCount++;
                console.log('[WhatsApp API] Template sent successfully:', response.data);
                return response.data;
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            console.error('[WhatsApp API] Failed to send template:', error);
            throw error;
        }
    }

    /**
     * Send an interactive message (buttons, lists, etc.)
     * @param {string} to - Recipient phone number
     * @param {Object} interactive - Interactive message object
     */
    async sendInteractive(to, interactive) {
        if (!this.isConnected) {
            throw new Error('WhatsApp API not connected');
        }

        // Check rate limiting
        if (this.rateLimitCount >= this.maxMessagesPerMinute) {
            console.warn('[WhatsApp API] Rate limit exceeded, queuing interactive message');
            return this.queueMessage('interactive', { to, interactive });
        }

        try {
            const payload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: to,
                type: 'interactive',
                interactive: interactive
            };

            const response = await this.makeAPIRequest('POST', `/${this.phoneNumberId}/messages`, payload);
            
            if (response.success) {
                this.rateLimitCount++;
                console.log('[WhatsApp API] Interactive message sent successfully:', response.data);
                return response.data;
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            console.error('[WhatsApp API] Failed to send interactive message:', error);
            throw error;
        }
    }

    /**
     * Send media (image, document, audio, video)
     * @param {string} to - Recipient phone number
     * @param {string} type - Media type (image, document, audio, video)
     * @param {Object} media - Media object with id or link
     * @param {string} caption - Optional caption
     */
    async sendMedia(to, type, media, caption = null) {
        if (!this.isConnected) {
            throw new Error('WhatsApp API not connected');
        }

        // Check rate limiting
        if (this.rateLimitCount >= this.maxMessagesPerMinute) {
            console.warn('[WhatsApp API] Rate limit exceeded, queuing media message');
            return this.queueMessage('media', { to, type, media, caption });
        }

        try {
            const payload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: to,
                type: type,
                [type]: media
            };

            // Add caption if provided
            if (caption && ['image', 'document', 'video'].includes(type)) {
                payload[type].caption = caption;
            }

            const response = await this.makeAPIRequest('POST', `/${this.phoneNumberId}/messages`, payload);
            
            if (response.success) {
                this.rateLimitCount++;
                console.log('[WhatsApp API] Media sent successfully:', response.data);
                return response.data;
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            console.error('[WhatsApp API] Failed to send media:', error);
            throw error;
        }
    }

    /**
     * Mark message as read
     * @param {string} messageId - Message ID to mark as read
     */
    async markAsRead(messageId) {
        if (!this.isConnected) {
            throw new Error('WhatsApp API not connected');
        }

        try {
            const payload = {
                messaging_product: 'whatsapp',
                status: 'read',
                message_id: messageId
            };

            const response = await this.makeAPIRequest('POST', `/${this.phoneNumberId}/messages`, payload);
            
            if (response.success) {
                console.log('[WhatsApp API] Message marked as read:', messageId);
                return response.data;
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            console.error('[WhatsApp API] Failed to mark message as read:', error);
            throw error;
        }
    }

    /**
     * Process webhook data
     * @param {Object} data - Webhook payload
     */
    async processWebhook(data) {
        try {
            console.log('[WhatsApp API] Processing webhook:', JSON.stringify(data, null, 2));

            // Verify webhook data structure
            if (!data.entry || !Array.isArray(data.entry)) {
                console.warn('[WhatsApp API] Invalid webhook structure');
                return;
            }

            for (const entry of data.entry) {
                if (entry.changes) {
                    for (const change of entry.changes) {
                        if (change.field === 'messages' && change.value) {
                            await this.processMessageWebhook(change.value);
                        } else if (change.field === 'message_template_status_update') {
                            await this.processTemplateStatusUpdate(change.value);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('[WhatsApp API] Error processing webhook:', error);
            if (this.onError) {
                this.onError('webhook', error);
            }
        }
    }

    /**
     * Process message webhook for LEAD CAPTURE (NO AUTO-RESPONSES)
     * @param {Object} value - Webhook value object
     */
    async processMessageWebhook(value) {
        try {
            // Process received messages for lead extraction
            if (value.messages) {
                for (const message of value.messages) {
                    console.log('[WhatsApp API] LEAD CAPTURE - New message received:', message);
                    
                    // Mark message as read (but don't auto-respond)
                    await this.markAsRead(message.id);
                    
                    // Process message for lead data extraction
                    const leadData = await this.extractLeadFromMessage(message, value.contacts);
                    
                    // Trigger supply-demand matching (no auto-response)
                    if (this.onMessageReceived && leadData) {
                        console.log('[WhatsApp API] Triggering lead analysis and matching...');
                        this.onMessageReceived(leadData);
                    }
                }
            }

            // Process message statuses (delivered, read, etc.)
            if (value.statuses) {
                for (const status of value.statuses) {
                    console.log('[WhatsApp API] Message status update:', status);
                    // Handle status updates if needed
                }
            }
        } catch (error) {
            console.error('[WhatsApp API] Error processing message webhook:', error);
        }
    }

    /**
     * Extract lead information from incoming message (NO AUTO-RESPONSE)
     * @param {Object} message - Message object
     * @param {Array} contacts - Contacts array
     * @param {Object} context - Additional context (groups, etc.)
     */
    async extractLeadFromMessage(message, contacts = [], context = {}) {
        try {
            const contact = contacts.find(c => c.wa_id === message.from) || { profile: { name: 'Unknown' } };
            
            // Detect if this is a group message
            const isGroupMessage = this.isGroupMessage(message, context);
            
            const processedMessage = {
                id: message.id,
                from: message.from,
                timestamp: new Date(parseInt(message.timestamp) * 1000),
                contact: {
                    name: contact.profile?.name || 'Unknown',
                    wa_id: message.from
                },
                type: message.type,
                data: null,
                // Group context
                isGroup: isGroupMessage,
                groupInfo: isGroupMessage ? this.extractGroupInfo(context) : null
            };

            // Extract message content based on type
            switch (message.type) {
                case 'text':
                    processedMessage.data = {
                        text: message.text.body
                    };
                    break;
                    
                case 'image':
                    processedMessage.data = {
                        id: message.image.id,
                        mime_type: message.image.mime_type,
                        sha256: message.image.sha256,
                        caption: message.image.caption || null
                    };
                    break;
                    
                case 'document':
                    processedMessage.data = {
                        id: message.document.id,
                        filename: message.document.filename,
                        mime_type: message.document.mime_type,
                        sha256: message.document.sha256,
                        caption: message.document.caption || null
                    };
                    break;
                    
                case 'audio':
                    processedMessage.data = {
                        id: message.audio.id,
                        mime_type: message.audio.mime_type,
                        sha256: message.audio.sha256,
                        voice: message.audio.voice || false
                    };
                    break;
                    
                case 'video':
                    processedMessage.data = {
                        id: message.video.id,
                        mime_type: message.video.mime_type,
                        sha256: message.video.sha256,
                        caption: message.video.caption || null
                    };
                    break;
                    
                case 'location':
                    processedMessage.data = {
                        latitude: message.location.latitude,
                        longitude: message.location.longitude,
                        name: message.location.name || null,
                        address: message.location.address || null
                    };
                    break;
                    
                case 'contacts':
                    processedMessage.data = {
                        contacts: message.contacts
                    };
                    break;
                    
                case 'interactive':
                    if (message.interactive.type === 'button_reply') {
                        processedMessage.data = {
                            button_reply: {
                                id: message.interactive.button_reply.id,
                                title: message.interactive.button_reply.title
                            }
                        };
                    } else if (message.interactive.type === 'list_reply') {
                        processedMessage.data = {
                            list_reply: {
                                id: message.interactive.list_reply.id,
                                title: message.interactive.list_reply.title,
                                description: message.interactive.list_reply.description || null
                            }
                        };
                    }
                    break;
                    
                default:
                    console.warn('[WhatsApp API] Unknown message type:', message.type);
                    processedMessage.data = message;
            }

            console.log('[WhatsApp API] Processed message:', processedMessage);
            return processedMessage;
            
        } catch (error) {
            console.error('[WhatsApp API] Error processing incoming message:', error);
            return null;
        }
    }

    /**
     * Process template status updates
     * @param {Object} value - Template status update value
     */
    async processTemplateStatusUpdate(value) {
        try {
            console.log('[WhatsApp API] Template status update:', value);
            // Handle template status updates if needed
        } catch (error) {
            console.error('[WhatsApp API] Error processing template status update:', error);
        }
    }

    /**
     * Queue message for later sending (rate limiting)
     * @param {string} type - Message type
     * @param {Object} data - Message data
     */
    async queueMessage(type, data) {
        const queuedMessage = {
            id: Date.now() + Math.random(),
            type: type,
            data: data,
            timestamp: new Date(),
            attempts: 0
        };

        this.messageQueue.push(queuedMessage);
        console.log('[WhatsApp API] Message queued:', queuedMessage.id);

        // Process queue after delay
        setTimeout(() => this.processMessageQueue(), 5000);
        
        return { queued: true, id: queuedMessage.id };
    }

    /**
     * Process queued messages
     */
    async processMessageQueue() {
        if (this.messageQueue.length === 0 || this.rateLimitCount >= this.maxMessagesPerMinute) {
            return;
        }

        const message = this.messageQueue.shift();
        
        try {
            let result;
            
            switch (message.type) {
                case 'text':
                    result = await this.sendMessage(message.data.to, message.data.message, message.data.preview_url);
                    break;
                case 'template':
                    result = await this.sendTemplate(message.data.to, message.data.templateName, message.data.languageCode, message.data.components);
                    break;
                case 'interactive':
                    result = await this.sendInteractive(message.data.to, message.data.interactive);
                    break;
                case 'media':
                    result = await this.sendMedia(message.data.to, message.data.type, message.data.media, message.data.caption);
                    break;
                default:
                    throw new Error(`Unknown queued message type: ${message.type}`);
            }
            
            console.log('[WhatsApp API] Queued message sent successfully:', message.id, result);
            
        } catch (error) {
            console.error('[WhatsApp API] Failed to send queued message:', message.id, error);
            
            // Retry logic
            message.attempts++;
            if (message.attempts < this.retryAttempts) {
                console.log('[WhatsApp API] Retrying queued message:', message.id, 'Attempt:', message.attempts);
                this.messageQueue.unshift(message); // Put back at front
            } else {
                console.error('[WhatsApp API] Max retry attempts reached for queued message:', message.id);
            }
        }

        // Continue processing queue
        if (this.messageQueue.length > 0) {
            setTimeout(() => this.processMessageQueue(), 1000);
        }
    }

    /**
     * Make API request to Facebook Graph API
     * @param {string} method - HTTP method
     * @param {string} endpoint - API endpoint
     * @param {Object} payload - Request payload
     */
    async makeAPIRequest(method, endpoint, payload = null) {
        try {
            const options = {
                method: method,
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            };

            if (payload && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
                options.body = JSON.stringify(payload);
            }

            const response = await fetch(`${this.baseURL}${endpoint}`, options);
            const data = await response.json();

            if (response.ok) {
                return { success: true, data: data };
            } else {
                console.error('[WhatsApp API] API request failed:', data);
                return { success: false, error: data.error?.message || 'API request failed' };
            }
        } catch (error) {
            console.error('[WhatsApp API] Network error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get media URL
     * @param {string} mediaId - Media ID
     */
    async getMediaUrl(mediaId) {
        try {
            const response = await this.makeAPIRequest('GET', `/${mediaId}`);
            
            if (response.success) {
                return response.data.url;
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            console.error('[WhatsApp API] Failed to get media URL:', error);
            throw error;
        }
    }

    /**
     * Download media
     * @param {string} mediaUrl - Media URL
     */
    async downloadMedia(mediaUrl) {
        try {
            const response = await fetch(mediaUrl, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (response.ok) {
                return await response.blob();
            } else {
                throw new Error('Failed to download media');
            }
        } catch (error) {
            console.error('[WhatsApp API] Failed to download media:', error);
            throw error;
        }
    }

    /**
     * Verify webhook signature
     * @param {string} signature - X-Hub-Signature-256 header
     * @param {string} payload - Raw webhook payload
     */
    verifyWebhookSignature(signature, payload) {
        if (!this.webhookSecret) {
            console.warn('[WhatsApp API] No webhook secret configured');
            return true; // Allow if no secret is configured
        }

        try {
            const crypto = require('crypto');
            const expectedSignature = 'sha256=' + crypto
                .createHmac('sha256', this.webhookSecret)
                .update(payload)
                .digest('hex');
            
            return signature === expectedSignature;
        } catch (error) {
            console.error('[WhatsApp API] Error verifying webhook signature:', error);
            return false;
        }
    }

    /**
     * Get connection status
     */
    getConnectionStatus() {
        return {
            connected: this.isConnected,
            phoneNumberId: this.phoneNumberId,
            businessAccountId: this.businessAccountId,
            queueLength: this.messageQueue.length,
            rateLimitCount: this.rateLimitCount,
            maxMessagesPerMinute: this.maxMessagesPerMinute
        };
    }

    /**
     * Disconnect from WhatsApp API
     */
    disconnect() {
        this.isConnected = false;
        this.accessToken = null;
        this.phoneNumberId = null;
        this.businessAccountId = null;
        this.messageQueue = [];
        
        console.log('[WhatsApp API] Disconnected from WhatsApp Business API');
        
        if (this.onConnectionStatusChange) {
            this.onConnectionStatusChange(false);
        }
    }

    /**
     * Set groups manager
     * @param {WhatsAppGroups} groupsManager - Groups manager instance
     */
    setGroupsManager(groupsManager) {
        this.groupsManager = groupsManager;
        console.log('[WhatsApp API] Groups manager set');
    }

    /**
     * Check if message is from a group
     * @param {Object} message - WhatsApp message
     * @param {Object} context - Additional context from webhook
     */
    isGroupMessage(message, context) {
        try {
            // WhatsApp groups have specific indicators:
            // 1. Message from field contains group suffix
            // 2. Context contains group information
            // 3. Message has group-specific metadata
            
            // Check if message.from indicates group (usually ends with @g.us)
            if (message.from && message.from.includes('@g.us')) {
                return true;
            }
            
            // Check context for group information
            if (context && (context.group_id || context.group || context.chat_type === 'group')) {
                return true;
            }
            
            // Check for group metadata in message
            if (message.context && message.context.group_id) {
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('[WhatsApp API] Error checking if group message:', error);
            return false;
        }
    }

    /**
     * Extract group information from context
     * @param {Object} context - Webhook context
     */
    extractGroupInfo(context) {
        try {
            const groupInfo = {
                id: null,
                subject: null,
                description: null,
                participants: [],
                admins: []
            };

            // Extract from various possible context structures
            if (context.group_id) {
                groupInfo.id = context.group_id;
            }
            
            if (context.group) {
                groupInfo.id = context.group.id || groupInfo.id;
                groupInfo.subject = context.group.subject || context.group.name;
                groupInfo.description = context.group.description;
                groupInfo.participants = context.group.participants || [];
            }

            // If we have message context
            if (context.message && context.message.context) {
                const msgContext = context.message.context;
                groupInfo.id = msgContext.group_id || groupInfo.id;
            }

            return groupInfo;
        } catch (error) {
            console.error('[WhatsApp API] Error extracting group info:', error);
            return null;
        }
    }

    /**
     * Enhanced message processing that handles groups
     * @param {Object} value - Webhook value object
     */
    async processMessageWebhook(value) {
        try {
            // Process received messages
            if (value.messages) {
                for (const message of value.messages) {
                    console.log('[WhatsApp API] Received message:', message);
                    
                    // Check if this is a group message
                    const isGroup = this.isGroupMessage(message, value);
                    
                    if (isGroup) {
                        console.log('[WhatsApp API] Group message detected');
                        
                        // Process with groups manager if available
                        if (this.groupsManager) {
                            const groupInfo = this.extractGroupInfo(value);
                            const groupResult = await this.groupsManager.processGroupMessage(message, groupInfo);
                            
                            // If groups manager processed it, use that result
                            if (groupResult) {
                                console.log('[WhatsApp API] Group message processed by groups manager');
                                
                                // Notify with group-processed message
                                if (this.onMessageReceived) {
                                    this.onMessageReceived({
                                        ...message,
                                        isGroup: true,
                                        groupInfo: groupInfo,
                                        aiResult: groupResult
                                    });
                                }
                                continue;
                            }
                        }
                    }
                    
                    // Mark message as read (for individual chats)
                    if (!isGroup) {
                        await this.markAsRead(message.id);
                    }
                    
                    // Process message based on type
                    const processedMessage = await this.processIncomingMessage(message, value.contacts, value);
                    
                    // Notify message received
                    if (this.onMessageReceived && processedMessage) {
                        this.onMessageReceived(processedMessage);
                    }
                }
            }

            // Process message statuses (delivered, read, etc.)
            if (value.statuses) {
                for (const status of value.statuses) {
                    console.log('[WhatsApp API] Message status update:', status);
                    // Handle status updates if needed
                }
            }
        } catch (error) {
            console.error('[WhatsApp API] Error processing message webhook:', error);
        }
    }

    /**
     * Get available message templates
     */
    async getMessageTemplates() {
        if (!this.isConnected) {
            throw new Error('WhatsApp API not connected');
        }

        try {
            const response = await this.makeAPIRequest('GET', `/${this.businessAccountId}/message_templates`);
            
            if (response.success) {
                console.log('[WhatsApp API] Retrieved message templates:', response.data);
                return response.data.data || [];
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            console.error('[WhatsApp API] Failed to get message templates:', error);
            throw error;
        }
    }

    /**
     * Create message template
     * @param {Object} template - Template configuration
     */
    async createMessageTemplate(template) {
        if (!this.isConnected) {
            throw new Error('WhatsApp API not connected');
        }

        try {
            const response = await this.makeAPIRequest('POST', `/${this.businessAccountId}/message_templates`, template);
            
            if (response.success) {
                console.log('[WhatsApp API] Template created successfully:', response.data);
                return response.data;
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            console.error('[WhatsApp API] Failed to create template:', error);
            throw error;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WhatsAppAPI;
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
    window.WhatsAppAPI = WhatsAppAPI;
}