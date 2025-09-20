from flask import Flask, send_from_directory, jsonify, request
from flask_cors import CORS
import os

# Get the directory containing this file
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)

app = Flask(__name__, static_folder=os.path.join(project_root, 'public'))
CORS(app)

@app.route('/')
def index():
    """Serve the main dashboard"""
    return send_from_directory(os.path.join(project_root, 'public'), 'index.html')

@app.route('/privacy-policy')
def privacy_policy():
    """Serve the privacy policy"""
    return send_from_directory(os.path.join(project_root, 'public'), 'privacy-policy.html')

@app.route('/api-testing')
def api_testing():
    """Serve the API testing dashboard"""
    return send_from_directory(os.path.join(project_root, 'public'), 'api-testing-dashboard.html')

@app.route('/dashboard')
def dashboard():
    """Alternative route for main dashboard"""
    return send_from_directory(os.path.join(project_root, 'public'), 'index.html')

@app.route('/static/<path:filename>')
def static_files(filename):
    """Serve static files"""
    return send_from_directory(os.path.join(project_root, 'public'), filename)

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Crystal Power WhatsApp Business API',
        'version': '1.0.0',
        'deployment': 'production',
        'legal_status': 'requires_review',
        'compliance': 'egypt_pdpl_ready'
    })

@app.route('/status')
def status():
    """Deployment status endpoint"""
    return jsonify({
        'application': 'Crystal Power WhatsApp Business API',
        'version': '1.0.0',
        'status': 'deployed',
        'github_repository': 'https://github.com/CPInvestMo/crystal-power-whatsapp',
        'deployment_url': 'https://p9hwiqcqwkml.manus.space',
        'features': {
            'whatsapp_business_api': 'ready',
            'ai_lead_processing': 'ready',
            'property_matching': 'ready',
            'egypt_pdpl_compliance': 'implemented',
            'analytics_dashboard': 'ready'
        },
        'legal_requirements': {
            'legal_counsel_review': 'required',
            'dpo_certification': 'required',
            'executive_authorization': 'required',
            'pdpc_registration': 'required',
            'insurance_verification': 'required'
        },
        'next_steps': [
            'Complete legal review with qualified Egyptian data privacy counsel',
            'Obtain Data Protection Officer certification',
            'Get Crystal Power Investments executive authorization',
            'Verify PDPC registration status',
            'Confirm insurance coverage',
            'Configure WhatsApp Business API credentials',
            'Deploy to production domain'
        ]
    })

@app.route('/docs')
def documentation():
    """Documentation endpoint"""
    return jsonify({
        'documentation': {
            'github_repository': 'https://github.com/CPInvestMo/crystal-power-whatsapp',
            'readme': 'https://github.com/CPInvestMo/crystal-power-whatsapp/blob/main/README.md',
            'deployment_guide': 'https://github.com/CPInvestMo/crystal-power-whatsapp/blob/main/DEPLOYMENT.md',
            'legal_compliance': 'https://github.com/CPInvestMo/crystal-power-whatsapp/blob/main/docs/LEGAL-DEPLOYMENT-CHECKLIST.md'
        },
        'api_endpoints': {
            '/': 'Main dashboard interface',
            '/privacy-policy': 'PDPL-compliant privacy policy',
            '/api-testing': 'API testing dashboard',
            '/health': 'Health check endpoint',
            '/status': 'Deployment status information',
            '/docs': 'This documentation endpoint'
        }
    })

@app.errorhandler(404)
def not_found(error):
    """Custom 404 handler"""
    return jsonify({
        'error': 'Not Found',
        'message': 'The requested resource was not found',
        'available_endpoints': [
            '/ - Main dashboard',
            '/privacy-policy - Privacy policy',
            '/api-testing - API testing',
            '/health - Health check',
            '/status - Deployment status',
            '/docs - Documentation'
        ]
    }), 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
