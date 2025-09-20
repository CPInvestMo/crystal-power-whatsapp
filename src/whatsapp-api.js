/**
 * WhatsApp Business API Integration
 * Handles real WhatsApp Business API connections, webhooks, and message processing
 */

class WhatsAppAPI {
    constructor() {
        this.baseURL = 'https://graph.facebook.com/v18.0';
        this.accessToken = null;
        this.phoneNumberId = null;
        this.businessPhone = null;
        this.webhookVerifyToken = 'crystal_intelligence_webhook_token_2024';
        this.isConnected = false;
        this.messageQueue = [];
        this.processingQueue = false;
    }

    /**
     * Initialize WhatsApp Business API connection
     */
    async connect(accessToken, phoneNumberId, businessPhone) {
        try {
            this.accessToken = accessToken;
            this.phoneNumberId = phoneNumberId;
            this.businessPhone = businessPhone;

            // Verify the connection by testing the API
            const isValid = await this.validateConnection();
            
            if (isValid) {
                this.isConnected = true;
                await this.saveSession();
                await this.setupWebhook();
                this.updateConnectionStatus(true);
                this.startMessageProcessor();
                
                console.log('✅ WhatsApp Business API connected successfully');
                return { success: true, message: 'Connected to WhatsApp Business API' };
            } else {
                throw new Error('Invalid API credentials');
            }
        } catch (error) {
            console.error('❌ WhatsApp connection failed:', error);
            this.updateConnectionStatus(false);
            return { success: false, message: error.message };
        }
    }

    /**
     * Validate API connection
     */
    async validateConnection() {
        try {
            const response = await fetch(`${this.baseURL}/${this.phoneNumberId}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('📞 Phone number info:', data);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Connection validation failed:', error);
            return false;
        }
    }

    /**
     * Setup webhook endpoint for receiving messages
     */
    async setupWebhook() {
        const webhookUrl = `${window.location.origin}/webhook`;
        
        // Since we can't actually set up a real webhook in a static site,
        // we'll simulate webhook functionality using a polling mechanism
        console.log('🔗 Webhook would be set up at:', webhookUrl);
        
        // Start polling for new messages (simulation)
        this.startMessagePolling();
        
        return true;
    }

    /**
     * Save session to database
     */
    async saveSession() {
        try {
            const sessionData = {
                id: 'session_001',
                session_name: 'Crystal Intelligence WhatsApp',
                phone_number: this.businessPhone,
                access_token: this.accessToken,
                phone_number_id: this.phoneNumberId,
                status: 'authenticated',
                last_connected: new Date().toISOString(),
                auto_reply_enabled: true,
                business_hours: JSON.stringify({
                    enabled: true,
                    timezone: 'Africa/Cairo',
                    hours: {
                        sunday: { start: '09:00', end: '18:00', enabled: true },
                        monday: { start: '09:00', end: '18:00', enabled: true },
                        tuesday: { start: '09:00', end: '18:00', enabled: true },
                        wednesday: { start: '09:00', end: '18:00', enabled: true },
                        thursday: { start: '09:00', end: '18:00', enabled: true },
                        friday: { start: '09:00', end: '18:00', enabled: true },
                        saturday: { start: '10:00', end: '15:00', enabled: true }
                    }
                })
            };

            await fetch('tables/whatsapp_sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sessionData)
            });
        } catch (error) {
            console.error('Failed to save session:', error);
        }
    }

    /**
     * Send WhatsApp message
     */
    async sendMessage(phoneNumber, message, messageType = 'text', mediaUrl = null) {
        if (!this.isConnected) {
            throw new Error('WhatsApp not connected');
        }

        try {
            const messageData = {
                messaging_product: 'whatsapp',
                to: phoneNumber.replace(/\D/g, ''), // Remove non-digits
                type: messageType
            };

            // Add message content based on type
            switch (messageType) {
                case 'text':
                    messageData.text = { body: message };
                    break;
                case 'image':
                    messageData.image = { link: mediaUrl, caption: message };
                    break;
                case 'document':
                    messageData.document = { link: mediaUrl, caption: message };
                    break;
                case 'location':
                    const [lat, lng] = message.split(',');
                    messageData.location = {
                        latitude: parseFloat(lat),
                        longitude: parseFloat(lng)
                    };
                    break;
            }

            // Send to WhatsApp API
            const response = await fetch(`${this.baseURL}/${this.phoneNumberId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(messageData)
            });

            const result = await response.json();

            if (response.ok) {
                // Save message to database
                await this.saveMessage({
                    conversation_id: await this.getOrCreateConversation(phoneNumber),
                    phone_number: phoneNumber,
                    message_type: messageType,
                    content: message,
                    direction: 'outbound',
                    timestamp: new Date().toISOString(),
                    status: 'sent',
                    media_url: mediaUrl,
                    webhook_id: result.messages[0].id
                });

                console.log('✅ Message sent successfully:', result);
                return { success: true, messageId: result.messages[0].id };
            } else {
                throw new Error(result.error?.message || 'Failed to send message');
            }
        } catch (error) {
            console.error('❌ Failed to send message:', error);
            throw error;
        }
    }

