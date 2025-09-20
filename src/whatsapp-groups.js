/**
 * WhatsApp Groups Manager for Crystal Intelligence
 * Handles WhatsApp Business Group functionality for real estate leads
 * 
 * CRITICAL: WhatsApp Groups are essential for Egyptian real estate market
 * - Property investor groups
 * - Location-specific groups (New Capital, Sheikh Zayed, etc.)
 * - Broker networks and referral groups
 * - Customer inquiry groups
 */

class WhatsAppGroups {
    constructor(whatsAppAPI, aiProcessor) {
        this.whatsAppAPI = whatsAppAPI;
        this.aiProcessor = aiProcessor;
        this.groupConversations = new Map();
        this.groupSettings = new Map();
        this.groupMentions = new Map();
        this.groupAnalytics = new Map();
        
        // Group-specific configurations
        this.groupBehaviors = {
            'property_investors': {
                autoRespond: false,  // Don't spam investor groups
                leadCapture: true,   // Capture investment inquiries
                mentionOnly: true,   // Only respond when mentioned
                priority: 'high'
            },
            'location_specific': {
                autoRespond: true,   // Respond to location queries
                leadCapture: true,   // Capture area-specific leads
                mentionOnly: false,  // Monitor all messages
                priority: 'medium'
            },
            'broker_network': {
                autoRespond: false,  // Professional discretion
                leadCapture: true,   // Network referrals
                mentionOnly: true,   // Only when mentioned
                priority: 'high'
            },
            'customer_support': {
                autoRespond: true,   // Quick customer service
                leadCapture: true,   // Support to sales conversion
                mentionOnly: false,  // Monitor all questions
                priority: 'urgent'
            }
        };
        
        // Group message keywords that trigger responses
        this.groupTriggers = {
            property_inquiry: [
                'looking for', 'بحث عن', 'محتاج', 'عايز', 'أريد',
                'apartment', 'شقة', 'villa', 'فيلا', 'property', 'عقار',
                'budget', 'ميزانية', 'price', 'سعر', 'cost', 'تكلفة'
            ],
            location_mention: [
                'new capital', 'العاصمة الإدارية', 'sheikh zayed', 'الشيخ زايد',
                'maadi', 'المعادي', 'zamalek', 'الزمالك', 'heliopolis', 'مصر الجديدة',
                'nasr city', 'مدينة نصر', '6th october', 'السادس من أكتوبر'
            ],
            urgent_inquiry: [
                'urgent', 'عاجل', 'asap', 'immediately', 'فوراً', 'سريع',
                'today', 'اليوم', 'this week', 'الأسبوع ده'
            ]
        };
        
        console.log('[WhatsApp Groups] Manager initialized');
    }

    /**
     * Process group message from webhook
     * @param {Object} message - WhatsApp group message
     * @param {Object} groupInfo - Group information
     */
    async processGroupMessage(message, groupInfo) {
        try {
            console.log('[WhatsApp Groups] Processing group message:', {
                groupId: groupInfo.id,
                groupName: groupInfo.subject,
                from: message.from,
                messageType: message.type
            });

            // Extract group context
            const groupContext = {
                groupId: groupInfo.id,
                groupName: groupInfo.subject,
                groupDescription: groupInfo.description,
                participantCount: groupInfo.participants?.length || 0,
                isGroupAdmin: this.isGroupAdmin(message.from, groupInfo),
                messageFrom: message.from,
                timestamp: message.timestamp
            };

            // Determine group category and behavior
            const groupCategory = this.categorizeGroup(groupInfo);
            const behavior = this.groupBehaviors[groupCategory] || this.groupBehaviors['location_specific'];

            console.log('[WhatsApp Groups] Group categorized as:', groupCategory, 'Behavior:', behavior);

            // Check if we should process this message
            const shouldProcess = await this.shouldProcessMessage(message, groupContext, behavior);
            
            if (!shouldProcess) {
                console.log('[WhatsApp Groups] Skipping message processing based on group rules');
                return null;
            }

            // Process message content for lead extraction
            let processedMessage = null;
            if (message.type === 'text') {
                processedMessage = await this.processGroupTextMessage(message, groupContext, behavior);
            }

            // Store group conversation history
            await this.updateGroupConversation(groupContext, message, processedMessage);

            // Update group analytics
            await this.updateGroupAnalytics(groupContext, message, processedMessage);

            return processedMessage;

        } catch (error) {
            console.error('[WhatsApp Groups] Error processing group message:', error);
            return null;
        }
    }

