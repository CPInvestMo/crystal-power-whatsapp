#!/usr/bin/env node

/**
 * WhatsApp Webhook Test Script
 * Tests webhook endpoint with sample WhatsApp data
 */

const http = require('http');
const https = require('https');
const crypto = require('crypto');
require('dotenv').config();

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/webhook';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'crystal_webhook_verify_2024';

// Sample WhatsApp webhook data
const sampleWebhookData = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: '123456789012345',
      changes: [
        {
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '201234567890',
              phone_number_id: '123456789012345'
            },
            contacts: [
              {
                profile: {
                  name: 'Ahmed Mohamed'
                },
                wa_id: '201234567890'
              }
            ],
            messages: [
              {
                from: '201234567890',
                id: 'wamid.HBgMOTcxNTE0NzAyNjQxFQIAEhgUM0E2RjBBQTlCNDREQzNCMEE4QzIA',
                timestamp: Math.floor(Date.now() / 1000).toString(),
                text: {
                  body: 'Hi! I\'m looking for a 3-bedroom apartment in New Capital with a budget of 3.5 million EGP. Can you help me?'
                },
                type: 'text'
              }
            ]
          },
          field: 'messages'
        }
      ]
    }
  ]
};

// Sample message status update
const sampleStatusUpdate = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: '123456789012345',
      changes: [
        {
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '201234567890',
              phone_number_id: '123456789012345'
            },
            statuses: [
              {
                id: 'wamid.HBgMOTcxNTE0NzAyNjQxFQIAEhgUM0E2RjBBQTlCNDREQzNCMEE4QzIA',
                recipient_id: '201234567890',
                status: 'delivered',
                timestamp: Math.floor(Date.now() / 1000).toString(),
                conversation: {
                  id: 'conversation_id_123',
                  expiration_timestamp: Math.floor(Date.now() / 1000 + 86400).toString(),
                  origin: {
                    type: 'business_initiated'
                  }
                },
                pricing: {
                  billable: true,
                  pricing_model: 'CBP',
                  category: 'business_initiated'
                }
              }
            ]
          },
          field: 'messages'
        }
      ]
    }
  ]
};

// Generate webhook signature
function generateSignature(body, secret) {
  if (!secret) return null;
  return 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
}

// Send HTTP request
function sendRequest(url, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers
      }
    };
    
    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Test webhook verification (GET request)
async function testWebhookVerification() {
  console.log('\n🔍 Testing Webhook Verification...');
  
  const verifyUrl = `${WEBHOOK_URL}?hub.mode=subscribe&hub.verify_token=${WEBHOOK_VERIFY_TOKEN}&hub.challenge=test_challenge_123`;
  
  try {
    const urlObj = new URL(verifyUrl);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET'
    };
    
    const response = await new Promise((resolve, reject) => {
      const req = client.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => resolve({
          statusCode: res.statusCode,
          body: body
        }));
      });
      req.on('error', reject);
      req.end();
    });
    
    if (response.statusCode === 200 && response.body === 'test_challenge_123') {
      console.log('✅ Webhook verification successful');
      return true;
    } else {
      console.log(`❌ Webhook verification failed: ${response.statusCode} - ${response.body}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Webhook verification error: ${error.message}`);
    return false;
  }
}

