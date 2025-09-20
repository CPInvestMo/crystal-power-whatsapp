/**
 * AI Supply-Demand Matching Processor
 * Crystal Intelligence WhatsApp Integration System
 * 
 * Core Functionality: MATCHES SUPPLY WITH DEMAND (NO AUTO-RESPONSES)
 * 
 * Handles:
 * - Natural language processing of incoming messages to extract requirements
 * - Property inventory management (supply tracking)
 * - Customer requirement analysis (demand processing)
 * - Intelligent matching algorithm with weighted scoring
 * - Match recommendation generation for human agents
 * - Lead qualification and categorization
 */

class AIProcessor {
    constructor() {
        this.initialized = false;
        this.leadExtractionRules = this.initializeLeadRules();
        this.propertyMatchingWeights = this.initializePropertyWeights();
        this.intentClassifier = this.initializeIntentClassifier();
        this.sentimentAnalyzer = this.initializeSentimentAnalyzer();
        
        // Supply-Demand Matching Core
        this.propertyInventory = new Map(); // Available properties (SUPPLY)
        this.customerRequirements = new Map(); // Customer demands (DEMAND)
        this.matchingResults = new Map(); // Cached matching scores
        this.conversationHistory = new Map();
        this.matchingThreshold = 0.75; // Minimum score for viable match
        
        console.log('[AI Matcher] Supply-Demand Matching System Initialized');
    }