    /**
     * Process text message in group context
     * @param {Object} message - WhatsApp message
     * @param {Object} groupContext - Group context information
     * @param {Object} behavior - Group behavior settings
     */
    async processGroupTextMessage(message, groupContext, behavior) {
        try {
            const messageText = message.text.body;
            console.log('[WhatsApp Groups] Processing text message:', messageText.substring(0, 100));

            // Check for mentions of our business
            const isMentioned = this.checkBusinessMention(messageText);
            const triggerType = this.identifyTrigger(messageText);
            
            // Enhanced AI processing with group context
            const aiResult = await this.aiProcessor.processMessage({
                ...message,
                data: { text: messageText }
            }, `group_${groupContext.groupId}_${message.from}`);

            // Add group-specific context to AI result
            if (aiResult) {
                aiResult.groupContext = {
                    ...groupContext,
                    isMentioned,
                    triggerType,
                    groupCategory: this.categorizeGroup({ 
                        subject: groupContext.groupName,
                        description: groupContext.groupDescription 
                    }),
                    shouldAutoRespond: this.shouldAutoRespond(behavior, isMentioned, triggerType)
                };

                // Generate group-appropriate response
                if (aiResult.groupContext.shouldAutoRespond) {
                    aiResult.suggestedResponse = await this.generateGroupResponse(
                        aiResult, 
                        groupContext, 
                        behavior
                    );
                }

                console.log('[WhatsApp Groups] AI processing complete with group context');
            }

            return aiResult;

        } catch (error) {
            console.error('[WhatsApp Groups] Error processing group text message:', error);
            return null;
        }
    }

    /**
     * Determine if we should process this group message
     * @param {Object} message - WhatsApp message
     * @param {Object} groupContext - Group context
     * @param {Object} behavior - Group behavior settings
     */
    async shouldProcessMessage(message, groupContext, behavior) {
        try {
            // Always process if we're mentioned
            if (behavior.mentionOnly && message.text?.body) {
                const isMentioned = this.checkBusinessMention(message.text.body);
                if (!isMentioned) {
                    return false;
                }
            }

            // Check for property-related keywords
            if (message.text?.body) {
                const hasPropertyKeywords = this.identifyTrigger(message.text.body) !== null;
                if (!hasPropertyKeywords && behavior.mentionOnly) {
                    return false;
                }
            }

            // Skip if message is from a bot or automated system
            if (this.isAutomatedMessage(message)) {
                return false;
            }

            // Rate limiting per group
            const groupRateLimit = await this.checkGroupRateLimit(groupContext.groupId);
            if (!groupRateLimit.allowed) {
                console.log('[WhatsApp Groups] Rate limit exceeded for group:', groupContext.groupId);
                return false;
            }

            return true;

        } catch (error) {
            console.error('[WhatsApp Groups] Error in shouldProcessMessage:', error);
            return false;
        }
    }