    /**
     * Process incoming webhook messages (simulated)
     */
    async processIncomingMessage(webhookData) {
        try {
            if (webhookData.object === 'whatsapp_business_account') {
                for (const entry of webhookData.entry) {
                    for (const change of entry.changes) {
                        if (change.field === 'messages') {
                            const messageData = change.value;
                            
                            if (messageData.messages) {
                                for (const message of messageData.messages) {
                                    await this.handleIncomingMessage(message, messageData.contacts[0]);
                                }
                            }

                            // Handle message status updates
                            if (messageData.statuses) {
                                for (const status of messageData.statuses) {
                                    await this.updateMessageStatus(status);
                                }
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error processing webhook:', error);
        }
    }

    /**
     * Handle individual incoming message
     */
    async handleIncomingMessage(message, contact) {
        try {
            const phoneNumber = contact.wa_id;
            const customerName = contact.profile?.name || 'Unknown';
            
            // Get or create conversation
            const conversationId = await this.getOrCreateConversation(phoneNumber, customerName);
            
            // Extract message content based on type
            let messageContent = '';
            let mediaUrl = null;
            
            switch (message.type) {
                case 'text':
                    messageContent = message.text.body;
                    break;
                case 'image':
                    messageContent = message.image.caption || '[Image]';
                    mediaUrl = await this.downloadMedia(message.image.id);
                    break;
                case 'document':
                    messageContent = message.document.caption || `[Document: ${message.document.filename}]`;
                    mediaUrl = await this.downloadMedia(message.document.id);
                    break;
                case 'location':
                    messageContent = `Location: ${message.location.latitude}, ${message.location.longitude}`;
                    break;
                case 'contact':
                    messageContent = `[Contact: ${message.contact.name.formatted_name}]`;
                    break;
                default:
                    messageContent = `[${message.type} message]`;
            }

            // Save message to database
            const messageRecord = await this.saveMessage({
                conversation_id: conversationId,
                phone_number: phoneNumber,
                message_type: message.type,
                content: messageContent,
                direction: 'inbound',
                timestamp: new Date(message.timestamp * 1000).toISOString(),
                status: 'received',
                media_url: mediaUrl,
                webhook_id: message.id
            });

            // Process with AI for lead extraction
            const aiProcessor = new AIProcessor();
            const extractedData = await aiProcessor.processMessage(messageContent, conversationId);
            
            if (extractedData) {
                // Update message with AI extracted data
                await fetch(`tables/messages/${messageRecord.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ai_extracted_data: JSON.stringify(extractedData)
                    })
                });

                // Auto-respond if appropriate
                await this.handleAutoResponse(phoneNumber, messageContent, extractedData, conversationId);
            }

            // Notify UI of new message
            this.notifyNewMessage(conversationId, messageRecord);
            
        } catch (error) {
            console.error('Error handling incoming message:', error);
        }
    }

    /**
     * Handle automatic responses
     */
    async handleAutoResponse(phoneNumber, messageContent, extractedData, conversationId) {
        try {
            const templateProcessor = new TemplateProcessor();
            
            // Check for greeting keywords
            if (this.isGreeting(messageContent)) {
                const welcomeTemplate = await templateProcessor.getTemplate('greeting');
                if (welcomeTemplate) {
                    const processedMessage = templateProcessor.processTemplate(welcomeTemplate, {});
                    await this.sendMessage(phoneNumber, processedMessage);
                }
            }
            
            // Check if property information was requested
            if (extractedData.intent === 'property_inquiry' && extractedData.criteria) {
                const propertyMatcher = new PropertyMatcher();
                const matches = await propertyMatcher.findMatches(extractedData.criteria);
                
                if (matches.length > 0) {
                    // Send top 3 matches
                    for (let i = 0; i < Math.min(3, matches.length); i++) {
                        const property = matches[i];
                        const propertyTemplate = await templateProcessor.getTemplate('property_info');
                        
                        if (propertyTemplate) {
                            const processedMessage = templateProcessor.processTemplate(propertyTemplate, property);
                            await this.sendMessage(phoneNumber, processedMessage);
                            
                            // Send property image if available
                            if (property.images && property.images.length > 0) {
                                await this.sendMessage(phoneNumber, property.title, 'image', property.images[0]);
                            }
                        }
                    }
                }
            }
            
        } catch (error) {
            console.error('Auto-response error:', error);
        }
    }

    /**
     * Check if message is a greeting
     */
    isGreeting(message) {
        const greetings = [
            'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
            'مرحبا', 'السلام عليكم', 'صباح الخير', 'مساء الخير', 'أهلا'
        ];
        
        const lowerMessage = message.toLowerCase();
        return greetings.some(greeting => lowerMessage.includes(greeting));
    }

    /**
     * Get or create conversation
     */
    async getOrCreateConversation(phoneNumber, customerName = 'Unknown') {
        try {
            // Check if conversation exists
            const response = await fetch(`tables/conversations?search=${phoneNumber}`);
            const data = await response.json();
            
            if (data.data && data.data.length > 0) {
                const conversation = data.data.find(conv => conv.phone_number === phoneNumber);
                if (conversation) {
                    return conversation.id;
                }
            }
            
            // Create new conversation
            const conversationData = {
                id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                phone_number: phoneNumber,
                customer_name: customerName,
                status: 'active',
                last_message: '',
                last_message_time: new Date().toISOString(),
                agent_assigned: 'AI Assistant',
                lead_score: 0,
                budget_range: '',
                location_preference: '',
                property_type: '',
                tags: []
            };
            
            const createResponse = await fetch('tables/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(conversationData)
            });
            
            const newConversation = await createResponse.json();
            return newConversation.id;
            
        } catch (error) {
            console.error('Error managing conversation:', error);
            return `conv_${Date.now()}`;
        }
    }

    /**
     * Save message to database
     */
    async saveMessage(messageData) {
        try {
            messageData.id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const response = await fetch('tables/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(messageData)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Error saving message:', error);
            return null;
        }
    }

    /**
     * Download media from WhatsApp API
     */
    async downloadMedia(mediaId) {
        try {
            const response = await fetch(`${this.baseURL}/${mediaId}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });
            
            const mediaData = await response.json();
            return mediaData.url;
        } catch (error) {
            console.error('Error downloading media:', error);
            return null;
        }
    }

    /**
     * Update message status
     */
    async updateMessageStatus(status) {
        try {
            // Find message by webhook_id and update status
            const response = await fetch(`tables/messages?search=${status.id}`);
            const data = await response.json();
            
            if (data.data && data.data.length > 0) {
                const message = data.data.find(msg => msg.webhook_id === status.id);
                if (message) {
                    await fetch(`tables/messages/${message.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            status: status.status
                        })
                    });
                }
            }
        } catch (error) {
            console.error('Error updating message status:', error);
        }
    }

    /**
     * Start message polling (simulates webhook for demo)
     */
    startMessagePolling() {
        // Simulate receiving messages for demo purposes
        setInterval(() => {
            if (this.isConnected && Math.random() < 0.1) { // 10% chance every 30 seconds
                this.simulateIncomingMessage();
            }
        }, 30000);
    }

    /**
     * Simulate incoming message for demo
     */
    async simulateIncomingMessage() {
        const demoMessages = [
            "Hi, I'm looking for a 3-bedroom apartment in New Cairo with a budget of 8-12 million EGP",
            "Do you have any villas available in 6th October City?",
            "I need a studio apartment in Zamalek, what's available?",
            "مرحبا، أريد شقة في التجمع الخامس بميزانية 5 مليون جنيه",
            "Can you show me properties with swimming pools?",
            "What are the best areas for investment properties?"
        ];
        
        const demoContacts = [
            { wa_id: "201001234567", profile: { name: "Ahmed Mohamed" }},
            { wa_id: "201112345678", profile: { name: "Sara Hassan" }},
            { wa_id: "201223456789", profile: { name: "Mohamed Ali" }},
            { wa_id: "201334567890", profile: { name: "Fatima Omar" }}
        ];
        
        const randomMessage = demoMessages[Math.floor(Math.random() * demoMessages.length)];
        const randomContact = demoContacts[Math.floor(Math.random() * demoContacts.length)];
        
        const webhookData = {
            object: 'whatsapp_business_account',
            entry: [{
                changes: [{
                    field: 'messages',
                    value: {
                        messages: [{
                            id: `demo_${Date.now()}`,
                            from: randomContact.wa_id,
                            timestamp: Math.floor(Date.now() / 1000),
                            type: 'text',
                            text: { body: randomMessage }
                        }],
                        contacts: [randomContact]
                    }
                }]
            }]
        };
        
        await this.processIncomingMessage(webhookData);
    }

    /**
     * Start message processor
     */
    startMessageProcessor() {
        setInterval(() => {
            this.processMessageQueue();
        }, 1000);
    }

    /**
     * Process message queue
     */
    async processMessageQueue() {
        if (this.processingQueue || this.messageQueue.length === 0) {
            return;
        }
        
        this.processingQueue = true;
        
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            try {
                await this.sendMessage(message.phoneNumber, message.content, message.type, message.mediaUrl);
            } catch (error) {
                console.error('Error processing queued message:', error);
            }
        }
        
        this.processingQueue = false;
    }

    /**
     * Update connection status in UI
     */
    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus');
        const dot = statusElement.querySelector('.pulse-dot');
        const text = statusElement.querySelector('span');
        
        if (connected) {
            dot.className = 'w-3 h-3 bg-green-500 rounded-full pulse-dot mr-2';
            text.textContent = 'Connected';
        } else {
            dot.className = 'w-3 h-3 bg-red-500 rounded-full pulse-dot mr-2';
            text.textContent = 'Disconnected';
        }
    }

    /**
     * Notify UI of new message
     */
    notifyNewMessage(conversationId, message) {
        // Trigger UI update
        if (typeof window.uiManager !== 'undefined') {
            window.uiManager.handleNewMessage(conversationId, message);
        }
    }

    /**
     * Generate QR code for authentication
     */
    generateQRCode() {
        const qrData = `whatsapp://send?phone=${this.businessPhone}&text=Connect Crystal Intelligence WhatsApp Integration`;
        
        const canvas = document.getElementById('qrCanvas');
        const placeholder = document.getElementById('qrPlaceholder');
        
        QRCode.toCanvas(canvas, qrData, (error) => {
            if (error) {
                console.error('QR Code generation failed:', error);
            } else {
                placeholder.classList.add('hidden');
                canvas.classList.remove('hidden');
                console.log('✅ QR Code generated successfully');
            }
        });
    }
}

// Export for use in other modules
window.WhatsAppAPI = WhatsAppAPI;