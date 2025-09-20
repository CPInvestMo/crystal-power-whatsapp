/**
 * Main Application Entry Point
 * Initializes and coordinates all WhatsApp Business Integration components
 */

class CrystalIntelligenceApp {
    constructor() {
        this.whatsappAPI = null;
        this.uiManager = null;
        this.aiProcessor = null;
        this.isInitialized = false;
        this.config = {
            polling_interval: 5000,
            webhook_verify_token: 'crystal_intelligence_webhook_token_2024',
            max_retries: 3,
            retry_delay: 1000
        };
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('🚀 Initializing Crystal Intelligence WhatsApp Integration...');
            
            // Initialize components
            this.whatsappAPI = new WhatsAppAPI();
            this.uiManager = new UIManager();
            this.aiProcessor = new AIProcessor();

            // Make instances globally available
            window.whatsappAPI = this.whatsappAPI;
            window.uiManager = this.uiManager;
            window.aiProcessor = this.aiProcessor;
            window.app = this;

            // Initialize UI Manager
            await this.uiManager.init();

            // Setup error handling
            this.setupErrorHandling();

            // Load saved session if exists
            await this.loadSavedSession();

            // Initialize demo data if needed
            await this.initializeDemoData();

            this.isInitialized = true;
            console.log('✅ Application initialized successfully');

            // Show welcome message
            this.showWelcomeMessage();

        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * Setup global error handling
     */
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.uiManager.showNotification('An unexpected error occurred', 'error');
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.uiManager.showNotification('Operation failed', 'error');
        });
    }

    /**
     * Load saved WhatsApp session
     */
    async loadSavedSession() {
        try {
            const response = await fetch('tables/whatsapp_sessions?limit=1');
            const data = await response.json();
            
            if (data.data && data.data.length > 0) {
                const session = data.data[0];
                
                if (session.status === 'authenticated' && session.access_token) {
                    console.log('📱 Found saved WhatsApp session');
                    
                    // Auto-connect if session is valid
                    const result = await this.whatsappAPI.connect(
                        session.access_token,
                        session.phone_number_id,
                        session.phone_number
                    );
                    
                    if (result.success) {
                        console.log('✅ Auto-connected to saved WhatsApp session');
                        this.uiManager.showNotification('Connected to WhatsApp Business', 'success');
                    }
                }
            }
        } catch (error) {
            console.log('ℹ️ No saved session found or connection failed');
        }
    }

    /**
     * Initialize demo data for testing
     */
    async initializeDemoData() {
        try {
            // Check if we already have data
            const propertiesResponse = await fetch('tables/properties?limit=1');
            const propertiesData = await propertiesResponse.json();
            
            if (!propertiesData.data || propertiesData.data.length === 0) {
                console.log('📝 Initializing demo data...');
                await this.createDemoProperties();
                await this.createDemoTemplates();
                console.log('✅ Demo data initialized');
            }
        } catch (error) {
            console.error('Error initializing demo data:', error);
        }
    }

    /**
     * Create demo properties
     */
    async createDemoProperties() {
        const demoProperties = [
            {
                id: 'prop_villa_001',
                title: 'Luxury Villa in Beverly Hills Compound',
                description: 'Stunning 5-bedroom villa with private pool, garden, and modern amenities. Located in the prestigious Beverly Hills compound in 6th October City. Perfect for families seeking luxury and comfort with 24/7 security.',
                property_type: 'villa',
                price: 8500000,
                bedrooms: 5,
                bathrooms: 4,
                area: 500,
                location: '6th October',
                address: 'Beverly Hills Compound, 6th October City, Giza, Egypt',
                features: ['Private Pool', 'Garden', 'Maid\'s Room', 'Garage', '24/7 Security', 'Gym', 'Kids Area'],
                images: [
                    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop',
                    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop'
                ],
                status: 'available',
                agent_contact: 'Ahmed Hassan - +20 100 123 4567',
                virtual_tour_url: 'https://example.com/virtual-tour-villa-001',
                listing_date: '2024-11-01T10:00:00Z'
            },
            {
                id: 'prop_penthouse_001',
                title: 'Penthouse with Panoramic Views - New Cairo',
                description: 'Exclusive 4-bedroom penthouse with breathtaking city views, private pool, and premium finishes. Located in the heart of New Cairo\'s most prestigious tower. Features include smart home automation and concierge services.',
                property_type: 'penthouse',
                price: 12500000,
                bedrooms: 4,
                bathrooms: 3,
                area: 350,
                location: 'New Cairo',
                address: 'Crystal Towers, Fifth Settlement, New Cairo, Egypt',
                features: ['Private Pool', 'City Views', 'Smart Home', 'Concierge', 'Gym', 'Spa', 'Parking'],
                images: [
                    'https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=800&h=600&fit=crop',
                    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&h=600&fit=crop'
                ],
                status: 'available',
                agent_contact: 'Fatima Ali - +20 111 234 5678',
                virtual_tour_url: 'https://example.com/virtual-tour-penthouse-001',
                listing_date: '2024-11-15T14:00:00Z'
            },
            {
                id: 'prop_apartment_001',
                title: 'Modern 3BR Apartment in Compound',
                description: 'Beautiful 3-bedroom apartment in a gated compound with swimming pool, gym, and landscaped gardens. Ideal for families looking for a secure and comfortable living environment.',
                property_type: 'apartment',
                price: 4800000,
                bedrooms: 3,
                bathrooms: 2,
                area: 180,
                location: 'New Cairo',
                address: 'Green Residence Compound, New Cairo, Egypt',
                features: ['Swimming Pool', 'Gym', 'Gardens', 'Security', 'Parking', 'Playground'],
                images: [
                    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop',
                    'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=800&h=600&fit=crop'
                ],
                status: 'available',
                agent_contact: 'Mohamed Nasser - +20 122 345 6789',
                virtual_tour_url: 'https://example.com/virtual-tour-apartment-001',
                listing_date: '2024-11-20T09:00:00Z'
            },
            {
                id: 'prop_studio_001',
                title: 'Elegant Studio in Zamalek',
                description: 'Charming studio apartment in the heart of Zamalek with Nile views. Perfect for young professionals or investors. Walking distance to restaurants, cafes, and cultural attractions.',
                property_type: 'studio',
                price: 2800000,
                bedrooms: 1,
                bathrooms: 1,
                area: 75,
                location: 'Zamalek',
                address: '26th July Street, Zamalek, Cairo, Egypt',
                features: ['Nile View', 'Furnished', 'Elevator', 'Security', 'Balcony'],
                images: [
                    'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800&h=600&fit=crop'
                ],
                status: 'available',
                agent_contact: 'Sara Mohamed - +20 100 987 6543',
                virtual_tour_url: '',
                listing_date: '2024-11-10T11:00:00Z'
            },
            {
                id: 'prop_villa_002',
                title: 'Family Villa in Compound with Pool',
                description: 'Spacious 4-bedroom villa with private swimming pool and garden. Located in a family-friendly compound in Sheikh Zayed with excellent amenities and 24/7 security.',
                property_type: 'villa',
                price: 6200000,
                bedrooms: 4,
                bathrooms: 3,
                area: 400,
                location: 'Sheikh Zayed',
                address: 'Palm Hills Compound, Sheikh Zayed City, Giza, Egypt',
                features: ['Private Pool', 'Garden', 'Security', 'Club House', 'Sports Courts', 'Kids Area'],
                images: [
                    'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&h=600&fit=crop',
                    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&h=600&fit=crop'
                ],
                status: 'available',
                agent_contact: 'Omar Ibrahim - +20 101 456 7890',
                virtual_tour_url: 'https://example.com/virtual-tour-villa-002',
                listing_date: '2024-11-08T13:00:00Z'
            }
        ];

        for (const property of demoProperties) {
            try {
                await fetch('tables/properties', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(property)
                });
            } catch (error) {
                console.error(`Error creating property ${property.id}:`, error);
            }
        }
    }

    /**
     * Create demo templates
     */
    async createDemoTemplates() {
        const demoTemplates = [
            {
                id: 'template_welcome',
                name: 'Welcome Message',
                category: 'greeting',
                trigger_keywords: ['hello', 'hi', 'start', 'مرحبا', 'السلام عليكم'],
                content: `Welcome to Crystal Intelligence! 🏠✨

I'm here to help you find your dream property in Egypt. Please tell me:

1️⃣ What type of property are you looking for? (Villa, Apartment, Studio, Penthouse)
2️⃣ Your preferred location
3️⃣ Your budget range

Our AI will instantly match you with the best properties!`,
                media_type: 'none',
                media_url: '',
                active: true,
                usage_count: 0,
                success_rate: 0
            },
            {
                id: 'template_property_info',
                name: 'Property Information',
                category: 'property_info',
                trigger_keywords: ['show', 'properties', 'match', 'available'],
                content: `🏡 **{{title}}**

💰 Price: {{price}} EGP
📍 Location: {{location}}
🏠 {{bedrooms}} bedrooms, {{bathrooms}} bathrooms
📐 Area: {{area}} sqm

{{description}}

✨ Features: {{features}}

📞 Contact: {{agent_contact}}

Would you like to schedule a viewing? 📅 Just let me know your preferred time!`,
                media_type: 'image',
                media_url: '',
                active: true,
                usage_count: 0,
                success_rate: 0
            },
            {
                id: 'template_follow_up',
                name: 'Follow Up Message',
                category: 'follow_up',
                trigger_keywords: ['follow up', 'check', 'interested'],
                content: `Hi {{name}},

I hope you're doing well! I wanted to follow up on the properties I shared with you earlier.

Have you had a chance to review them? I'd be happy to:
• Schedule a viewing
• Provide more details
• Show you similar properties
• Answer any questions

What would work best for you?

Best regards,
Crystal Intelligence Team`,
                media_type: 'none',
                media_url: '',
                active: true,
                usage_count: 0,
                success_rate: 0
            },
            {
                id: 'template_appointment',
                name: 'Appointment Booking',
                category: 'appointment',
                trigger_keywords: ['viewing', 'visit', 'appointment', 'schedule'],
                content: `Great! I'd be happy to schedule a viewing for you.

🏡 Property: {{property_title}}
📅 Available times:
• Tomorrow 10:00 AM - 12:00 PM
• Tomorrow 2:00 PM - 4:00 PM
• Day after tomorrow 10:00 AM - 12:00 PM

Please let me know which time works best for you, or suggest another time that's convenient.

📞 Contact: {{agent_contact}}

Looking forward to showing you this amazing property! 🏠`,
                media_type: 'none',
                media_url: '',
                active: true,
                usage_count: 0,
                success_rate: 0
            },
            {
                id: 'template_qualification',
                name: 'Lead Qualification',
                category: 'qualification',
                trigger_keywords: ['budget', 'financing', 'payment', 'cash'],
                content: `Thank you for your interest! To help me find the perfect property for you, could you please share:

💰 Your budget range?
🏠 Preferred property type? (Villa/Apartment/Studio/Penthouse)
📍 Preferred location?
👨‍👩‍👧‍👦 Family size or number of bedrooms needed?
🕐 Timeline for purchase/move-in?
💳 Payment method? (Cash/Mortgage/Installments)

This information will help me match you with the most suitable properties! 🎯`,
                media_type: 'none',
                media_url: '',
                active: true,
                usage_count: 0,
                success_rate: 0
            },
            {
                id: 'template_closing',
                name: 'Closing Message',
                category: 'closing',
                trigger_keywords: ['buy', 'purchase', 'interested', 'decision'],
                content: `Excellent choice! 🎉

I'm excited to help you with this property. Here are the next steps:

1️⃣ Property viewing (if not done yet)
2️⃣ Property inspection and due diligence
3️⃣ Price negotiation
4️⃣ Contract preparation and legal review
5️⃣ Financing arrangement (if needed)
6️⃣ Final closing and key handover

📞 I'll connect you directly with our senior agent: {{agent_contact}}

They will guide you through each step to ensure a smooth transaction. 

Congratulations on finding your dream property! 🏠✨`,
                media_type: 'none',
                media_url: '',
                active: true,
                usage_count: 0,
                success_rate: 0
            }
        ];

        for (const template of demoTemplates) {
            try {
                await fetch('tables/message_templates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(template)
                });
            } catch (error) {
                console.error(`Error creating template ${template.id}:`, error);
            }
        }
    }

    /**
     * Handle initialization errors
     */
    handleInitializationError(error) {
        const errorContainer = document.createElement('div');
        errorContainer.className = 'fixed inset-0 bg-red-50 flex items-center justify-center z-50';
        errorContainer.innerHTML = `
            <div class="bg-white p-8 rounded-lg shadow-lg max-w-md">
                <div class="text-center">
                    <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
                    <h3 class="text-lg font-semibold text-gray-900 mb-2">Initialization Failed</h3>
                    <p class="text-gray-600 mb-4">There was an error starting the application.</p>
                    <button onclick="location.reload()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">
                        Retry
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(errorContainer);
    }

    /**
     * Show welcome message
     */
    showWelcomeMessage() {
        setTimeout(() => {
            this.uiManager.showNotification('Welcome to Crystal Intelligence WhatsApp Integration! 🏠✨', 'success');
        }, 1000);
    }
}

// Global functions for HTML events
async function connectWhatsApp() {
    const accessToken = document.getElementById('accessToken').value.trim();
    const phoneNumberId = document.getElementById('phoneNumberId').value.trim();
    const businessPhone = document.getElementById('businessPhone').value.trim();

    if (!accessToken || !phoneNumberId || !businessPhone) {
        window.uiManager.showNotification('Please fill in all required fields', 'warning');
        return;
    }

    try {
        const result = await window.whatsappAPI.connect(accessToken, phoneNumberId, businessPhone);
        
        if (result.success) {
            window.uiManager.showNotification('Connected to WhatsApp Business API successfully!', 'success');
            
            // Generate QR code
            window.whatsappAPI.generateQRCode();
            
            // Reload conversations
            window.uiManager.loadConversations();
        } else {
            window.uiManager.showNotification(result.message, 'error');
        }
    } catch (error) {
        console.error('Connection error:', error);
        window.uiManager.showNotification('Connection failed. Please check your credentials.', 'error');
    }
}

function generateQRCode() {
    if (window.whatsappAPI) {
        window.whatsappAPI.generateQRCode();
    } else {
        window.uiManager.showNotification('Please connect to WhatsApp API first', 'warning');
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📱 Crystal Intelligence WhatsApp Integration Starting...');
    
    const app = new CrystalIntelligenceApp();
    await app.init();
    
    // Make app globally accessible for debugging
    window.crystalApp = app;
});

// Export for testing and debugging
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CrystalIntelligenceApp;
}