    /**
     * Initialize lead extraction rules for demand analysis
     */
    initializeLeadRules() {
        return {
            patterns: {
                // Budget patterns (DEMAND)
                budget: [
                    /budget[:\s]*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(egp|le|pound|million|k|thousand)/i,
                    /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(egp|le|pound|million|k|thousand)\s*budget/i,
                    /can\s+afford[:\s]*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(egp|le|pound|million|k|thousand)/i,
                    /up\s+to[:\s]*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(egp|le|pound|million|k|thousand)/i,
                    /max[:\s]*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(egp|le|pound|million|k|thousand)/i
                ],
                
                // Location patterns (DEMAND)
                location: [
                    /(?:in|at|near|around)\s+([a-zA-Z\s]+?(?:city|area|district|zone|compound|new\s+capital|6th\s+october|sheikh\s+zayed|maadi|zamalek|heliopolis|nasr\s+city))/i,
                    /location[:\s]*([a-zA-Z\s]+)/i,
                    /area[:\s]*([a-zA-Z\s]+)/i,
                    /district[:\s]*([a-zA-Z\s]+)/i,
                    /(new\s+administrative\s+capital|new\s+capital|6th\s+of\s+october|sheikh\s+zayed|maadi|zamalek|heliopolis|nasr\s+city|downtown|garden\s+city|dokki|mohandeseen|giza|alexandria|hurghada|sharm\s+el\s+sheikh)/i
                ],
                
                // Property type patterns (DEMAND)
                propertyType: [
                    /(apartment|flat|villa|townhouse|duplex|studio|penthouse|chalet|office|shop|warehouse|land|plot)/i,
                    /(\d+)\s*(bed|bedroom|br)\s*(apartment|flat|villa)/i,
                    /(\d+)\s*(bath|bathroom|br)\s*(apartment|flat|villa)/i,
                    /property\s*type[:\s]*([a-zA-Z\s]+)/i
                ],
                
                // Size patterns (DEMAND)
                size: [
                    /(\d+)\s*(sqm|m2|meter|square\s*meter|متر)/i,
                    /size[:\s]*(\d+)\s*(sqm|m2|meter|square\s*meter)/i,
                    /area[:\s]*(\d+)\s*(sqm|m2|meter|square\s*meter)/i
                ],
                
                // Contact information patterns
                contact: [
                    /(?:call|contact|phone|mobile|whatsapp)[:\s]*(\+?20\d{10}|\d{11})/i,
                    /(\+?20\d{10}|\d{11})/,
                    /email[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i
                ],
                
                // Intent patterns
                intent: [
                    /(?:want|need|looking\s+for|interested\s+in|searching\s+for)\s+(buy|purchase|rent|lease|investment)/i,
                    /(buy|purchase|rent|lease|investment)\s+(?:property|apartment|villa|flat)/i
                ]
            },
            
            // Arabic patterns for Egyptian market
            arabicPatterns: {
                budget: [
                    /ميزانية[:\s]*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(جنيه|مليون|ألف)/i,
                    /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(جنيه|مليون|ألف)/i
                ],
                location: [
                    /(?:في|بـ)\s+([a-zA-Zأ-ي\s]+)/i,
                    /(القاهرة الجديدة|المعادي|الزمالك|مصر الجديدة|مدينة نصر|الشيخ زايد|السادس من أكتوبر)/i
                ],
                propertyType: [
                    /(شقة|فيلا|دوبلكس|استوديو|بنتهاوس|محل|مكتب|أرض|قطعة أرض)/i
                ]
            }
        };
    }

    /**
     * Initialize property matching weights for scoring algorithm
     */
    initializePropertyWeights() {
        return {
            location: 0.35,      // Location match is most important
            budget: 0.25,        // Budget compatibility
            propertyType: 0.20,  // Property type preference
            size: 0.15,          // Size requirements
            amenities: 0.05      // Additional features
        };
    }

    /**
     * Initialize intent classifier for demand categorization
     */
    initializeIntentClassifier() {
        return {
            categories: {
                BUY: ['buy', 'purchase', 'invest', 'own', 'ownership'],
                RENT: ['rent', 'lease', 'rental', 'monthly', 'tenant'],
                SELL: ['sell', 'selling', 'market', 'list', 'offer'],
                INVEST: ['investment', 'roi', 'return', 'profit', 'portfolio']
            },
            confidence: {
                HIGH: 0.8,
                MEDIUM: 0.6,
                LOW: 0.4
            }
        };
    }

    /**
     * Initialize sentiment analyzer for lead quality assessment
     */
    initializeSentimentAnalyzer() {
        return {
            positive: ['excellent', 'perfect', 'amazing', 'interested', 'ready', 'urgent', 'serious'],
            negative: ['expensive', 'small', 'far', 'bad', 'disappointed', 'not interested'],
            neutral: ['okay', 'fine', 'maybe', 'consider', 'think', 'later']
        };
    }

    /**
     * CORE FUNCTION: Process incoming message and extract customer requirements (DEMAND)
     * This does NOT generate auto-responses, only analyzes requirements
     */
    async processMessage(message, sender, conversationId) {
        try {
            console.log('[AI Matcher] Processing message for demand analysis:', message.substring(0, 100));
            
            // Extract customer requirements from message
            const requirements = await this.extractCustomerRequirements(message, sender);
            
            // Store/update customer requirements in demand database
            this.customerRequirements.set(sender, {
                ...this.customerRequirements.get(sender),
                ...requirements,
                lastUpdated: Date.now(),
                conversationId: conversationId,
                messageHistory: this.getMessageHistory(conversationId)
            });

            // Find matching properties from supply inventory
            const matchingResults = await this.findMatchingProperties(requirements, sender);
            
            // Store matching results for human agent review
            this.matchingResults.set(sender, matchingResults);
            
            // Return analysis results (NO AUTO-RESPONSE)
            return {
                success: true,
                demandAnalysis: requirements,
                matchingProperties: matchingResults,
                recommendedAction: this.generateActionRecommendation(requirements, matchingResults),
                leadQuality: this.assessLeadQuality(requirements),
                shouldHumanContact: this.shouldHumanAgentContact(requirements, matchingResults)
            };
            
        } catch (error) {
            console.error('[AI Matcher] Error processing message:', error);
            return {
                success: false,
                error: error.message,
                demandAnalysis: null,
                matchingProperties: []
            };
        }
    }

    /**
     * Extract customer requirements from natural language message
     */
    async extractCustomerRequirements(message, sender) {
        const requirements = {
            intent: null,
            budget: null,
            location: null,
            propertyType: null,
            size: null,
            bedrooms: null,
            bathrooms: null,
            contact: null,
            urgency: 'medium',
            sentiment: 'neutral',
            confidence: 0,
            extractedAt: Date.now()
        };

        // Extract budget
        const budgetMatch = this.extractBudget(message);
        if (budgetMatch) {
            requirements.budget = budgetMatch;
            requirements.confidence += 0.2;
        }

        // Extract location
        const locationMatch = this.extractLocation(message);
        if (locationMatch) {
            requirements.location = locationMatch;
            requirements.confidence += 0.25;
        }

        // Extract property type
        const typeMatch = this.extractPropertyType(message);
        if (typeMatch) {
            requirements.propertyType = typeMatch;
            requirements.confidence += 0.2;
        }

        // Extract size
        const sizeMatch = this.extractSize(message);
        if (sizeMatch) {
            requirements.size = sizeMatch;
            requirements.confidence += 0.15;
        }

        // Extract intent
        const intentMatch = this.classifyIntent(message);
        if (intentMatch) {
            requirements.intent = intentMatch;
            requirements.confidence += 0.2;
        }

        // Analyze sentiment and urgency
        requirements.sentiment = this.analyzeSentiment(message);
        requirements.urgency = this.assessUrgency(message);

        console.log('[AI Matcher] Extracted requirements:', requirements);
        return requirements;
    }

    /**
     * Find matching properties from supply inventory based on customer requirements
     */
    async findMatchingProperties(requirements, customerId) {
        const matches = [];
        
        // Load property inventory if not cached
        if (this.propertyInventory.size === 0) {
            await this.loadPropertyInventory();
        }

        // Calculate matching scores for each property
        for (const [propertyId, property] of this.propertyInventory) {
            const matchScore = this.calculateMatchingScore(requirements, property);
            
            if (matchScore >= this.matchingThreshold) {
                matches.push({
                    propertyId: propertyId,
                    property: property,
                    matchScore: matchScore,
                    matchReasons: this.generateMatchReasons(requirements, property, matchScore),
                    recommendedAction: this.getRecommendedAction(matchScore)
                });
            }
        }

        // Sort by matching score (best matches first)
        matches.sort((a, b) => b.matchScore - a.matchScore);
        
        console.log(`[AI Matcher] Found ${matches.length} matching properties for customer ${customerId}`);
        return matches.slice(0, 10); // Return top 10 matches
    }

    /**
     * Calculate matching score between customer requirements and property
     */
    calculateMatchingScore(requirements, property) {
        let totalScore = 0;
        let totalWeight = 0;

        // Location matching
        if (requirements.location && property.location) {
            const locationScore = this.calculateLocationMatch(requirements.location, property.location);
            totalScore += locationScore * this.propertyMatchingWeights.location;
            totalWeight += this.propertyMatchingWeights.location;
        }

        // Budget matching
        if (requirements.budget && property.price) {
            const budgetScore = this.calculateBudgetMatch(requirements.budget, property.price);
            totalScore += budgetScore * this.propertyMatchingWeights.budget;
            totalWeight += this.propertyMatchingWeights.budget;
        }

        // Property type matching
        if (requirements.propertyType && property.type) {
            const typeScore = this.calculateTypeMatch(requirements.propertyType, property.type);
            totalScore += typeScore * this.propertyMatchingWeights.propertyType;
            totalWeight += this.propertyMatchingWeights.propertyType;
        }

        // Size matching
        if (requirements.size && property.size) {
            const sizeScore = this.calculateSizeMatch(requirements.size, property.size);
            totalScore += sizeScore * this.propertyMatchingWeights.size;
            totalWeight += this.propertyMatchingWeights.size;
        }

        return totalWeight > 0 ? totalScore / totalWeight : 0;
    }

    /**
     * Load property inventory from database (SUPPLY)
     */
    async loadPropertyInventory() {
        try {
            // Load from RESTful Table API
            const response = await fetch('tables/properties');
            const data = await response.json();
            
            if (data.success && data.data) {
                data.data.forEach(property => {
                    this.propertyInventory.set(property.id, {
                        id: property.id,
                        title: property.title,
                        type: property.property_type,
                        location: property.location,
                        price: property.price,
                        size: property.size,
                        bedrooms: property.bedrooms,
                        bathrooms: property.bathrooms,
                        amenities: property.amenities || [],
                        status: property.status,
                        listedDate: property.created_at,
                        agent: property.agent_id
                    });
                });
                
                console.log(`[AI Matcher] Loaded ${this.propertyInventory.size} properties to inventory`);
            }
        } catch (error) {
            console.error('[AI Matcher] Error loading property inventory:', error);
        }
    }

    /**
     * Add new property to supply inventory
     */
    addPropertyToInventory(property) {
        this.propertyInventory.set(property.id, property);
        console.log(`[AI Matcher] Added property ${property.id} to supply inventory`);
        
        // Trigger re-matching for existing demands
        this.triggerReMatching();
    }

    /**
     * Update existing property in supply inventory
     */
    updatePropertyInInventory(propertyId, updatedProperty) {
        if (this.propertyInventory.has(propertyId)) {
            this.propertyInventory.set(propertyId, updatedProperty);
            console.log(`[AI Matcher] Updated property ${propertyId} in supply inventory`);
            
            // Trigger re-matching for existing demands
            this.triggerReMatching();
        }
    }

    /**
     * Remove property from supply inventory
     */
    removePropertyFromInventory(propertyId) {
        if (this.propertyInventory.delete(propertyId)) {
            console.log(`[AI Matcher] Removed property ${propertyId} from supply inventory`);
        }
    }

    /**
     * Trigger re-matching of all existing customer requirements with updated inventory
     */
    async triggerReMatching() {
        console.log('[AI Matcher] Triggering re-matching for all customers');
        
        for (const [customerId, requirements] of this.customerRequirements) {
            const newMatches = await this.findMatchingProperties(requirements, customerId);
            this.matchingResults.set(customerId, newMatches);
        }
        
        // Notify UI of updated matches
        if (window.uiManager) {
            window.uiManager.updateMatchingResults();
        }
    }

    /**
     * Generate action recommendations for human agents
     */
    generateActionRecommendation(requirements, matches) {
        if (matches.length === 0) {
            return {
                action: 'NO_MATCHES',
                priority: 'medium',
                suggestion: 'No properties match current requirements. Consider expanding search criteria or adding new properties to inventory.',
                followUp: 'Contact customer to discuss alternative options or adjust requirements.'
            };
        }

        const bestMatch = matches[0];
        if (bestMatch.matchScore >= 0.9) {
            return {
                action: 'EXCELLENT_MATCH',
                priority: 'high',
                suggestion: `Excellent match found (${Math.round(bestMatch.matchScore * 100)}% compatibility). Recommend immediate contact.`,
                followUp: 'Schedule property viewing or send detailed property information.'
            };
        }

        if (bestMatch.matchScore >= 0.8) {
            return {
                action: 'GOOD_MATCH',
                priority: 'medium',
                suggestion: `Good match found (${Math.round(bestMatch.matchScore * 100)}% compatibility). Worth presenting to customer.`,
                followUp: 'Present top matches and gauge customer interest.'
            };
        }

        return {
            action: 'PARTIAL_MATCH',
            priority: 'low',
            suggestion: `Partial matches found. May need to adjust requirements or search criteria.`,
            followUp: 'Clarify customer requirements and preferences.'
        };
    }

    /**
     * Assess lead quality based on requirements completeness and characteristics
     */
    assessLeadQuality(requirements) {
        let score = 0;
        const factors = [];

        // Budget clarity
        if (requirements.budget) {
            score += 25;
            factors.push('Clear budget specified');
        }

        // Location specificity
        if (requirements.location) {
            score += 20;
            factors.push('Specific location preference');
        }

        // Property type clarity
        if (requirements.propertyType) {
            score += 15;
            factors.push('Property type specified');
        }

        // Intent clarity
        if (requirements.intent) {
            score += 20;
            factors.push('Clear purchase/rental intent');
        }

        // Urgency level
        if (requirements.urgency === 'high') {
            score += 15;
            factors.push('High urgency indicated');
        } else if (requirements.urgency === 'medium') {
            score += 10;
            factors.push('Medium urgency indicated');
        }

        // Sentiment
        if (requirements.sentiment === 'positive') {
            score += 5;
            factors.push('Positive sentiment');
        }

        return {
            score: Math.min(score, 100),
            quality: score >= 80 ? 'HIGH' : score >= 60 ? 'MEDIUM' : 'LOW',
            factors: factors
        };
    }

    /**
     * Determine if human agent should contact customer immediately
     */
    shouldHumanAgentContact(requirements, matches) {
        const leadQuality = this.assessLeadQuality(requirements);
        
        // High-quality lead with good matches
        if (leadQuality.quality === 'HIGH' && matches.length > 0 && matches[0].matchScore >= 0.8) {
            return {
                shouldContact: true,
                priority: 'HIGH',
                reason: 'High-quality lead with excellent property matches',
                timeframe: 'within 1 hour'
            };
        }

        // Urgent requirements
        if (requirements.urgency === 'high') {
            return {
                shouldContact: true,
                priority: 'HIGH',
                reason: 'Customer indicated urgent requirements',
                timeframe: 'within 2 hours'
            };
        }

        // Good lead quality
        if (leadQuality.quality === 'MEDIUM' && matches.length > 0) {
            return {
                shouldContact: true,
                priority: 'MEDIUM',
                reason: 'Good lead with available property matches',
                timeframe: 'within 24 hours'
            };
        }

        return {
            shouldContact: false,
            priority: 'LOW',
            reason: 'Lead needs more information or no suitable matches available',
            timeframe: 'follow up when more properties available'
        };
    }

    // Helper methods for pattern extraction and matching
    extractBudget(message) {
        for (const pattern of this.leadExtractionRules.patterns.budget) {
            const match = message.match(pattern);
            if (match) {
                let amount = parseFloat(match[1].replace(/,/g, ''));
                const unit = match[2].toLowerCase();
                
                // Convert to standard format (EGP)
                if (unit.includes('million')) amount *= 1000000;
                else if (unit.includes('k') || unit.includes('thousand')) amount *= 1000;
                
                return {
                    amount: amount,
                    currency: 'EGP',
                    raw: match[0]
                };
            }
        }
        return null;
    }

    extractLocation(message) {
        for (const pattern of this.leadExtractionRules.patterns.location) {
            const match = message.match(pattern);
            if (match) {
                return {
                    area: match[1].trim(),
                    raw: match[0],
                    confidence: 0.8
                };
            }
        }
        return null;
    }

    extractPropertyType(message) {
        for (const pattern of this.leadExtractionRules.patterns.propertyType) {
            const match = message.match(pattern);
            if (match) {
                return {
                    type: match[1] || match[0],
                    raw: match[0],
                    confidence: 0.9
                };
            }
        }
        return null;
    }

    extractSize(message) {
        for (const pattern of this.leadExtractionRules.patterns.size) {
            const match = message.match(pattern);
            if (match) {
                return {
                    area: parseInt(match[1]),
                    unit: 'sqm',
                    raw: match[0]
                };
            }
        }
        return null;
    }

    classifyIntent(message) {
        const text = message.toLowerCase();
        
        for (const [intent, keywords] of Object.entries(this.intentClassifier.categories)) {
            for (const keyword of keywords) {
                if (text.includes(keyword)) {
                    return {
                        intent: intent,
                        confidence: 0.8,
                        keyword: keyword
                    };
                }
            }
        }
        
        return null;
    }

    analyzeSentiment(message) {
        const text = message.toLowerCase();
        
        let positiveScore = 0;
        let negativeScore = 0;
        
        for (const word of this.sentimentAnalyzer.positive) {
            if (text.includes(word)) positiveScore++;
        }
        
        for (const word of this.sentimentAnalyzer.negative) {
            if (text.includes(word)) negativeScore++;
        }
        
        if (positiveScore > negativeScore) return 'positive';
        if (negativeScore > positiveScore) return 'negative';
        return 'neutral';
    }

    assessUrgency(message) {
        const urgentKeywords = ['urgent', 'asap', 'immediately', 'today', 'now', 'quick'];
        const text = message.toLowerCase();
        
        for (const keyword of urgentKeywords) {
            if (text.includes(keyword)) return 'high';
        }
        
        if (text.includes('soon') || text.includes('this week')) return 'medium';
        
        return 'low';
    }

    // Matching calculation helper methods
    calculateLocationMatch(reqLocation, propLocation) {
        // Implement location matching logic (can be enhanced with geographical data)
        const req = reqLocation.area.toLowerCase();
        const prop = propLocation.toLowerCase();
        
        if (req === prop) return 1.0;
        if (prop.includes(req) || req.includes(prop)) return 0.8;
        
        // Add more sophisticated location matching here
        return 0.0;
    }

    calculateBudgetMatch(reqBudget, propPrice) {
        const budget = reqBudget.amount;
        const price = propPrice;
        
        if (price <= budget) {
            // Property is within budget
            const ratio = price / budget;
            return ratio >= 0.7 ? 1.0 : ratio; // Prefer properties closer to budget
        } else {
            // Property exceeds budget
            const overBudget = (price - budget) / budget;
            if (overBudget <= 0.1) return 0.8; // 10% over budget is acceptable
            if (overBudget <= 0.2) return 0.6; // 20% over budget is marginal
            return 0.0; // Too expensive
        }
    }

    calculateTypeMatch(reqType, propType) {
        const req = reqType.type.toLowerCase();
        const prop = propType.toLowerCase();
        
        if (req === prop) return 1.0;
        
        // Similar types
        const similarTypes = {
            'apartment': ['flat', 'unit'],
            'villa': ['house', 'townhouse'],
            'studio': ['loft']
        };
        
        for (const [type, similars] of Object.entries(similarTypes)) {
            if (req === type && similars.includes(prop)) return 0.8;
            if (prop === type && similars.includes(req)) return 0.8;
        }
        
        return 0.0;
    }

    calculateSizeMatch(reqSize, propSize) {
        const required = reqSize.area;
        const available = propSize;
        
        const difference = Math.abs(available - required) / required;
        
        if (difference <= 0.1) return 1.0; // Within 10%
        if (difference <= 0.2) return 0.8; // Within 20%
        if (difference <= 0.3) return 0.6; // Within 30%
        
        return 0.0;
    }

    generateMatchReasons(requirements, property, score) {
        const reasons = [];
        
        if (requirements.location && property.location) {
            const locationScore = this.calculateLocationMatch(requirements.location, property.location);
            if (locationScore >= 0.8) {
                reasons.push(`Excellent location match: ${property.location}`);
            } else if (locationScore > 0) {
                reasons.push(`Good location proximity: ${property.location}`);
            }
        }
        
        if (requirements.budget && property.price) {
            const budgetScore = this.calculateBudgetMatch(requirements.budget, property.price);
            if (budgetScore >= 0.8) {
                reasons.push(`Within budget: ${property.price.toLocaleString()} EGP`);
            } else if (budgetScore > 0) {
                reasons.push(`Near budget range: ${property.price.toLocaleString()} EGP`);
            }
        }
        
        return reasons;
    }

    getRecommendedAction(score) {
        if (score >= 0.9) return 'IMMEDIATE_CONTACT';
        if (score >= 0.8) return 'SCHEDULE_VIEWING';
        if (score >= 0.7) return 'PRESENT_OPTION';
        return 'COLLECT_MORE_INFO';
    }

    getMessageHistory(conversationId) {
        return this.conversationHistory.get(conversationId) || [];
    }

    /**
     * Get all customer requirements (DEMAND overview)
     */
    getAllCustomerRequirements() {
        const demands = [];
        
        for (const [customerId, requirements] of this.customerRequirements) {
            const matches = this.matchingResults.get(customerId) || [];
            const leadQuality = this.assessLeadQuality(requirements);
            
            demands.push({
                customerId: customerId,
                requirements: requirements,
                matchingProperties: matches.length,
                bestMatchScore: matches.length > 0 ? matches[0].matchScore : 0,
                leadQuality: leadQuality,
                lastUpdated: requirements.lastUpdated
            });
        }
        
        return demands.sort((a, b) => b.lastUpdated - a.lastUpdated);
    }

    /**
     * Get all property inventory (SUPPLY overview)
     */
    getAllPropertyInventory() {
        return Array.from(this.propertyInventory.values());
    }

    /**
     * Get matching statistics and insights
     */
    getMatchingStatistics() {
        const totalSupply = this.propertyInventory.size;
        const totalDemand = this.customerRequirements.size;
        let totalMatches = 0;
        let excellentMatches = 0;
        
        for (const matches of this.matchingResults.values()) {
            totalMatches += matches.length;
            excellentMatches += matches.filter(m => m.matchScore >= 0.9).length;
        }
        
        return {
            supply: {
                totalProperties: totalSupply,
                availableProperties: Array.from(this.propertyInventory.values()).filter(p => p.status === 'available').length
            },
            demand: {
                totalCustomers: totalDemand,
                activeRequirements: Array.from(this.customerRequirements.values()).filter(r => Date.now() - r.lastUpdated < 7 * 24 * 60 * 60 * 1000).length
            },
            matching: {
                totalMatches: totalMatches,
                excellentMatches: excellentMatches,
                matchingEfficiency: totalDemand > 0 ? (totalMatches / totalDemand) : 0
            }
        };
    }
}

// Export for use in other modules
window.AIProcessor = AIProcessor;