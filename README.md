# Crystal Power WhatsApp Business API Integration

A comprehensive WhatsApp Business API integration platform for Crystal Power Investments, designed for real estate lead generation, automated property matching, and intelligent conversation management.

## 🌟 Project Overview

This platform provides a complete solution for managing WhatsApp Business communications, processing real estate leads through AI-powered analysis, and matching customers with suitable properties. Built specifically for Crystal Power Investments' real estate operations in Egypt.

### Key Features

- **WhatsApp Business API Integration**: Real API connections with webhook processing
- **AI-Powered Lead Processing**: Intent recognition, entity extraction, and lead scoring
- **Property Matching System**: Intelligent algorithms for optimal property recommendations
- **Legal Compliance**: Full Egypt PDPL (Personal Data Protection Law) compliance
- **Real-time Analytics**: Comprehensive dashboard with business intelligence
- **Mobile Responsive**: Optimized for all devices and screen sizes

## 🏗️ Project Structure

```
crystal-power-whatsapp/
├── src/                          # Source code files
│   ├── server.js                 # Main webhook server
│   ├── app.js                    # Core application logic
│   ├── whatsapp-api.js           # WhatsApp Business API integration
│   ├── ai-processor.js           # AI lead processing engine
│   ├── ui-manager.js             # Frontend UI management
│   ├── whatsapp-groups.js        # Group messaging functionality
│   └── privacy-compliance.js     # PDPL compliance module
├── public/                       # Frontend files
│   ├── index.html                # Main dashboard interface
│   ├── privacy-policy.html       # Legal privacy policy
│   └── api-testing-dashboard.html # API testing interface
├── docs/                         # Documentation
│   ├── README.md                 # Main documentation
│   ├── DEPLOYMENT.md             # Deployment instructions
│   ├── PRODUCTION_READY.md       # Production readiness guide
│   ├── LEGAL-DEPLOYMENT-CHECKLIST.md # Legal compliance checklist
│   └── MatchPro-Legal-Compliance-Package.pdf # Legal documentation
├── scripts/                      # Deployment and setup scripts
│   ├── setup.sh                 # Initial setup script
│   ├── deploy.sh                # Production deployment script
│   └── setup-repository.sh      # Repository initialization
├── tests/                        # Test files
│   ├── test-webhook.js           # Webhook testing
│   └── TEST_RESULTS.md           # Test documentation
├── config/                       # Configuration files
│   ├── env.example               # Environment variables template
│   └── .gitignore                # Git ignore rules
├── package.json                  # Node.js dependencies
└── .gitignore                    # Git ignore configuration
```

## 🚀 Quick Start

### Prerequisites

- Node.js 16.0.0 or higher
- WhatsApp Business API credentials from Meta
- Modern web browser with JavaScript enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/crystal-power-investments/whatsapp-webhook.git
   cd whatsapp-webhook
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp config/env.example .env
   # Edit .env with your WhatsApp Business API credentials
   ```

4. **Start the application**
   ```bash
   npm start
   ```

5. **Open the dashboard**
   - Navigate to `http://localhost:3000` in your browser
   - Or open `public/index.html` directly for frontend-only mode

### WhatsApp Business API Setup

1. **Get API Credentials**
   - Access Token from Meta Business Manager
   - Phone Number ID for your business number
   - Webhook verification token

2. **Configure Webhook**
   - Set webhook URL to your server endpoint
   - Subscribe to message events
   - Verify webhook connection

3. **Test Integration**
   - Send test messages to your business number
   - Verify webhook receives and processes messages
   - Check dashboard for lead processing results

## 📊 Core Functionality

### Lead Processing Pipeline

1. **Message Reception**: WhatsApp webhook receives incoming messages
2. **AI Analysis**: Extract intent, entities, and sentiment from messages
3. **Lead Scoring**: Calculate lead quality score (0-100)
4. **Property Matching**: Find suitable properties based on customer criteria
5. **Response Generation**: Send automated or template responses
6. **Analytics Update**: Update dashboard metrics and charts

### Property Matching Algorithm

The system uses a weighted scoring algorithm to match properties with customer requirements:

- **Budget Match (30%)**: ±10% = 100%, ±20% = 80%, ±50% = 40%
- **Location Match (25%)**: Exact = 100%, Alias = 100%, None = 0%
- **Property Type (20%)**: Exact = 100%, Different = 0%
- **Bedrooms (15%)**: Same = 100%, ±1 = 70%, ±2 = 40%
- **Bathrooms (10%)**: Same = 100%, ±1 = 80%

Minimum match threshold: 30%

### Lead Qualification Scoring

Base scores for different customer actions:
- Property Inquiry Intent: 40 points
- Budget Information: 25 points
- Location Specified: 20 points
- Contact Information: 15 points
- Appointment Request: 50 points

Sentiment multipliers:
- Positive Sentiment: +10 points
- High Urgency: +15 points
- Relevant Keywords: +5 points each