    /**
     * Categorize group based on name and description
     * @param {Object} groupInfo - Group information
     */
    categorizeGroup(groupInfo) {
        const name = (groupInfo.subject || '').toLowerCase();
        const description = (groupInfo.description || '').toLowerCase();
        const text = name + ' ' + description;

        // Property investor groups
        if (text.includes('investor') || text.includes('investment') || text.includes('مستثمر')) {
            return 'property_investors';
        }

        // Location-specific groups
        const locations = ['new capital', 'العاصمة', 'sheikh zayed', 'الشيخ زايد', 'maadi', 'المعادي'];
        if (locations.some(loc => text.includes(loc))) {
            return 'location_specific';
        }

        // Broker network groups
        if (text.includes('broker') || text.includes('agent') || text.includes('سمسار') || text.includes('وكيل')) {
            return 'broker_network';
        }

        // Customer support groups
        if (text.includes('support') || text.includes('help') || text.includes('دعم') || text.includes('مساعدة')) {
            return 'customer_support';
        }

        // Default to location-specific behavior
        return 'location_specific';
    }

    /**
     * Check if message mentions our business
     * @param {string} text - Message text
     */
    checkBusinessMention(text) {
        const businessKeywords = [
            'crystal', 'كريستال', 'intelligence', 'ذكي',
            '@crystal', '@crystalintelligence', 'crystal intelligence'
        ];

        const lowerText = text.toLowerCase();
        return businessKeywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
    }

    /**
     * Identify trigger type in message
     * @param {string} text - Message text
     */
    identifyTrigger(text) {
        const lowerText = text.toLowerCase();

        // Check urgent inquiries first
        if (this.groupTriggers.urgent_inquiry.some(trigger => lowerText.includes(trigger))) {
            return 'urgent_inquiry';
        }

        // Check property inquiries
        if (this.groupTriggers.property_inquiry.some(trigger => lowerText.includes(trigger))) {
            return 'property_inquiry';
        }

        // Check location mentions
        if (this.groupTriggers.location_mention.some(trigger => lowerText.includes(trigger))) {
            return 'location_mention';
        }

        return null;
    }

    /**
     * Determine if we should auto-respond
     * @param {Object} behavior - Group behavior settings
     * @param {boolean} isMentioned - Whether business was mentioned
     * @param {string} triggerType - Type of trigger detected
     */
    shouldAutoRespond(behavior, isMentioned, triggerType) {
        // Always respond if mentioned (unless disabled)
        if (isMentioned && behavior.autoRespond !== false) {
            return true;
        }

        // Respond to urgent inquiries in all groups
        if (triggerType === 'urgent_inquiry') {
            return true;
        }

        // Follow group-specific auto-respond settings
        if (behavior.autoRespond && !behavior.mentionOnly) {
            return triggerType === 'property_inquiry' || triggerType === 'location_mention';
        }

        return false;
    }

    /**
     * Generate appropriate response for group context
     * @param {Object} aiResult - AI processing result
     * @param {Object} groupContext - Group context
     * @param {Object} behavior - Group behavior settings
     */
    async generateGroupResponse(aiResult, groupContext, behavior) {
        try {
            const isUrgent = aiResult.groupContext.triggerType === 'urgent_inquiry';
            const isMentioned = aiResult.groupContext.isMentioned;
            
            let responseTemplate = '';

            if (isMentioned) {
                // Direct mention response
                responseTemplate = `Thank you for mentioning Crystal Intelligence! 🏠 I'd be happy to help you find the perfect property. `;
            } else if (isUrgent) {
                // Urgent inquiry response
                responseTemplate = `Hi! I noticed you're looking for something urgent. Crystal Intelligence can help you find properties quickly. `;
            } else {
                // General helpful response
                responseTemplate = `Hello! Crystal Intelligence has excellent properties that might interest you. `;
            }

            // Add lead information if extracted
            if (aiResult.leadInfo && Object.keys(aiResult.leadInfo).length > 0) {
                responseTemplate += `Based on your requirements:\n`;
                
                if (aiResult.leadInfo.budget) {
                    responseTemplate += `💰 Budget: ${aiResult.leadInfo.budget.amount?.toLocaleString()} EGP\n`;
                }
                
                if (aiResult.leadInfo.location) {
                    responseTemplate += `📍 Location: ${aiResult.leadInfo.location.area}\n`;
                }
                
                if (aiResult.leadInfo.propertyType) {
                    responseTemplate += `🏠 Type: ${aiResult.leadInfo.propertyType.type}\n`;
                }
                
                responseTemplate += `\nI can show you some great matches! Please send me a private message for detailed property options. 📱`;
            } else {
                responseTemplate += `Please send me your requirements (budget, location, property type) in a private message and I'll find perfect matches for you! 📱`;
            }

            // Add group-specific etiquette
            if (behavior.mentionOnly || groupContext.participantCount > 50) {
                responseTemplate += `\n\n(Continuing in private to keep the group chat clean 🙏)`;
            }

            return responseTemplate;

        } catch (error) {
            console.error('[WhatsApp Groups] Error generating group response:', error);
            return "Thank you for your interest! Please message Crystal Intelligence privately for property assistance. 🏠";
        }
    }

