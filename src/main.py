from flask import Flask, send_from_directory, jsonify, request
from flask_cors import CORS
import subprocess
import os
import signal
import time
import threading

app = Flask(__name__)
CORS(app)

# Global variable to store the Node.js process
node_process = None

def start_node_server():
    """Start the Node.js server"""
    global node_process
    try:
        node_process = subprocess.Popen(
            ['node', 'src/server.js'],
            cwd='/home/ubuntu/crystal-power-whatsapp',
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        print(f"Node.js server started with PID: {node_process.pid}")
    except Exception as e:
        print(f"Error starting Node.js server: {e}")

def stop_node_server():
    """Stop the Node.js server"""
    global node_process
    if node_process:
        try:
            node_process.terminate()
            node_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            node_process.kill()
        print("Node.js server stopped")

@app.route('/')
def index():
    """Serve the main dashboard"""
    return send_from_directory('public', 'index.html')

@app.route('/privacy-policy')
def privacy_policy():
    """Serve the privacy policy"""
    return send_from_directory('public', 'privacy-policy.html')

@app.route('/api-testing')
def api_testing():
    """Serve the API testing dashboard"""
    return send_from_directory('public', 'api-testing-dashboard.html')

@app.route('/static/<path:filename>')
def static_files(filename):
    """Serve static files"""
    return send_from_directory('public', filename)

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Crystal Power WhatsApp Business API',
        'version': '1.0.0',
        'node_server': 'running' if node_process and node_process.poll() is None else 'stopped'
    })

@app.route('/webhook', methods=['GET', 'POST'])
def webhook_proxy():
    """Proxy webhook requests to Node.js server"""
    import requests
    try:
        if request.method == 'GET':
            response = requests.get('http://localhost:3000/webhook', params=request.args)
        else:
            response = requests.post('http://localhost:3000/webhook', 
                                   json=request.get_json(), 
                                   headers={'Content-Type': 'application/json'})
        return response.text, response.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
def api_proxy(path):
    """Proxy API requests to Node.js server"""
    import requests
    try:
        url = f'http://localhost:3000/{path}'
        if request.method == 'GET':
            response = requests.get(url, params=request.args)
        else:
            response = requests.request(
                request.method, 
                url, 
                json=request.get_json(),
                headers={'Content-Type': 'application/json'}
            )
        return response.text, response.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Start Node.js server in background
    threading.Thread(target=start_node_server, daemon=True).start()
    
    # Give Node.js server time to start
    time.sleep(3)
    
    try:
        app.run(host='0.0.0.0', port=5000, debug=False)
    finally:
        stop_node_server()
