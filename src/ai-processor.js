/**
 * AI-Powered Lead Extraction and Property Matching System
 * Processes WhatsApp messages to extract lead information and match properties
 */

class AIProcessor {
    constructor() {
        this.intentPatterns = {
            property_inquiry: [
                /looking for.*(?:apartment|villa|studio|penthouse|house|property)/i,
                /need.*(?:apartment|villa|studio|penthouse|house|property)/i,
                /want.*(?:apartment|villa|studio|penthouse|house|property)/i,
                /interested.*(?:apartment|villa|studio|penthouse|house|property)/i,
                /searching.*(?:apartment|villa|studio|penthouse|house|property)/i,
                /أريد.*(?:شقة|فيلا|استوديو|بنتهاوس|منزل)/i,
                /أبحث.*(?:شقة|فيلا|استوديو|بنتهاوس|منزل)/i,
                /محتاج.*(?:شقة|فيلا|استوديو|بنتهاوس|منزل)/i
            ],
            budget_inquiry: [
                /budget.*(?:\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:million|k|egp|pound|جنيه)/i,
                /price.*range.*(?:\d+(?:,\d{3})*(?:\.\d+)?)/i,
                /afford.*(?:\d+(?:,\d{3})*(?:\.\d+)?)/i,
                /ميزانية.*(?:\d+(?:,\d{3})*(?:\.\d+)?)/i,
                /السعر.*(?:\d+(?:,\d{3})*(?:\.\d+)?)/i
            ],
            location_inquiry: [
                /(?:in|at|near)\s+(new cairo|zamalek|maadi|6th october|heliopolis|alexandria|sheikh zayed)/i,
                /(?:في|بـ|قريب من)\s*(القاهرة الجديدة|الزمالك|المعادي|٦ أكتوبر|مصر الجديدة|الإسكندرية|الشيخ زايد)/i
            ],
            bedroom_inquiry: [
                /(\d+)[\s-]*(?:bed|bedroom|غرفة)/i,
                /(\d+)[\s-]*(?:br|بر)/i
            ],
            contact_info: [
                /(?:my name is|i'm|i am)\s+([a-z\s]+)/i,
                /call me\s+([a-z\s]+)/i,
                /(?:اسمي|انا)\s+([ا-ي\s]+)/i
            ],
            appointment: [
                /(?:schedule|book|arrange|viewing|visit|appointment)/i,
                /(?:موعد|زيارة|جولة|مشاهدة)/i
            ]
        };

        this.locationMappings = {
            'new cairo': ['New Cairo', 'Fifth Settlement', 'التجمع الخامس', 'القاهرة الجديدة'],
            'zamalek': ['Zamalek', 'الزمالك'],
            'maadi': ['Maadi', 'المعادي'],
            '6th october': ['6th October', '6 October', 'Sixth of October', '٦ أكتوبر'],
            'heliopolis': ['Heliopolis', 'مصر الجديدة'],
            'alexandria': ['Alexandria', 'الإسكندرية'],
            'sheikh zayed': ['Sheikh Zayed', 'الشيخ زايد']
        };

        this.propertyTypes = {
            'apartment': ['apartment', 'flat', 'شقة'],
            'villa': ['villa', 'house', 'فيلا', 'منزل'],
            'studio': ['studio', 'استوديو'],
            'penthouse': ['penthouse', 'بنتهاوس'],
            'commercial': ['office', 'shop', 'commercial', 'مكتب', 'محل']
        };
    }

    /**
     * Process incoming message and extract structured data
     */
    async processMessage(messageContent, conversationId) {
        try {
            const extractedData = {
                intent: this.detectIntent(messageContent),
                entities: await this.extractEntities(messageContent),
                sentiment: this.analyzeSentiment(messageContent),
                leadScore: 0,
                conversationId: conversationId,
                timestamp: new Date().toISOString()
            };

            // Calculate lead score based on extracted information
            extractedData.leadScore = this.calculateLeadScore(extractedData);

            // Update conversation with extracted data
            await this.updateConversationData(conversationId, extractedData);

            // Check if we should create/update a lead
            if (extractedData.leadScore >= 30) {
                await this.createOrUpdateLead(conversationId, extractedData);
            }

            return extractedData;
        } catch (error) {
            console.error('Error processing message:', error);
            return null;
        }
    }

    /**
     * Detect user intent from message
     */
    detectIntent(message) {
        for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
            for (const pattern of patterns) {
                if (pattern.test(message)) {
                    return intent;
                }
            }
        }
        return 'general';
    }

