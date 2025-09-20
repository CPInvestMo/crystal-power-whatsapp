/**
 * UI Manager - Handles all user interface interactions and updates
 * Manages conversations, messages, analytics, and real-time updates
 */

class UIManager {
    constructor() {
        this.activeConversationId = null;
        this.conversations = new Map();
        this.messagePollingInterval = null;
        this.analyticsUpdateInterval = null;
        this.isAnalyticsVisible = false;
    }

    /**
     * Initialize UI Manager
     */
    init() {
        this.setupEventListeners();
        this.loadConversations();
        this.startMessagePolling();
        this.startAnalyticsUpdates();
        this.loadTemplates();
    }

    /**
     * Setup event listeners for UI interactions
     */
    setupEventListeners() {
        // Message input handling
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        // Auto-resize message input
        messageInput?.addEventListener('input', (e) => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
        });

        // Conversation search
        this.setupConversationSearch();

        // Real-time updates
        this.setupRealTimeUpdates();
    }

    /**
     * Setup conversation search functionality
     */
    setupConversationSearch() {
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Search conversations...';
        searchInput.className = 'w-full p-2 mb-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent';
        
        const conversationsHeader = document.querySelector('#chatSection .bg-white h3').parentNode;
        conversationsHeader.insertBefore(searchInput, conversationsHeader.children[1]);

        searchInput.addEventListener('input', (e) => {
            this.filterConversations(e.target.value);
        });
    }

    /**
     * Setup real-time updates
     */
    setupRealTimeUpdates() {
        // Listen for browser visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseUpdates();
            } else {
                this.resumeUpdates();
            }
        });

        // Setup notification permissions
        this.requestNotificationPermission();
    }

    /**
     * Request notification permission
     */
    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            console.log('Notification permission:', permission);
        }
    }

    /**
     * Load and display conversations
     */
    async loadConversations() {
        try {
            const response = await fetch('tables/conversations?sort=last_message_time&limit=50');
            const data = await response.json();

            const conversationsList = document.getElementById('conversationsList');
            const conversationCount = document.getElementById('conversationCount');

            if (!data.data || data.data.length === 0) {
                conversationsList.innerHTML = `
                    <div class="text-center text-gray-500 py-8">
                        <i class="fas fa-inbox text-3xl mb-2"></i>
                        <p>No conversations yet</p>
                        <p class="text-sm">Conversations will appear here when customers message you</p>
                    </div>
                `;
                conversationCount.textContent = '0';
                return;
            }

            // Update conversation count
            conversationCount.textContent = data.data.length;

            // Group conversations by status
            const grouped = this.groupConversationsByStatus(data.data);
            
            conversationsList.innerHTML = '';
            
            // Render active conversations first
            if (grouped.active.length > 0) {
                this.renderConversationGroup('Active', grouped.active, conversationsList);
            }
            
            if (grouped.qualified.length > 0) {
                this.renderConversationGroup('Qualified Leads', grouped.qualified, conversationsList);
            }
            
            if (grouped.pending.length > 0) {
                this.renderConversationGroup('Pending', grouped.pending, conversationsList);
            }
            
            if (grouped.closed.length > 0) {
                this.renderConversationGroup('Closed', grouped.closed, conversationsList);
            }

            // Store conversations for quick access
            data.data.forEach(conv => {
                this.conversations.set(conv.id, conv);
            });

        } catch (error) {
            console.error('Error loading conversations:', error);
        }
    }

    /**
     * Group conversations by status
     */
    groupConversationsByStatus(conversations) {
        return conversations.reduce((groups, conv) => {
            const status = conv.status || 'pending';
            if (!groups[status]) groups[status] = [];
            groups[status].push(conv);
            return groups;
        }, { active: [], qualified: [], pending: [], closed: [] });
    }

    /**
     * Render conversation group
     */
    renderConversationGroup(title, conversations, container) {
        if (conversations.length === 0) return;

        const groupDiv = document.createElement('div');
        groupDiv.className = 'mb-4';
        
        groupDiv.innerHTML = `
            <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">${title} (${conversations.length})</h4>
            <div class="space-y-2">
                ${conversations.map(conv => this.renderConversationItem(conv)).join('')}
            </div>
        `;
        
        container.appendChild(groupDiv);
    }

    /**
     * Render individual conversation item
     */
    renderConversationItem(conversation) {
        const timeAgo = this.getTimeAgo(conversation.last_message_time);
        const statusColor = this.getStatusColor(conversation.status);
        const leadScore = conversation.lead_score || 0;
        const scoreColor = this.getScoreColor(leadScore);

        return `
            <div class="conversation-item p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${this.activeConversationId === conversation.id ? 'bg-blue-50 border-blue-300' : ''}"
                 onclick="uiManager.selectConversation('${conversation.id}')">
                <div class="flex items-start justify-between">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center space-x-2">
                            <h5 class="text-sm font-medium text-gray-900 truncate">${conversation.customer_name}</h5>
                            <div class="w-2 h-2 ${statusColor} rounded-full"></div>
                        </div>
                        <p class="text-xs text-gray-600 mt-1">${conversation.phone_number}</p>
                        <p class="text-sm text-gray-700 mt-2 line-clamp-2">${conversation.last_message || 'No messages yet'}</p>
                        <div class="flex items-center justify-between mt-2">
                            <span class="text-xs text-gray-500">${timeAgo}</span>
                            ${leadScore > 0 ? `<span class="text-xs px-2 py-1 ${scoreColor} rounded-full font-medium">${leadScore}%</span>` : ''}
                        </div>
                    </div>
                </div>
                ${conversation.tags && conversation.tags.length > 0 ? `
                    <div class="flex flex-wrap gap-1 mt-2">
                        ${conversation.tags.map(tag => `
                            <span class="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">${tag}</span>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Get status indicator color
     */
    getStatusColor(status) {
        const colors = {
            active: 'bg-green-500',
            qualified: 'bg-blue-500',
            pending: 'bg-yellow-500',
            closed: 'bg-gray-400'
        };
        return colors[status] || 'bg-gray-400';
    }

    /**
     * Get lead score color
     */
    getScoreColor(score) {
        if (score >= 70) return 'bg-green-100 text-green-800';
        if (score >= 40) return 'bg-yellow-100 text-yellow-800';
        return 'bg-gray-100 text-gray-600';
    }

    /**
     * Select and display conversation
     */
    async selectConversation(conversationId) {
        this.activeConversationId = conversationId;
        const conversation = this.conversations.get(conversationId);
        
        if (!conversation) return;

        // Update UI
        this.updateChatHeader(conversation);
        await this.loadMessages(conversationId);
        this.updateConversationSelection();

        // Mark conversation as viewed
        this.markConversationViewed(conversationId);
    }

    /**
     * Update chat header with conversation info
     */
    updateChatHeader(conversation) {
        const nameElement = document.getElementById('activeChatName');
        const phoneElement = document.getElementById('activeChatPhone');
        const scoreElement = document.getElementById('leadScore');

        nameElement.textContent = conversation.customer_name;
        phoneElement.textContent = conversation.phone_number;

        if (conversation.lead_score > 0) {
            scoreElement.textContent = `Lead Score: ${conversation.lead_score}%`;
            scoreElement.className = `${this.getScoreColor(conversation.lead_score)} px-2 py-1 rounded-full text-xs font-medium`;
        } else {
            scoreElement.classList.add('hidden');
        }
    }

    /**
     * Load and display messages for conversation
     */
    async loadMessages(conversationId) {
        try {
            const response = await fetch(`tables/messages?search=${conversationId}&sort=timestamp&limit=100`);
            const data = await response.json();

            const messagesContainer = document.getElementById('messagesContainer');
            
            if (!data.data || data.data.length === 0) {
                messagesContainer.innerHTML = `
                    <div class="text-center text-gray-500 py-8">
                        <i class="fas fa-comment text-3xl mb-2"></i>
                        <p>No messages in this conversation</p>
                        <p class="text-sm">Start the conversation by sending a message</p>
                    </div>
                `;
                return;
            }

            // Filter messages for this conversation and sort by timestamp
            const conversationMessages = data.data
                .filter(msg => msg.conversation_id === conversationId)
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            messagesContainer.innerHTML = '';
            
            // Group messages by date
            const groupedMessages = this.groupMessagesByDate(conversationMessages);
            
            Object.entries(groupedMessages).forEach(([date, messages]) => {
                // Add date separator
                const dateDiv = document.createElement('div');
                dateDiv.className = 'text-center my-4';
                dateDiv.innerHTML = `
                    <span class="text-xs text-gray-500 bg-white px-3 py-1 rounded-full border">${date}</span>
                `;
                messagesContainer.appendChild(dateDiv);
                
                // Add messages
                messages.forEach(message => {
                    const messageElement = this.createMessageElement(message);
                    messagesContainer.appendChild(messageElement);
                });
            });

            // Scroll to bottom
            messagesContainer.scrollTop = messagesContainer.scrollHeight;

        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    /**
     * Group messages by date
     */
    groupMessagesByDate(messages) {
        return messages.reduce((groups, message) => {
            const date = new Date(message.timestamp).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            if (!groups[date]) groups[date] = [];
            groups[date].push(message);
            
            return groups;
        }, {});
    }

    /**
     * Create message element
     */
    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-bubble mb-4 flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`;
        
        const time = new Date(message.timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const statusIcon = this.getMessageStatusIcon(message.status);
        const isOutbound = message.direction === 'outbound';
        
        messageDiv.innerHTML = `
            <div class="max-w-sm lg:max-w-md xl:max-w-lg">
                <div class="${isOutbound ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200'} rounded-lg px-4 py-3 shadow-sm">
                    ${this.renderMessageContent(message)}
                </div>
                <div class="flex ${isOutbound ? 'justify-end' : 'justify-start'} items-center mt-1 space-x-1">
                    <span class="text-xs text-gray-500">${time}</span>
                    ${isOutbound ? statusIcon : ''}
                </div>
            </div>
        `;
        
        return messageDiv;
    }

    /**
     * Render message content based on type
     */
    renderMessageContent(message) {
        switch (message.message_type) {
            case 'image':
                return `
                    ${message.media_url ? `<img src="${message.media_url}" alt="Shared image" class="rounded-lg mb-2 max-w-full">` : ''}
                    <p class="whitespace-pre-wrap">${message.content}</p>
                `;
            case 'document':
                return `
                    <div class="flex items-center space-x-2 mb-2 p-2 bg-gray-100 rounded">
                        <i class="fas fa-file-alt text-gray-600"></i>
                        <span class="text-sm">Document</span>
                        ${message.media_url ? `<a href="${message.media_url}" target="_blank" class="text-blue-600 text-sm">Download</a>` : ''}
                    </div>
                    <p class="whitespace-pre-wrap">${message.content}</p>
                `;
            case 'location':
                return `
                    <div class="flex items-center space-x-2 mb-2">
                        <i class="fas fa-map-marker-alt text-red-500"></i>
                        <span class="text-sm">Location shared</span>
                    </div>
                    <p class="whitespace-pre-wrap">${message.content}</p>
                `;
            default:
                return `<p class="whitespace-pre-wrap">${message.content}</p>`;
        }
    }

    /**
     * Get message status icon
     */
    getMessageStatusIcon(status) {
        const icons = {
            sent: '<i class="fas fa-check text-gray-400 text-xs"></i>',
            delivered: '<i class="fas fa-check-double text-gray-400 text-xs"></i>',
            read: '<i class="fas fa-check-double text-blue-500 text-xs"></i>',
            failed: '<i class="fas fa-exclamation-triangle text-red-500 text-xs"></i>'
        };
        return icons[status] || '';
    }

    /**
     * Send message
     */
    async sendMessage() {
        if (!this.activeConversationId) {
            this.showNotification('Please select a conversation first', 'warning');
            return;
        }

        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();
        
        if (!message) return;

        const conversation = this.conversations.get(this.activeConversationId);
        if (!conversation) return;

        try {
            // Clear input immediately
            messageInput.value = '';
            messageInput.style.height = 'auto';

            // Show sending indicator
            this.showMessageSending(message);

            // Send via WhatsApp API
            const whatsappAPI = window.whatsappAPI;
            if (whatsappAPI && whatsappAPI.isConnected) {
                await whatsappAPI.sendMessage(conversation.phone_number, message);
            } else {
                // Simulate sending for demo
                await this.simulateMessageSend(conversation.id, message);
            }

            // Reload messages
            await this.loadMessages(this.activeConversationId);
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.showNotification('Failed to send message', 'error');
            messageInput.value = message; // Restore message
        }
    }

    /**
     * Show message sending indicator
     */
    showMessageSending(message) {
        const messagesContainer = document.getElementById('messagesContainer');
        const sendingDiv = document.createElement('div');
        sendingDiv.id = 'sendingMessage';
        sendingDiv.className = 'chat-bubble mb-4 flex justify-end';
        sendingDiv.innerHTML = `
            <div class="max-w-sm lg:max-w-md xl:max-w-lg">
                <div class="bg-blue-600 text-white rounded-lg px-4 py-3 shadow-sm opacity-70">
                    <p class="whitespace-pre-wrap">${message}</p>
                </div>
                <div class="flex justify-end items-center mt-1 space-x-1">
                    <span class="text-xs text-gray-500">Sending...</span>
                    <div class="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                </div>
            </div>
        `;
        messagesContainer.appendChild(sendingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    /**
     * Simulate message send for demo
     */
    async simulateMessageSend(conversationId, message) {
        const messageData = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            conversation_id: conversationId,
            phone_number: this.conversations.get(conversationId).phone_number,
            message_type: 'text',
            content: message,
            direction: 'outbound',
            timestamp: new Date().toISOString(),
            status: 'sent'
        };

        await fetch('tables/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messageData)
        });

        // Update conversation
        await fetch(`tables/conversations/${conversationId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                last_message: message,
                last_message_time: new Date().toISOString()
            })
        });
    }

    /**
     * Handle new incoming message
     */
    handleNewMessage(conversationId, message) {
        // Update conversation in memory
        if (this.conversations.has(conversationId)) {
            const conversation = this.conversations.get(conversationId);
            conversation.last_message = message.content;
            conversation.last_message_time = message.timestamp;
        }

        // If this is the active conversation, reload messages
        if (this.activeConversationId === conversationId) {
            this.loadMessages(conversationId);
        }

        // Reload conversation list
        this.loadConversations();

        // Show notification if not active conversation
        if (this.activeConversationId !== conversationId) {
            this.showDesktopNotification(message);
        }

        // Remove sending indicator if exists
        const sendingMessage = document.getElementById('sendingMessage');
        if (sendingMessage) {
            sendingMessage.remove();
        }
    }

    /**
     * Show desktop notification
     */
    showDesktopNotification(message) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const conversation = this.conversations.get(message.conversation_id);
            const customerName = conversation ? conversation.customer_name : 'Customer';
            
            new Notification(`New message from ${customerName}`, {
                body: message.content.substring(0, 100),
                icon: '/favicon.ico',
                tag: message.conversation_id
            });
        }
    }

    /**
     * Filter conversations based on search query
     */
    filterConversations(query) {
        const conversationItems = document.querySelectorAll('.conversation-item');
        const lowerQuery = query.toLowerCase();

        conversationItems.forEach(item => {
            const text = item.textContent.toLowerCase();
            const shouldShow = text.includes(lowerQuery);
            item.style.display = shouldShow ? 'block' : 'none';
        });
    }

    /**
     * Update conversation selection UI
     */
    updateConversationSelection() {
        const conversationItems = document.querySelectorAll('.conversation-item');
        conversationItems.forEach(item => {
            if (item.onclick.toString().includes(this.activeConversationId)) {
                item.classList.add('bg-blue-50', 'border-blue-300');
            } else {
                item.classList.remove('bg-blue-50', 'border-blue-300');
            }
        });
    }

    /**
     * Mark conversation as viewed
     */
    async markConversationViewed(conversationId) {
        // This could be used to mark conversations as read
        // For now, we'll just update the UI
    }

    /**
     * Show message templates modal
     */
    async showTemplates() {
        const modal = document.getElementById('templatesModal');
        const templatesList = document.getElementById('templatesList');
        
        try {
            const response = await fetch('tables/message_templates?limit=20');
            const data = await response.json();
            
            if (!data.data || data.data.length === 0) {
                templatesList.innerHTML = `
                    <div class="text-center text-gray-500 py-8">
                        <i class="fas fa-file-alt text-3xl mb-2"></i>
                        <p>No templates available</p>
                    </div>
                `;
            } else {
                templatesList.innerHTML = data.data.map(template => `
                    <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                         onclick="uiManager.selectTemplate('${template.id}')">
                        <div class="flex justify-between items-start mb-2">
                            <h4 class="font-medium text-gray-900">${template.name}</h4>
                            <span class="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">${template.category}</span>
                        </div>
                        <p class="text-sm text-gray-600 line-clamp-3">${template.content}</p>
                        ${template.usage_count > 0 ? `
                            <div class="mt-2 text-xs text-gray-500">
                                Used ${template.usage_count} times • ${template.success_rate || 0}% success rate
                            </div>
                        ` : ''}
                    </div>
                `).join('');
            }
            
            modal.classList.remove('hidden');
        } catch (error) {
            console.error('Error loading templates:', error);
        }
    }

    /**
     * Select and use template
     */
    async selectTemplate(templateId) {
        try {
            const response = await fetch(`tables/message_templates/${templateId}`);
            const template = await response.json();
            
            if (template) {
                const messageInput = document.getElementById('messageInput');
                messageInput.value = template.content;
                messageInput.focus();
                
                // Update template usage
                await fetch(`tables/message_templates/${templateId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        usage_count: (template.usage_count || 0) + 1
                    })
                });
            }
            
            this.closeTemplates();
        } catch (error) {
            console.error('Error selecting template:', error);
        }
    }

    /**
     * Close templates modal
     */
    closeTemplates() {
        document.getElementById('templatesModal').classList.add('hidden');
    }

    /**
     * Show lead details modal
     */
    async showLeadDetails() {
        if (!this.activeConversationId) return;

        const modal = document.getElementById('leadModal');
        const content = document.getElementById('leadDetailsContent');
        
        try {
            // Get lead data
            const leadResponse = await fetch(`tables/leads?search=${this.activeConversationId}`);
            const leadData = await leadResponse.json();
            const lead = leadData.data?.find(l => l.conversation_id === this.activeConversationId);

            // Get conversation data
            const conversation = this.conversations.get(this.activeConversationId);

            if (!lead && !conversation) {
                content.innerHTML = '<p class="text-gray-500">No lead information available</p>';
                modal.classList.remove('hidden');
                return;
            }

            // Get matched properties if available
            let matchedProperties = [];
            if (lead && lead.matched_properties && lead.matched_properties.length > 0) {
                const propertiesResponse = await fetch('tables/properties?limit=100');
                const propertiesData = await propertiesResponse.json();
                matchedProperties = propertiesData.data?.filter(p => 
                    lead.matched_properties.includes(p.id)
                ) || [];
            }

            content.innerHTML = this.renderLeadDetails(conversation, lead, matchedProperties);
            modal.classList.remove('hidden');
            
        } catch (error) {
            console.error('Error loading lead details:', error);
        }
    }

    /**
     * Render lead details content
     */
    renderLeadDetails(conversation, lead, matchedProperties) {
        const leadScore = conversation?.lead_score || lead?.qualification_score || 0;
        const scoreColor = this.getScoreColor(leadScore);

        return `
            <div class="grid md:grid-cols-2 gap-6">
                <!-- Lead Information -->
                <div class="space-y-4">
                    <h4 class="text-lg font-semibold text-gray-800 border-b pb-2">Lead Information</h4>
                    
                    <div class="space-y-3">
                        <div class="flex justify-between">
                            <span class="text-gray-600">Customer:</span>
                            <span class="font-medium">${conversation?.customer_name || 'Unknown'}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Phone:</span>
                            <span class="font-medium">${conversation?.phone_number || lead?.phone_number || 'N/A'}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Email:</span>
                            <span class="font-medium">${lead?.email || 'N/A'}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Lead Score:</span>
                            <span class="px-2 py-1 rounded-full text-xs font-medium ${scoreColor}">${leadScore}%</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">Stage:</span>
                            <span class="font-medium capitalize">${lead?.stage || 'New'}</span>
                        </div>
                    </div>

                    <!-- Preferences -->
                    <div class="mt-6">
                        <h5 class="font-medium text-gray-800 mb-3">Preferences</h5>
                        <div class="space-y-2">
                            ${conversation?.budget_range || lead?.budget_min ? `
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Budget:</span>
                                    <span class="font-medium">
                                        ${conversation?.budget_range || `${this.formatCurrency(lead.budget_min)} - ${this.formatCurrency(lead.budget_max)}`}
                                    </span>
                                </div>
                            ` : ''}
                            ${conversation?.location_preference || lead?.location_preference ? `
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Location:</span>
                                    <span class="font-medium">${conversation.location_preference || lead.location_preference}</span>
                                </div>
                            ` : ''}
                            ${conversation?.property_type || lead?.property_type ? `
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Property Type:</span>
                                    <span class="font-medium capitalize">${conversation.property_type || lead.property_type}</span>
                                </div>
                            ` : ''}
                            ${lead?.bedrooms ? `
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Bedrooms:</span>
                                    <span class="font-medium">${lead.bedrooms}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Tags -->
                    ${conversation?.tags && conversation.tags.length > 0 ? `
                        <div class="mt-4">
                            <h5 class="font-medium text-gray-800 mb-2">Tags</h5>
                            <div class="flex flex-wrap gap-2">
                                ${conversation.tags.map(tag => `
                                    <span class="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">${tag}</span>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>

                <!-- Matched Properties -->
                <div class="space-y-4">
                    <h4 class="text-lg font-semibold text-gray-800 border-b pb-2">
                        Matched Properties (${matchedProperties.length})
                    </h4>
                    
                    ${matchedProperties.length > 0 ? `
                        <div class="space-y-4 max-h-96 overflow-y-auto">
                            ${matchedProperties.map(property => this.renderPropertyCard(property)).join('')}
                        </div>
                    ` : `
                        <div class="text-center text-gray-500 py-8">
                            <i class="fas fa-home text-3xl mb-2"></i>
                            <p>No matched properties yet</p>
                            <p class="text-sm">Properties will be matched based on lead preferences</p>
                        </div>
                    `}
                </div>
            </div>
            
            ${lead?.notes ? `
                <div class="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h5 class="font-medium text-gray-800 mb-2">Notes</h5>
                    <p class="text-sm text-gray-600">${lead.notes}</p>
                </div>
            ` : ''}
        `;
    }

    /**
     * Render property card
     */
    renderPropertyCard(property) {
        return `
            <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div class="flex items-start space-x-3">
                    ${property.images && property.images[0] ? `
                        <img src="${property.images[0]}" alt="${property.title}" class="w-16 h-16 object-cover rounded-lg">
                    ` : `
                        <div class="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                            <i class="fas fa-home text-gray-400"></i>
                        </div>
                    `}
                    <div class="flex-1 min-w-0">
                        <h6 class="text-sm font-medium text-gray-900 truncate">${property.title}</h6>
                        <p class="text-xs text-gray-600 mt-1">${property.location}</p>
                        <div class="flex items-center justify-between mt-2">
                            <span class="text-sm font-semibold text-blue-600">${this.formatCurrency(property.price)}</span>
                            <span class="text-xs text-gray-500">${property.bedrooms}BR • ${property.area}m²</span>
                        </div>
                        ${property.matchScore ? `
                            <div class="mt-2">
                                <div class="flex items-center justify-between text-xs">
                                    <span class="text-gray-600">Match Score</span>
                                    <span class="font-medium">${Math.round(property.matchScore * 100)}%</span>
                                </div>
                                <div class="w-full bg-gray-200 rounded-full h-1 mt-1">
                                    <div class="bg-green-500 h-1 rounded-full" style="width: ${property.matchScore * 100}%"></div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Close lead modal
     */
    closeLeadModal() {
        document.getElementById('leadModal').classList.add('hidden');
    }

    /**
     * Start message polling for real-time updates
     */
    startMessagePolling() {
        this.messagePollingInterval = setInterval(() => {
            if (this.activeConversationId) {
                this.loadMessages(this.activeConversationId);
            }
            this.loadConversations();
        }, 5000); // Poll every 5 seconds
    }

    /**
     * Start analytics updates
     */
    startAnalyticsUpdates() {
        this.updateAnalytics();
        this.analyticsUpdateInterval = setInterval(() => {
            if (this.isAnalyticsVisible) {
                this.updateAnalytics();
            }
        }, 30000); // Update every 30 seconds
    }

    /**
     * Update analytics dashboard
     */
    async updateAnalytics() {
        try {
            const [conversationsResponse, leadsResponse, messagesResponse] = await Promise.all([
                fetch('tables/conversations?limit=1000'),
                fetch('tables/leads?limit=1000'),
                fetch('tables/messages?limit=1000')
            ]);

            const conversationsData = await conversationsResponse.json();
            const leadsData = await leadsResponse.json();
            const messagesData = await messagesResponse.json();

            // Update metrics
            this.updateMetrics(conversationsData.data || [], leadsData.data || [], messagesData.data || []);
            
            // Update charts if analytics section is visible
            if (this.isAnalyticsVisible) {
                this.updateCharts(conversationsData.data || [], leadsData.data || [], messagesData.data || []);
            }

        } catch (error) {
            console.error('Error updating analytics:', error);
        }
    }

    /**
     * Update metrics display
     */
    updateMetrics(conversations, leads, messages) {
        const qualifiedLeads = leads.filter(lead => lead.qualification_score >= 50);
        const totalConversations = conversations.length;
        const conversionRate = totalConversations > 0 ? (qualifiedLeads.length / totalConversations * 100).toFixed(1) : 0;
        
        // Calculate average response time (simplified)
        const avgResponseTime = this.calculateAverageResponseTime(messages);

        document.getElementById('totalConversations').textContent = totalConversations;
        document.getElementById('qualifiedLeads').textContent = qualifiedLeads.length;
        document.getElementById('conversionRate').textContent = `${conversionRate}%`;
        document.getElementById('avgResponseTime').textContent = avgResponseTime;
    }

    /**
     * Calculate average response time
     */
    calculateAverageResponseTime(messages) {
        // Simplified calculation - in a real system this would be more sophisticated
        const responseTimes = [];
        let lastInboundTime = null;

        messages
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
            .forEach(message => {
                if (message.direction === 'inbound') {
                    lastInboundTime = new Date(message.timestamp);
                } else if (message.direction === 'outbound' && lastInboundTime) {
                    const responseTime = new Date(message.timestamp) - lastInboundTime;
                    responseTimes.push(responseTime);
                    lastInboundTime = null;
                }
            });

        if (responseTimes.length === 0) return '0m';

        const avgMs = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
        const avgMinutes = Math.round(avgMs / (1000 * 60));
        
        if (avgMinutes < 60) return `${avgMinutes}m`;
        return `${Math.round(avgMinutes / 60)}h ${avgMinutes % 60}m`;
    }

    /**
     * Update charts
     */
    updateCharts(conversations, leads, messages) {
        this.updateLeadSourcesChart(leads);
        this.updateMessageVolumeChart(messages);
    }

    /**
     * Update lead sources chart
     */
    updateLeadSourcesChart(leads) {
        const ctx = document.getElementById('leadSourcesChart');
        if (!ctx) return;

        const sources = leads.reduce((acc, lead) => {
            const source = lead.lead_source || 'unknown';
            acc[source] = (acc[source] || 0) + 1;
            return acc;
        }, {});

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(sources).map(s => s.charAt(0).toUpperCase() + s.slice(1)),
                datasets: [{
                    data: Object.values(sources),
                    backgroundColor: [
                        '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    /**
     * Update message volume chart
     */
    updateMessageVolumeChart(messages) {
        const ctx = document.getElementById('messageVolumeChart');
        if (!ctx) return;

        // Group messages by day for the last 7 days
        const last7Days = Array.from({length: 7}, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            return date.toISOString().split('T')[0];
        });

        const messagesByDay = last7Days.map(date => {
            return messages.filter(msg => 
                msg.timestamp.startsWith(date)
            ).length;
        });

        const labels = last7Days.map(date => 
            new Date(date).toLocaleDateString('en-US', { weekday: 'short' })
        );

        new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Messages',
                    data: messagesByDay,
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    /**
     * Toggle analytics dashboard
     */
    toggleAnalytics() {
        const analyticsSection = document.getElementById('analyticsSection');
        this.isAnalyticsVisible = !this.isAnalyticsVisible;
        
        if (this.isAnalyticsVisible) {
            analyticsSection.classList.remove('hidden');
            this.updateAnalytics();
        } else {
            analyticsSection.classList.add('hidden');
        }
    }

    /**
     * Pause updates when page is not visible
     */
    pauseUpdates() {
        if (this.messagePollingInterval) {
            clearInterval(this.messagePollingInterval);
            this.messagePollingInterval = null;
        }
        if (this.analyticsUpdateInterval) {
            clearInterval(this.analyticsUpdateInterval);
            this.analyticsUpdateInterval = null;
        }
    }

    /**
     * Resume updates when page becomes visible
     */
    resumeUpdates() {
        this.startMessagePolling();
        this.startAnalyticsUpdates();
    }

    /**
     * Load templates for autocomplete/suggestions
     */
    async loadTemplates() {
        try {
            const response = await fetch('tables/message_templates');
            const data = await response.json();
            
            if (data.data) {
                // Store templates for quick access
                this.templates = new Map(data.data.map(t => [t.id, t]));
            }
        } catch (error) {
            console.error('Error loading templates:', error);
        }
    }

    /**
     * Utility functions
     */
    getTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffMs = now - time;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return time.toLocaleDateString();
    }

    formatCurrency(amount) {
        if (amount >= 1000000) {
            return `${(amount / 1000000).toFixed(1)}M EGP`;
        } else if (amount >= 1000) {
            return `${(amount / 1000).toFixed(0)}K EGP`;
        } else {
            return `${amount} EGP`;
        }
    }

    showNotification(message, type = 'info') {
        // Simple notification system
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full`;
        
        const colors = {
            success: 'bg-green-500 text-white',
            error: 'bg-red-500 text-white',
            warning: 'bg-yellow-500 text-white',
            info: 'bg-blue-500 text-white'
        };
        
        notification.classList.add(...colors[type].split(' '));
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Global functions for HTML onclick events
function toggleDashboard() {
    window.uiManager.toggleAnalytics();
}

function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        window.uiManager.sendMessage();
    }
}

function sendMessage() {
    window.uiManager.sendMessage();
}

function showTemplates() {
    window.uiManager.showTemplates();
}

function closeTemplates() {
    window.uiManager.closeTemplates();
}

function showLeadDetails() {
    window.uiManager.showLeadDetails();
}

function closeLeadModal() {
    window.uiManager.closeLeadModal();
}

// Export for use in other modules
window.UIManager = UIManager;