    /**
     * Check if message is from automated system
     * @param {Object} message - WhatsApp message
     */
    isAutomatedMessage(message) {
        // Check for common bot patterns
        const text = message.text?.body || '';
        const botPatterns = [
            /^\*[^*]+\*$/,  // Text wrapped in asterisks
            /^_[^_]+_$/,    // Text wrapped in underscores
            /automated|bot|system/i,
            /broadcast|انتشار/i
        ];

        return botPatterns.some(pattern => pattern.test(text));
    }

    /**
     * Check group rate limiting
     * @param {string} groupId - Group ID
     */
    async checkGroupRateLimit(groupId) {
        try {
            const now = Date.now();
            const rateLimit = this.groupSettings.get(groupId)?.rateLimit || {
                count: 0,
                window: now,
                maxMessages: 5,     // Max 5 messages per hour per group
                windowSize: 3600000 // 1 hour
            };

            // Reset counter if window has passed
            if (now - rateLimit.window > rateLimit.windowSize) {
                rateLimit.count = 0;
                rateLimit.window = now;
            }

            // Check if limit exceeded
            if (rateLimit.count >= rateLimit.maxMessages) {
                return { allowed: false, resetTime: rateLimit.window + rateLimit.windowSize };
            }

            // Increment counter
            rateLimit.count++;
            
            // Update settings
            const groupSettings = this.groupSettings.get(groupId) || {};
            groupSettings.rateLimit = rateLimit;
            this.groupSettings.set(groupId, groupSettings);

            return { allowed: true, remaining: rateLimit.maxMessages - rateLimit.count };

        } catch (error) {
            console.error('[WhatsApp Groups] Error checking rate limit:', error);
            return { allowed: true }; // Allow on error
        }
    }

    /**
     * Check if user is group admin
     * @param {string} userId - User WhatsApp ID
     * @param {Object} groupInfo - Group information
     */
    isGroupAdmin(userId, groupInfo) {
        try {
            const participant = groupInfo.participants?.find(p => p.id === userId);
            return participant && (participant.is_admin || participant.is_super_admin);
        } catch (error) {
            console.error('[WhatsApp Groups] Error checking admin status:', error);
            return false;
        }
    }