    /**
     * Extract entities from message
     */
    async extractEntities(message) {
        const entities = {
            budget: null,
            location: null,
            propertyType: null,
            bedrooms: null,
            bathrooms: null,
            name: null,
            phone: null,
            email: null,
            keywords: []
        };

        // Extract budget information
        const budgetMatches = [
            /(?:budget|price|afford|cost).*?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:million|m|k|thousand|egp|pound|جنيه)/gi,
            /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:million|m|k|thousand|egp|pound|جنيه)/gi,
            /(?:ميزانية|السعر|التكلفة).*?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:مليون|ألف|جنيه)/gi
        ];

        for (const pattern of budgetMatches) {
            const matches = [...message.matchAll(pattern)];
            if (matches.length > 0) {
                const value = parseFloat(matches[0][1].replace(/,/g, ''));
                if (value > 0) {
                    // Determine if it's thousands, millions, etc.
                    const unit = matches[0][0].toLowerCase();
                    if (unit.includes('million') || unit.includes('مليون')) {
                        entities.budget = value * 1000000;
                    } else if (unit.includes('k') || unit.includes('thousand') || unit.includes('ألف')) {
                        entities.budget = value * 1000;
                    } else {
                        entities.budget = value;
                    }
                    break;
                }
            }
        }

        // Extract location
        for (const [key, aliases] of Object.entries(this.locationMappings)) {
            for (const alias of aliases) {
                if (message.toLowerCase().includes(alias.toLowerCase())) {
                    entities.location = key;
                    break;
                }
            }
            if (entities.location) break;
        }

        // Extract property type
        for (const [type, aliases] of Object.entries(this.propertyTypes)) {
            for (const alias of aliases) {
                if (message.toLowerCase().includes(alias.toLowerCase())) {
                    entities.propertyType = type;
                    break;
                }
            }
            if (entities.propertyType) break;
        }

        // Extract bedrooms
        const bedroomMatches = message.match(/(\d+)[\s-]*(?:bed|bedroom|غرفة|br)/i);
        if (bedroomMatches) {
            entities.bedrooms = parseInt(bedroomMatches[1]);
        }

        // Extract bathrooms  
        const bathroomMatches = message.match(/(\d+)[\s-]*(?:bath|bathroom|حمام)/i);
        if (bathroomMatches) {
            entities.bathrooms = parseInt(bathroomMatches[1]);
        }

        // Extract name
        const nameMatches = [
            /(?:my name is|i'm|i am|call me)\s+([a-z\s]{2,30})/i,
            /(?:اسمي|انا)\s+([ا-ي\s]{2,30})/i
        ];
        for (const pattern of nameMatches) {
            const match = message.match(pattern);
            if (match) {
                entities.name = match[1].trim();
                break;
            }
        }

        // Extract phone number
        const phoneMatches = message.match(/(?:\+20|20|0)?[\s-]?1[0-5]\d{8}/g);
        if (phoneMatches) {
            entities.phone = phoneMatches[0].replace(/[\s-]/g, '');
        }

        // Extract email
        const emailMatches = message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
        if (emailMatches) {
            entities.email = emailMatches[0];
        }

        // Extract keywords
        const keywords = message.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2)
            .filter(word => !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'she', 'use', 'way', 'why'].includes(word));
        
        entities.keywords = [...new Set(keywords)].slice(0, 10);

        return entities;
    }

    /**
     * Analyze message sentiment
     */
    analyzeSentiment(message) {
        const positiveWords = [
            'excellent', 'great', 'good', 'amazing', 'perfect', 'wonderful', 'fantastic',
            'interested', 'love', 'like', 'want', 'need', 'looking', 'searching',
            'ممتاز', 'رائع', 'جيد', 'مذهل', 'مثالي', 'جميل', 'مهتم', 'أريد', 'محتاج', 'أبحث'
        ];

        const negativeWords = [
            'bad', 'terrible', 'awful', 'hate', 'dislike', 'expensive', 'cheap',
            'not interested', 'no thanks', 'cancel',
            'سيء', 'فظيع', 'أكره', 'مش مهتم', 'لا شكرا', 'إلغاء'
        ];

        const urgentWords = [
            'urgent', 'asap', 'immediately', 'now', 'today', 'tomorrow',
            'عاجل', 'فوري', 'حالا', 'اليوم', 'غدا'
        ];

        let score = 0;
        let urgency = 0;
        
        const lowerMessage = message.toLowerCase();

        positiveWords.forEach(word => {
            if (lowerMessage.includes(word)) score += 1;
        });

        negativeWords.forEach(word => {
            if (lowerMessage.includes(word)) score -= 1;
        });

        urgentWords.forEach(word => {
            if (lowerMessage.includes(word)) urgency += 1;
        });

        return {
            score: Math.max(-1, Math.min(1, score / 5)),
            label: score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral',
            urgency: urgency > 0 ? 'high' : 'normal'
        };
    }

    /**
     * Calculate lead score based on extracted information
     */
    calculateLeadScore(data) {
        let score = 0;

        // Intent scoring
        const intentScores = {
            'property_inquiry': 40,
            'budget_inquiry': 30,
            'location_inquiry': 25,
            'contact_info': 20,
            'appointment': 50,
            'general': 5
        };
        score += intentScores[data.intent] || 0;

        // Entity scoring
        if (data.entities.budget) score += 25;
        if (data.entities.location) score += 20;
        if (data.entities.propertyType) score += 15;
        if (data.entities.bedrooms) score += 10;
        if (data.entities.name) score += 10;
        if (data.entities.phone) score += 15;
        if (data.entities.email) score += 10;

        // Sentiment scoring
        if (data.sentiment.score > 0.5) score += 10;
        if (data.sentiment.urgency === 'high') score += 15;

        // Keywords relevance
        const relevantKeywords = ['buy', 'purchase', 'invest', 'family', 'home', 'شراء', 'استثمار', 'عائلة', 'منزل'];
        const keywordMatches = data.entities.keywords.filter(keyword => 
            relevantKeywords.some(relevant => keyword.includes(relevant))
        ).length;
        score += Math.min(keywordMatches * 5, 20);

        return Math.min(100, Math.max(0, score));
    }

    /**
     * Update conversation with extracted data
     */
    async updateConversationData(conversationId, extractedData) {
        try {
            const updateData = {
                lead_score: extractedData.leadScore
            };

            if (extractedData.entities.budget) {
                updateData.budget_range = this.formatBudgetRange(extractedData.entities.budget);
            }

            if (extractedData.entities.location) {
                updateData.location_preference = extractedData.entities.location;
            }

            if (extractedData.entities.propertyType) {
                updateData.property_type = extractedData.entities.propertyType;
            }

            // Update conversation tags
            const tags = [];
            if (extractedData.intent !== 'general') tags.push(extractedData.intent);
            if (extractedData.sentiment.label !== 'neutral') tags.push(extractedData.sentiment.label);
            if (extractedData.sentiment.urgency === 'high') tags.push('urgent');
            if (extractedData.leadScore >= 70) tags.push('hot_lead');
            else if (extractedData.leadScore >= 40) tags.push('warm_lead');

            updateData.tags = tags;

            await fetch(`tables/conversations/${conversationId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });

        } catch (error) {
            console.error('Error updating conversation:', error);
        }
    }

    /**
     * Create or update lead record
     */
    async createOrUpdateLead(conversationId, extractedData) {
        try {
            // Check if lead exists for this conversation
            const response = await fetch(`tables/leads?search=${conversationId}`);
            const data = await response.json();
            
            let leadData = {
                conversation_id: conversationId,
                qualification_score: extractedData.leadScore,
                stage: extractedData.leadScore >= 70 ? 'qualified' : 'new',
                lead_source: 'whatsapp',
                notes: `AI Extracted: Intent=${extractedData.intent}, Sentiment=${extractedData.sentiment.label}`
            };

            // Add extracted entity data
            if (extractedData.entities.name) leadData.name = extractedData.entities.name;
            if (extractedData.entities.phone) leadData.phone_number = extractedData.entities.phone;
            if (extractedData.entities.email) leadData.email = extractedData.entities.email;
            if (extractedData.entities.budget) {
                leadData.budget_min = Math.round(extractedData.entities.budget * 0.8);
                leadData.budget_max = Math.round(extractedData.entities.budget * 1.2);
            }
            if (extractedData.entities.propertyType) leadData.property_type = extractedData.entities.propertyType;
            if (extractedData.entities.location) leadData.location_preference = extractedData.entities.location;
            if (extractedData.entities.bedrooms) leadData.bedrooms = extractedData.entities.bedrooms;
            if (extractedData.entities.bathrooms) leadData.bathrooms = extractedData.entities.bathrooms;

            let existingLead = null;
            if (data.data && data.data.length > 0) {
                existingLead = data.data.find(lead => lead.conversation_id === conversationId);
            }

            if (existingLead) {
                // Update existing lead
                await fetch(`tables/leads/${existingLead.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(leadData)
                });
                console.log('✅ Lead updated:', existingLead.id);
            } else {
                // Create new lead
                leadData.id = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                
                const createResponse = await fetch('tables/leads', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(leadData)
                });
                
                const newLead = await createResponse.json();
                console.log('✅ New lead created:', newLead.id);

                // Find matching properties
                await this.findAndAttachProperties(newLead.id, extractedData.entities);
            }

        } catch (error) {
            console.error('Error managing lead:', error);
        }
    }

    /**
     * Find and attach matching properties to lead
     */
    async findAndAttachProperties(leadId, entities) {
        try {
            const propertyMatcher = new PropertyMatcher();
            const criteria = {
                budget: entities.budget,
                location: entities.location,
                propertyType: entities.propertyType,
                bedrooms: entities.bedrooms,
                bathrooms: entities.bathrooms
            };

            const matches = await propertyMatcher.findMatches(criteria);
            
            if (matches.length > 0) {
                const propertyIds = matches.map(prop => prop.id);
                
                await fetch(`tables/leads/${leadId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        matched_properties: propertyIds
                    })
                });

                console.log(`✅ Attached ${matches.length} properties to lead ${leadId}`);
            }

        } catch (error) {
            console.error('Error attaching properties:', error);
        }
    }

    /**
     * Format budget range for display
     */
    formatBudgetRange(budget) {
        if (budget >= 1000000) {
            return `${(budget / 1000000).toFixed(1)}M EGP`;
        } else if (budget >= 1000) {
            return `${(budget / 1000).toFixed(0)}K EGP`;
        } else {
            return `${budget} EGP`;
        }
    }
}

/**
 * Property Matching System
 * Finds properties that match lead criteria using intelligent algorithms
 */
class PropertyMatcher {
    constructor() {
        this.weights = {
            budget: 0.3,
            location: 0.25,
            propertyType: 0.2,
            bedrooms: 0.15,
            bathrooms: 0.1
        };
    }

    /**
     * Find properties that match the given criteria
     */
    async findMatches(criteria) {
        try {
            const response = await fetch('tables/properties?limit=100');
            const data = await response.json();
            
            if (!data.data || data.data.length === 0) {
                return [];
            }

            const properties = data.data.filter(prop => prop.status === 'available');
            const scoredProperties = [];

            for (const property of properties) {
                const score = this.calculateMatchScore(property, criteria);
                if (score > 0.3) { // Only include properties with 30%+ match
                    scoredProperties.push({
                        ...property,
                        matchScore: score,
                        matchReasons: this.getMatchReasons(property, criteria)
                    });
                }
            }

            // Sort by match score (highest first)
            return scoredProperties.sort((a, b) => b.matchScore - a.matchScore);

        } catch (error) {
            console.error('Error finding property matches:', error);
            return [];
        }
    }

    /**
     * Calculate match score between property and criteria
     */
    calculateMatchScore(property, criteria) {
        let totalScore = 0;
        let applicableWeights = 0;

        // Budget matching
        if (criteria.budget) {
            applicableWeights += this.weights.budget;
            const budgetScore = this.scoreBudgetMatch(property.price, criteria.budget);
            totalScore += budgetScore * this.weights.budget;
        }

        // Location matching
        if (criteria.location) {
            applicableWeights += this.weights.location;
            const locationScore = this.scoreLocationMatch(property.location, criteria.location);
            totalScore += locationScore * this.weights.location;
        }

        // Property type matching
        if (criteria.propertyType) {
            applicableWeights += this.weights.propertyType;
            const typeScore = property.property_type === criteria.propertyType ? 1 : 0;
            totalScore += typeScore * this.weights.propertyType;
        }

        // Bedrooms matching
        if (criteria.bedrooms) {
            applicableWeights += this.weights.bedrooms;
            const bedroomScore = this.scoreBedroomMatch(property.bedrooms, criteria.bedrooms);
            totalScore += bedroomScore * this.weights.bedrooms;
        }

        // Bathrooms matching
        if (criteria.bathrooms) {
            applicableWeights += this.weights.bathrooms;
            const bathroomScore = this.scoreBathroomMatch(property.bathrooms, criteria.bathrooms);
            totalScore += bathroomScore * this.weights.bathrooms;
        }

        // Normalize score
        return applicableWeights > 0 ? totalScore / applicableWeights : 0;
    }

    /**
     * Score budget match (tolerance for 20% variation)
     */
    scoreBudgetMatch(propertyPrice, targetBudget) {
        const priceDiff = Math.abs(propertyPrice - targetBudget) / targetBudget;
        
        if (priceDiff <= 0.1) return 1.0;      // Within 10%
        if (priceDiff <= 0.2) return 0.8;      // Within 20%
        if (priceDiff <= 0.3) return 0.6;      // Within 30%
        if (priceDiff <= 0.5) return 0.4;      // Within 50%
        return 0;
    }

    /**
     * Score location match
     */
    scoreLocationMatch(propertyLocation, targetLocation) {
        const locationAliases = {
            'new cairo': ['new cairo', 'fifth settlement', 'التجمع الخامس', 'القاهرة الجديدة'],
            'zamalek': ['zamalek', 'الزمالك'],
            'maadi': ['maadi', 'المعادي'],
            '6th october': ['6th october', '6 october', 'sixth of october', '٦ أكتوبر'],
            'heliopolis': ['heliopolis', 'مصر الجديدة'],
            'alexandria': ['alexandria', 'الإسكندرية'],
            'sheikh zayed': ['sheikh zayed', 'الشيخ زايد']
        };

        const propertyLocationLower = propertyLocation.toLowerCase();
        const targetAliases = locationAliases[targetLocation] || [targetLocation];

        for (const alias of targetAliases) {
            if (propertyLocationLower.includes(alias.toLowerCase())) {
                return 1.0;
            }
        }

        return 0;
    }

    /**
     * Score bedroom match (allow ±1 room tolerance)
     */
    scoreBedroomMatch(propertyBedrooms, targetBedrooms) {
        const diff = Math.abs(propertyBedrooms - targetBedrooms);
        
        if (diff === 0) return 1.0;
        if (diff === 1) return 0.7;
        if (diff === 2) return 0.4;
        return 0;
    }

    /**
     * Score bathroom match
     */
    scoreBathroomMatch(propertyBathrooms, targetBathrooms) {
        const diff = Math.abs(propertyBathrooms - targetBathrooms);
        
        if (diff === 0) return 1.0;
        if (diff === 1) return 0.8;
        return 0;
    }

    /**
     * Get human-readable match reasons
     */
    getMatchReasons(property, criteria) {
        const reasons = [];

        if (criteria.budget) {
            const priceDiff = Math.abs(property.price - criteria.budget) / criteria.budget;
            if (priceDiff <= 0.1) {
                reasons.push('Perfect budget match');
            } else if (priceDiff <= 0.3) {
                reasons.push('Good budget fit');
            }
        }

        if (criteria.location && this.scoreLocationMatch(property.location, criteria.location) > 0) {
            reasons.push('Matches preferred location');
        }

        if (criteria.propertyType && property.property_type === criteria.propertyType) {
            reasons.push('Exact property type match');
        }

        if (criteria.bedrooms) {
            const diff = Math.abs(property.bedrooms - criteria.bedrooms);
            if (diff === 0) {
                reasons.push('Perfect bedroom count');
            } else if (diff === 1) {
                reasons.push('Close bedroom count match');
            }
        }

        return reasons;
    }
}

/**
 * Template Processing System
 * Handles message templates and variable replacement
 */
class TemplateProcessor {
    constructor() {
        this.templates = new Map();
    }

    /**
     * Get template by category or name
     */
    async getTemplate(category) {
        try {
            const response = await fetch(`tables/message_templates?search=${category}`);
            const data = await response.json();
            
            if (data.data && data.data.length > 0) {
                const template = data.data.find(t => t.category === category || t.name === category);
                return template ? template.content : null;
            }
            
            return null;
        } catch (error) {
            console.error('Error fetching template:', error);
            return null;
        }
    }

    /**
     * Process template with variable replacement
     */
    processTemplate(template, variables) {
        let processedTemplate = template;

        // Replace variables in template
        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            processedTemplate = processedTemplate.replace(regex, value || '');
        }

        // Clean up any remaining unreplaced variables
        processedTemplate = processedTemplate.replace(/{{[^}]+}}/g, '');

        return processedTemplate;
    }

    /**
     * Get personalized template based on lead data
     */
    async getPersonalizedTemplate(category, leadData) {
        const baseTemplate = await this.getTemplate(category);
        if (!baseTemplate) return null;

        const variables = {
            name: leadData.name || 'Valued Customer',
            budget: leadData.budget_range || '',
            location: leadData.location_preference || '',
            property_type: leadData.property_type || 'property'
        };

        return this.processTemplate(baseTemplate, variables);
    }
}

// Export classes for use in other modules
window.AIProcessor = AIProcessor;
window.PropertyMatcher = PropertyMatcher;
window.TemplateProcessor = TemplateProcessor;