## 🔒 Legal Compliance

### Egypt PDPL Compliance

This system is fully compliant with Egypt's Personal Data Protection Law No. 151/2020:

- **Data Minimization**: Automated privacy-by-design processing
- **Consent Management**: Structured consent with audit trails
- **Data Subject Rights**: Access, rectification, erasure, objection, portability
- **Security Measures**: Encryption and access controls
- **Audit Logging**: Comprehensive activity logging per PDPL Article 28

### Required Legal Review

⚠️ **IMPORTANT**: Before production deployment, this system requires:

1. Review by qualified Egyptian data privacy counsel
2. Data Protection Officer certification
3. Executive authorization from Crystal Power Investments
4. PDPC registration verification
5. Insurance coverage confirmation

See `docs/LEGAL-DEPLOYMENT-CHECKLIST.md` for complete requirements.

## 🛠️ Development

### Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start development server with auto-reload
- `npm test` - Run webhook tests
- `npm run health` - Check server health status

### API Endpoints

The system provides RESTful API endpoints for data management:

```javascript
// Conversations
GET    /tables/conversations              // List all conversations
GET    /tables/conversations/{id}         // Get specific conversation
POST   /tables/conversations              // Create new conversation
PATCH  /tables/conversations/{id}         // Update conversation

// Messages
GET    /tables/messages                   // List all messages
POST   /tables/messages                   // Send new message
PATCH  /tables/messages/{id}              // Update message status

// Leads
GET    /tables/leads                      // List all leads
POST   /tables/leads                      // Create new lead
PATCH  /tables/leads/{id}                 // Update lead information

// Properties
GET    /tables/properties                 // List all properties
POST   /tables/properties                 // Add new property
PATCH  /tables/properties/{id}            // Update property
```

### Testing

Run the test suite to verify webhook functionality:

```bash
npm test
```

This will test:
- Webhook message processing
- AI lead extraction
- Property matching algorithms
- Database operations
- Response generation

## 🚀 Deployment

### Production Deployment

1. **Prepare Environment**
   ```bash
   chmod +x scripts/deploy.sh
   ./scripts/deploy.sh
   ```

2. **Configure Production Settings**
   - Set production environment variables
   - Configure HTTPS certificates
   - Set up domain and DNS
   - Configure webhook URLs

3. **Deploy Application**
   - Upload files to production server
   - Install dependencies
   - Start application services
   - Verify webhook connectivity

### Hosting Options

- **VPS/Dedicated Server**: Full control, custom configuration
- **Cloud Platforms**: AWS, Google Cloud, Azure
- **PaaS Solutions**: Heroku, DigitalOcean App Platform
- **Serverless**: AWS Lambda, Vercel Functions

See `docs/DEPLOYMENT.md` for detailed deployment instructions.

## 📈 Analytics & Monitoring

### Key Performance Indicators

- **Lead Capture Rate**: Percentage of WhatsApp messages processed
- **Matching Accuracy**: Successful property matches percentage
- **Agent Response Time**: Average time to respond to leads
- **Conversion Rate**: Leads converted to actual sales
- **System Availability**: Uptime and reliability metrics

### Dashboard Features

- Real-time conversation management
- Lead qualification and scoring
- Property matching results
- Response time analytics
- Message volume charts
- Performance monitoring

## 🤝 Contributing

### Development Guidelines

1. Follow existing code structure and naming conventions
2. Add tests for new functionality
3. Update documentation for changes
4. Ensure PDPL compliance for data handling
5. Test thoroughly before submitting changes

### Code Style

- Use consistent indentation (2 spaces)
- Add comments for complex logic
- Follow JavaScript ES6+ standards
- Use meaningful variable and function names
- Implement error handling and logging

## 📞 Support & Contact

### Crystal Power Investments

- **Website**: https://crystalpower.eg
- **Email**: info@crystalpower.eg
- **Location**: Cairo, Egypt

### Technical Support

- **System Admin**: admin@crystalpower.eg
- **Technical Support**: support@crystalpower.eg
- **Data Protection Officer**: dpo@crystalpower.eg

### Legal & Compliance

- **Legal Counsel**: legal@crystalpower.eg
- **Incident Response**: incident@crystalpower.eg
- **DPO Hotline**: +20-XXX-XXX-XXXX

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🏆 Acknowledgments

- **Crystal Power Investments LLC** - Project sponsor and requirements
- **Meta WhatsApp Business API** - Core messaging platform
- **Egypt PDPC** - Data protection guidance and compliance framework
- **Open Source Community** - Libraries and tools used in development

---

**Built for Crystal Power Investments** - Leading multi-sector investment strategy across financial assets, real estate, hospitality, and technology enablement across Egypt and regional markets.

*This platform represents a complete, production-ready WhatsApp Business integration system designed specifically for real estate professionals who need to manage leads, automate responses, and close more deals through intelligent conversation management.*