    /**
     * Update group conversation history
     * @param {Object} groupContext - Group context
     * @param {Object} message - Original message
     * @param {Object} processedMessage - Processed message result
     */
    async updateGroupConversation(groupContext, message, processedMessage) {
        try {
            const conversationId = `group_${groupContext.groupId}`;
            
            let conversation = this.groupConversations.get(conversationId);
            if (!conversation) {
                conversation = {
                    id: conversationId,
                    groupId: groupContext.groupId,
                    groupName: groupContext.groupName,
                    type: 'group',
                    messages: [],
                    participants: new Set(),
                    leadCount: 0,
                    lastActivity: new Date(),
                    analytics: {
                        totalMessages: 0,
                        propertyInquiries: 0,
                        leadsGenerated: 0,
                        responsesSent: 0
                    }
                };
            }

            // Add message to history
            conversation.messages.push({
                id: message.id,
                from: message.from,
                timestamp: new Date(parseInt(message.timestamp) * 1000),
                type: message.type,
                content: message.text?.body || '',
                processed: !!processedMessage,
                leadExtracted: processedMessage?.leadInfo && Object.keys(processedMessage.leadInfo).length > 0
            });

            // Update participants
            conversation.participants.add(message.from);
            conversation.lastActivity = new Date();
            conversation.analytics.totalMessages++;

            // Update analytics based on processing results
            if (processedMessage) {
                if (processedMessage.intent === 'inquiry') {
                    conversation.analytics.propertyInquiries++;
                }
                
                if (processedMessage.leadInfo && Object.keys(processedMessage.leadInfo).length > 0) {
                    conversation.analytics.leadsGenerated++;
                    conversation.leadCount++;
                }
                
                if (processedMessage.groupContext?.shouldAutoRespond) {
                    conversation.analytics.responsesSent++;
                }
            }

            // Keep only last 100 messages per group
            if (conversation.messages.length > 100) {
                conversation.messages = conversation.messages.slice(-100);
            }

            this.groupConversations.set(conversationId, conversation);

            console.log('[WhatsApp Groups] Updated group conversation:', conversationId);

        } catch (error) {
            console.error('[WhatsApp Groups] Error updating group conversation:', error);
        }
    }

    /**
     * Update group analytics
     * @param {Object} groupContext - Group context
     * @param {Object} message - Original message
     * @param {Object} processedMessage - Processed message result
     */
    async updateGroupAnalytics(groupContext, message, processedMessage) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const analyticsKey = `${groupContext.groupId}_${today}`;
            
            let analytics = this.groupAnalytics.get(analyticsKey) || {
                groupId: groupContext.groupId,
                groupName: groupContext.groupName,
                date: today,
                metrics: {
                    totalMessages: 0,
                    uniqueParticipants: new Set(),
                    propertyInquiries: 0,
                    leadsExtracted: 0,
                    responsesSent: 0,
                    avgResponseTime: 0,
                    topKeywords: new Map(),
                    peakActivityHour: new Map()
                }
            };

            // Update basic metrics
            analytics.metrics.totalMessages++;
            analytics.metrics.uniqueParticipants.add(message.from);

            // Track activity by hour
            const hour = new Date().getHours();
            const hourCount = analytics.metrics.peakActivityHour.get(hour) || 0;
            analytics.metrics.peakActivityHour.set(hour, hourCount + 1);

            // Extract and track keywords
            if (message.text?.body) {
                const keywords = this.extractKeywords(message.text.body);
                keywords.forEach(keyword => {
                    const count = analytics.metrics.topKeywords.get(keyword) || 0;
                    analytics.metrics.topKeywords.set(keyword, count + 1);
                });
            }

            // Update processing results
            if (processedMessage) {
                if (processedMessage.intent === 'inquiry') {
                    analytics.metrics.propertyInquiries++;
                }
                
                if (processedMessage.leadInfo && Object.keys(processedMessage.leadInfo).length > 0) {
                    analytics.metrics.leadsExtracted++;
                }
                
                if (processedMessage.groupContext?.shouldAutoRespond) {
                    analytics.metrics.responsesSent++;
                }
            }

            this.groupAnalytics.set(analyticsKey, analytics);

