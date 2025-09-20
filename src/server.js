/**
 * Crystal Intelligence WhatsApp Integration Server
 * Express.js server for handling webhooks and API endpoints
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const compression = require('compression');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'crystal_webhook_verify_2024';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

// Rate limiting
const rateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
});

const webhookLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: 1000, // Higher limit for webhooks
  duration: 60,
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdn.tailwindcss.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://graph.facebook.com", "wss:"]
    }
  }
}));

app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true
}));

// Raw body parser for webhook signature verification
app.use('/webhook', express.raw({ type: 'application/json' }));

// JSON body parser for other endpoints
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname)));

// Rate limiting middleware
const rateLimitMiddleware = async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.round(rejRes.msBeforeNext / 1000) || 60
    });
  }
};

// Webhook rate limiting
const webhookRateLimitMiddleware = async (req, res, next) => {
  try {
    await webhookLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Webhook rate limit exceeded.',
      retryAfter: Math.round(rejRes.msBeforeNext / 1000) || 60
    });
  }
};

// Webhook signature verification
function verifyWebhookSignature(req, res, next) {
  const signature = req.get('X-Hub-Signature-256');
  const body = req.body;
  
  if (!WEBHOOK_SECRET) {
    console.warn('Webhook secret not configured - skipping signature verification');
    return next();
  }
  
  if (!signature) {
    return res.status(401).json({ error: 'Missing signature' });
  }
  
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(body)
    .digest('hex');
  
  if (signature !== expectedSignature) {
    console.error('Webhook signature verification failed');
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  next();
}

// Routes

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime()
  });
});

// Webhook verification (GET)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    console.log('Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    console.error('Webhook verification failed');
    res.status(403).json({ error: 'Forbidden' });
  }
});

// Webhook endpoint (POST)
app.post('/webhook', 
  webhookRateLimitMiddleware,
  verifyWebhookSignature,
  (req, res) => {
    try {
      // Parse JSON body if it's raw
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      
      console.log('Webhook received:', JSON.stringify(body, null, 2));
      
      // Process webhook data
      if (body.object === 'whatsapp_business_account') {
        if (body.entry && body.entry.length > 0) {
          body.entry.forEach(entry => {
            if (entry.changes) {
              entry.changes.forEach(change => {
                if (change.field === 'messages' && change.value) {
                  processMessageWebhook(change.value);
                }
              });
            }
          });
        }
      }
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
);

// API Routes with rate limiting
app.use('/api', rateLimitMiddleware);

// WhatsApp API proxy endpoints
app.post('/api/whatsapp/send-message', async (req, res) => {
  try {
    const { to, message, type = 'text', accessToken } = req.body;
    
    if (!to || !message || !accessToken) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['to', 'message', 'accessToken']
      });
    }
    
    // Forward to WhatsApp Business API
    const response = await fetch(`https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: type,
        text: {
          body: message
        }
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      res.json({ success: true, data: result });
    } else {
      res.status(response.status).json({ error: result.error || 'WhatsApp API error' });
    }
    
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Configuration endpoint
app.post('/api/config/whatsapp', (req, res) => {
  try {
    const { accessToken, phoneNumberId, businessAccountId } = req.body;
    
    // Validate configuration (basic validation)
    if (!accessToken || !phoneNumberId || !businessAccountId) {
      return res.status(400).json({
        error: 'Invalid configuration',
        message: 'All fields are required'
      });
    }
    
    // Store configuration securely (in production, use encrypted storage)
    // For now, we'll just validate the format
    
    res.json({
      success: true,
      message: 'Configuration saved successfully',
      config: {
        phoneNumberId,
        businessAccountId,
        // Don't return access token for security
      }
    });
    
  } catch (error) {
    console.error('Configuration error:', error);
    res.status(500).json({ error: 'Configuration failed' });
  }
});

// Analytics endpoint
app.get('/api/analytics/summary', (req, res) => {
  try {
    // This would typically fetch from your analytics database
    const summary = {
      totalMessages: Math.floor(Math.random() * 1000) + 500,
      activeConversations: Math.floor(Math.random() * 50) + 10,
      qualifiedLeads: Math.floor(Math.random() * 20) + 5,
      avgResponseTime: Math.floor(Math.random() * 300) + 30, // seconds
      timestamp: new Date().toISOString()
    };
    
    res.json(summary);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Analytics unavailable' });
  }
});

// Properties endpoint
app.get('/api/properties', (req, res) => {
  try {
    const { location, type, minPrice, maxPrice, limit = 10 } = req.query;
    
    // This would typically query your properties database
    // For now, return sample data
    const properties = [
      {
        id: 'prop_001',
        title: 'Luxury Apartment in New Capital R7',
        type: 'apartment',
        location: 'New Administrative Capital',
        price: 3200000,
        area: 120,
        bedrooms: 2,
        bathrooms: 2,
        amenities: ['gym', 'swimming_pool', 'security', 'parking']
      }
    ];
    
    res.json({
      success: true,
      data: properties,
      total: properties.length
    });
    
  } catch (error) {
    console.error('Properties error:', error);
    res.status(500).json({ error: 'Properties unavailable' });
  }
});

// Process webhook message data
function processMessageWebhook(webhookData) {
  try {
    console.log('Processing webhook data:', webhookData);
    
    // Extract messages
    if (webhookData.messages) {
      webhookData.messages.forEach(message => {
        console.log('New message received:', {
          from: message.from,
          type: message.type,
          timestamp: message.timestamp
        });
        
        // Here you would:
        // 1. Save message to database
        // 2. Process with AI
        // 3. Generate response
        // 4. Update conversation state
        
        // Broadcast to connected clients (WebSocket or Server-Sent Events)
        broadcastMessage('new_message', {
          id: message.id,
          from: message.from,
          type: message.type,
          content: message.text?.body || '',
          timestamp: new Date(parseInt(message.timestamp) * 1000)
        });
      });
    }
    
    // Process status updates
    if (webhookData.statuses) {
      webhookData.statuses.forEach(status => {
        console.log('Message status update:', {
          id: status.id,
          status: status.status,
          timestamp: status.timestamp
        });
        
        broadcastMessage('status_update', {
          messageId: status.id,
          status: status.status,
          timestamp: new Date(parseInt(status.timestamp) * 1000)
        });
      });
    }
    
  } catch (error) {
    console.error('Webhook processing error:', error);
  }
}

// WebSocket or SSE for real-time updates
// For simplicity, we'll use a basic in-memory store
const connectedClients = new Set();

// Server-Sent Events endpoint for real-time updates
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  
  connectedClients.add(res);
  
  // Send heartbeat every 30 seconds
  const heartbeat = setInterval(() => {
    res.write('data: {"type":"heartbeat","timestamp":"' + new Date().toISOString() + '"}\n\n');
  }, 30000);
  
  req.on('close', () => {
    clearInterval(heartbeat);
    connectedClients.delete(res);
  });
});

// Broadcast message to all connected clients
function broadcastMessage(type, data) {
  const message = JSON.stringify({
    type: type,
    data: data,
    timestamp: new Date().toISOString()
  });
  
  connectedClients.forEach(client => {
    try {
      client.write(`data: ${message}\n\n`);
    } catch (error) {
      console.error('Broadcast error:', error);
      connectedClients.delete(client);
    }
  });
}

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 Crystal Intelligence WhatsApp Integration Server
📡 Server running on port ${PORT}
🌐 Health check: http://localhost:${PORT}/health
📞 Webhook URL: http://localhost:${PORT}/webhook
📊 Environment: ${process.env.NODE_ENV || 'development'}
🔑 Webhook verify token: ${WEBHOOK_VERIFY_TOKEN}
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Server termination signal received...');
  process.exit(0);
});

module.exports = app;