// Test webhook message processing
async function testWebhookMessage(testName, data) {
  console.log(`\n📩 Testing ${testName}...`);
  
  const body = JSON.stringify(data);
  const headers = {};
  
  // Add signature if webhook secret is configured
  if (WEBHOOK_SECRET) {
    headers['X-Hub-Signature-256'] = generateSignature(body, WEBHOOK_SECRET);
    console.log('🔐 Added webhook signature for security');
  }
  
  try {
    const response = await sendRequest(WEBHOOK_URL, body, headers);
    
    console.log(`Status Code: ${response.statusCode}`);
    console.log(`Response: ${response.body}`);
    
    if (response.statusCode === 200) {
      console.log('✅ Webhook message processed successfully');
      return true;
    } else {
      console.log(`❌ Webhook message failed: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Webhook message error: ${error.message}`);
    return false;
  }
}

// Test invalid webhook data
async function testInvalidWebhook() {
  console.log('\n🚫 Testing Invalid Webhook Data...');
  
  const invalidData = {
    object: 'invalid_object',
    invalid_field: 'test'
  };
  
  try {
    const response = await testWebhookMessage('Invalid Data', invalidData);
    // Should still return 200 but not process anything
    return response;
  } catch (error) {
    console.log(`❌ Invalid webhook test error: ${error.message}`);
    return false;
  }
}

// Test rate limiting
async function testRateLimiting() {
  console.log('\n⚡ Testing Rate Limiting...');
  
  const requests = [];
  for (let i = 0; i < 5; i++) {
    requests.push(testWebhookMessage(`Rate Test ${i + 1}`, sampleWebhookData));
  }
  
  try {
    const results = await Promise.all(requests);
    const successCount = results.filter(Boolean).length;
    console.log(`📊 Rate limiting test: ${successCount}/5 requests succeeded`);
    return successCount > 0;
  } catch (error) {
    console.log(`❌ Rate limiting test error: ${error.message}`);
    return false;
  }
}

// Test different message types
async function testMessageTypes() {
  console.log('\n🎭 Testing Different Message Types...');
  
  // Text message test
  const textResult = await testWebhookMessage('Text Message', sampleWebhookData);
  
  // Status update test
  const statusResult = await testWebhookMessage('Status Update', sampleStatusUpdate);
  
  // Image message test
  const imageMessage = JSON.parse(JSON.stringify(sampleWebhookData));
  imageMessage.entry[0].changes[0].value.messages[0] = {
    from: '201234567890',
    id: 'wamid.IMAGE123',
    timestamp: Math.floor(Date.now() / 1000).toString(),
    type: 'image',
    image: {
      id: 'media_id_123',
      mime_type: 'image/jpeg',
      sha256: 'image_hash_123',
      caption: 'Check out this property!'
    }
  };
  const imageResult = await testWebhookMessage('Image Message', imageMessage);
  
  // Location message test
  const locationMessage = JSON.parse(JSON.stringify(sampleWebhookData));
  locationMessage.entry[0].changes[0].value.messages[0] = {
    from: '201234567890',
    id: 'wamid.LOCATION123',
    timestamp: Math.floor(Date.now() / 1000).toString(),
    type: 'location',
    location: {
      latitude: 30.0444,
      longitude: 31.2357,
      name: 'New Administrative Capital',
      address: 'R7 District, New Capital, Egypt'
    }
  };
  const locationResult = await testWebhookMessage('Location Message', locationMessage);
  
  const successCount = [textResult, statusResult, imageResult, locationResult].filter(Boolean).length;
  console.log(`📊 Message types test: ${successCount}/4 message types processed successfully`);
  
  return successCount === 4;
}

// Main test function
async function runTests() {
  console.log('🚀 Crystal Intelligence WhatsApp Webhook Test Suite');
  console.log('================================================');
  console.log(`📡 Testing webhook URL: ${WEBHOOK_URL}`);
  console.log(`🔑 Webhook verify token: ${WEBHOOK_VERIFY_TOKEN}`);
  console.log(`🔐 Webhook secret: ${WEBHOOK_SECRET ? 'Configured' : 'Not configured'}`);
  
  const results = {
    verification: false,
    basicMessage: false,
    statusUpdate: false,
    invalidData: false,
    rateLimiting: false,
    messageTypes: false
  };
  
  // Run all tests
  results.verification = await testWebhookVerification();
  results.basicMessage = await testWebhookMessage('Basic Message', sampleWebhookData);
  results.statusUpdate = await testWebhookMessage('Status Update', sampleStatusUpdate);
  results.invalidData = await testInvalidWebhook();
  results.rateLimiting = await testRateLimiting();
  results.messageTypes = await testMessageTypes();
  
  // Print summary
  console.log('\n📊 Test Results Summary');
  console.log('=======================');
  console.log(`✅ Webhook Verification: ${results.verification ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Basic Message Processing: ${results.basicMessage ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Status Update Processing: ${results.statusUpdate ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Invalid Data Handling: ${results.invalidData ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Rate Limiting: ${results.rateLimiting ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Message Types: ${results.messageTypes ? 'PASS' : 'FAIL'}`);
  
  const passCount = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall Results: ${passCount}/${totalTests} tests passed`);
  
  if (passCount === totalTests) {
    console.log('🎉 All tests passed! Your webhook is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check your webhook configuration and server setup.');
  }
  
  // Exit with appropriate code
  process.exit(passCount === totalTests ? 0 : 1);
}

// Command line options
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🧪 WhatsApp Webhook Test Script

Usage: node test-webhook.js [options]

Options:
  --help, -h     Show this help message
  --verify-only  Only test webhook verification (GET request)
  --message-only Test only message processing (POST request)
  --url <url>    Override webhook URL
  --token <token> Override verify token

Environment Variables:
  WEBHOOK_URL           Webhook endpoint URL (default: http://localhost:3000/webhook)
  WEBHOOK_VERIFY_TOKEN  Webhook verification token
  WEBHOOK_SECRET        Webhook signature secret (optional)

Examples:
  node test-webhook.js
  node test-webhook.js --verify-only
  node test-webhook.js --url https://yourdomain.com/webhook
  `);
  process.exit(0);
}

// Handle specific test options
if (args.includes('--verify-only')) {
  testWebhookVerification().then(result => {
    process.exit(result ? 0 : 1);
  });
} else if (args.includes('--message-only')) {
  testWebhookMessage('Basic Message', sampleWebhookData).then(result => {
    process.exit(result ? 0 : 1);
  });
} else {
  // Run full test suite
  runTests();
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error.message);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  process.exit(1);
});