            console.log('[WhatsApp Groups] Updated group analytics for:', groupContext.groupName);

        } catch (error) {
            console.error('[WhatsApp Groups] Error updating group analytics:', error);
        }
    }

    /**
     * Extract keywords from message text
     * @param {string} text - Message text
     */
    extractKeywords(text) {
        const keywords = [];
        const lowerText = text.toLowerCase();

        // Property types
        const propertyTypes = ['apartment', 'شقة', 'villa', 'فيلا', 'office', 'مكتب', 'shop', 'محل'];
        propertyTypes.forEach(type => {
            if (lowerText.includes(type)) keywords.push(type);
        });

        // Locations
        const locations = ['new capital', 'العاصمة', 'sheikh zayed', 'الشيخ زايد', 'maadi', 'المعادي'];
        locations.forEach(location => {
            if (lowerText.includes(location)) keywords.push(location);
        });

        // Actions
        const actions = ['buy', 'شراء', 'rent', 'إيجار', 'invest', 'استثمار'];
        actions.forEach(action => {
            if (lowerText.includes(action)) keywords.push(action);
        });

        return keywords;
    }

    /**
     * Send message to group
     * @param {string} groupId - Group ID  
     * @param {string} message - Message text
     */
    async sendGroupMessage(groupId, message) {
        try {
            // Note: WhatsApp Business API has limitations for group messaging
            // This would require special permissions and is typically restricted
            console.log('[WhatsApp Groups] Group messaging requires special WhatsApp Business permissions');
            
            // For now, log the intended message
            console.log('[WhatsApp Groups] Would send to group', groupId, ':', message);
            
            // In production, you would:
            // 1. Check if group messaging is allowed
            // 2. Use appropriate API endpoint
            // 3. Handle group-specific rate limits
            
            return { success: false, message: 'Group messaging requires special permissions' };

        } catch (error) {
            console.error('[WhatsApp Groups] Error sending group message:', error);
            throw error;
        }
    }

    /**
     * Get group analytics summary
     * @param {string} groupId - Group ID
     * @param {number} days - Number of days to analyze
     */
    getGroupAnalytics(groupId, days = 7) {
        try {
            const analytics = {
                groupId,
                period: `${days} days`,
                summary: {
                    totalMessages: 0,
                    uniqueParticipants: 0,
                    propertyInquiries: 0,
                    leadsExtracted: 0,
                    responsesSent: 0,
                    conversionRate: 0
                },
                trends: {
                    dailyMessages: [],
                    topKeywords: [],
                    peakHours: []
                }
            };

            // Aggregate analytics for the period
            const endDate = new Date();
            const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
            
            for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
                const dateStr = date.toISOString().split('T')[0];
                const analyticsKey = `${groupId}_${dateStr}`;
                const dayAnalytics = this.groupAnalytics.get(analyticsKey);
                
                if (dayAnalytics) {
                    analytics.summary.totalMessages += dayAnalytics.metrics.totalMessages;
                    analytics.summary.propertyInquiries += dayAnalytics.metrics.propertyInquiries;
                    analytics.summary.leadsExtracted += dayAnalytics.metrics.leadsExtracted;
                    analytics.summary.responsesSent += dayAnalytics.metrics.responsesSent;
                    
                    analytics.trends.dailyMessages.push({
                        date: dateStr,
                        messages: dayAnalytics.metrics.totalMessages,
                        leads: dayAnalytics.metrics.leadsExtracted
                    });
                }
            }

            // Calculate conversion rate
            if (analytics.summary.propertyInquiries > 0) {
                analytics.summary.conversionRate = (analytics.summary.leadsExtracted / analytics.summary.propertyInquiries * 100).toFixed(2);
            }

            return analytics;

        } catch (error) {
            console.error('[WhatsApp Groups] Error getting group analytics:', error);
            return null;
        }
    }

    /**
     * Get all active group conversations
     */
    getActiveGroupConversations() {
        const activeGroups = [];
        
        for (const [conversationId, conversation] of this.groupConversations.entries()) {
            // Consider groups active if they had activity in the last 7 days
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            
            if (conversation.lastActivity > weekAgo) {
                activeGroups.push({
                    id: conversation.id,
                    groupId: conversation.groupId,
                    groupName: conversation.groupName,
                    participantCount: conversation.participants.size,
                    messageCount: conversation.messages.length,
                    leadCount: conversation.leadCount,
                    lastActivity: conversation.lastActivity,
                    analytics: conversation.analytics
                });
            }
        }

        return activeGroups.sort((a, b) => b.lastActivity - a.lastActivity);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WhatsAppGroups;
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
    window.WhatsAppGroups = WhatsAppGroups;
}