// WidgetGenerator.js - Embeddable Chat Widget Code Generator
// Creates customizable HTML/JavaScript code for embedding AI chatbot on websites

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Alert from '../common/Alert';

const WidgetGenerator = () => {
  const { user } = useAuth();
  
  // Widget configuration state
  const [config, setConfig] = useState({
    // Appearance
    theme: 'light', // light, dark, auto
    primaryColor: '#667eea',
    position: 'bottom-right', // bottom-right, bottom-left, top-right, top-left
    size: 'medium', // small, medium, large
    
    // Behavior
    autoOpen: false,
    showTyping: true,
    enableVoice: true,
    showPoweredBy: true,
    
    // Content
    welcomeMessage: `Hi! I'm ${user?.name || 'AI Assistant'}. How can I help you today?`,
    placeholder: 'Type your message...',
    buttonText: 'Chat with AI',
    
    // Advanced
    maxHeight: '500px',
    enableAnalytics: true,
    rateLimit: '10', // messages per minute
    allowFileUpload: false
  });

  const [generatedCode, setGeneratedCode] = useState('');
  const [previewMode, setPreviewMode] = useState('code'); // code, preview, install
  const [alert, setAlert] = useState(null);
  const [copied, setCopied] = useState(false);

  // Generate widget code when config changes
  useEffect(() => {
    generateWidgetCode();
  }, [config, user]);

  /**
   * Show alert message
   */
  const showAlert = (message, type = 'info') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3000);
  };

  /**
   * Update configuration value
   */
  const updateConfig = (key, value) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  /**
   * Generate the complete widget code
   */
  const generateWidgetCode = () => {
    const widgetId = `aura-widget-${Date.now()}`;
    const apiUrl = process.env.REACT_APP_API_BASE_URL || 'https://api.iaura.ai';
    
    const code = `
<!-- AURA Voice AI Chat Widget -->
<!-- Add this code to your website where you want the chat button to appear -->

<div id="${widgetId}"></div>

<script>
  (function() {
    // Widget Configuration
    const AURA_CONFIG = ${JSON.stringify({
      ...config,
      userSlug: user?.slug || 'demo',
      apiUrl: apiUrl,
      widgetId: widgetId
    }, null, 6)};

    // Create widget container
    function createWidget() {
      const container = document.getElementById('${widgetId}');
      if (!container) {
        console.error('AURA Widget: Container element not found');
        return;
      }

      // Widget HTML structure
      container.innerHTML = \`
        <div class="aura-widget" data-theme="\${AURA_CONFIG.theme}">
          <!-- Chat Button -->
          <div class="aura-chat-button" id="aura-chat-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4l4 4 4-4h4a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/>
            </svg>
            <span>\${AURA_CONFIG.buttonText}</span>
          </div>

          <!-- Chat Window -->
          <div class="aura-chat-window" id="aura-chat-window" style="display: none;">
            <div class="aura-chat-header">
              <h3>Chat with \${AURA_CONFIG.userSlug}</h3>
              <button class="aura-close-btn" id="aura-close-btn">&times;</button>
            </div>
            
            <div class="aura-chat-messages" id="aura-messages">
              <div class="aura-message aura-bot-message">
                <div class="aura-message-content">\${AURA_CONFIG.welcomeMessage}</div>
              </div>
            </div>
            
            <div class="aura-chat-input">
              <input 
                type="text" 
                id="aura-input" 
                placeholder="\${AURA_CONFIG.placeholder}"
                maxlength="500"
              />
              <button id="aura-send-btn">Send</button>
              \${AURA_CONFIG.enableVoice ? '<button id="aura-voice-btn">🎤</button>' : ''}
            </div>
            
            \${AURA_CONFIG.showPoweredBy ? '<div class="aura-powered">Powered by <a href="https://iaura.ai" target="_blank">AURA AI</a></div>' : ''}
          </div>
        </div>
      \`;

      // Add widget styles
      addWidgetStyles();
      
      // Initialize widget functionality
      initializeWidget();
    }

    // Add CSS styles to page
    function addWidgetStyles() {
      if (document.getElementById('aura-widget-styles')) return;
      
      const styles = document.createElement('style');
      styles.id = 'aura-widget-styles';
      styles.textContent = \`
        .aura-widget {
          position: fixed;
          \${AURA_CONFIG.position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
          \${AURA_CONFIG.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .aura-chat-button {
          background: \${AURA_CONFIG.primaryColor};
          color: white;
          border: none;
          border-radius: 50px;
          padding: 12px 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          transition: all 0.3s ease;
        }

        .aura-chat-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.2);
        }

        .aura-chat-window {
          position: absolute;
          bottom: 70px;
          right: 0;
          width: 350px;
          height: \${AURA_CONFIG.maxHeight};
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.12);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .aura-chat-header {
          background: \${AURA_CONFIG.primaryColor};
          color: white;
          padding: 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .aura-chat-header h3 {
          margin: 0;
          font-size: 16px;
        }

        .aura-close-btn {
          background: none;
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
          padding: 0;
          width: 25px;
          height: 25px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .aura-chat-messages {
          flex: 1;
          padding: 15px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .aura-message {
          max-width: 80%;
          padding: 8px 12px;
          border-radius: 18px;
          word-wrap: break-word;
        }

        .aura-bot-message {
          background: #f1f3f5;
          align-self: flex-start;
        }

        .aura-user-message {
          background: \${AURA_CONFIG.primaryColor};
          color: white;
          align-self: flex-end;
        }

        .aura-chat-input {
          padding: 15px;
          border-top: 1px solid #eee;
          display: flex;
          gap: 8px;
        }

        .aura-chat-input input {
          flex: 1;
          border: 1px solid #ddd;
          border-radius: 20px;
          padding: 8px 15px;
          outline: none;
        }

        .aura-chat-input button {
          background: \${AURA_CONFIG.primaryColor};
          color: white;
          border: none;
          border-radius: 20px;
          padding: 8px 15px;
          cursor: pointer;
        }

        .aura-powered {
          text-align: center;
          font-size: 11px;
          color: #888;
          padding: 5px;
        }

        .aura-powered a {
          color: \${AURA_CONFIG.primaryColor};
          text-decoration: none;
        }

        .aura-typing {
          display: flex;
          gap: 4px;
          padding: 8px 12px;
        }

        .aura-typing span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #999;
          animation: aura-pulse 1.4s infinite ease-in-out;
        }

        .aura-typing span:nth-child(1) { animation-delay: -0.32s; }
        .aura-typing span:nth-child(2) { animation-delay: -0.16s; }

        @keyframes aura-pulse {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }

        /* Dark theme */
        .aura-widget[data-theme="dark"] .aura-chat-window {
          background: #2d3748;
          color: white;
        }

        .aura-widget[data-theme="dark"] .aura-bot-message {
          background: #4a5568;
          color: white;
        }

        /* Responsive design */
        @media (max-width: 480px) {
          .aura-chat-window {
            width: calc(100vw - 40px);
            height: calc(100vh - 100px);
          }
        }
      \`;
      document.head.appendChild(styles);
    }

    // Initialize widget functionality
    function initializeWidget() {
      const chatBtn = document.getElementById('aura-chat-btn');
      const chatWindow = document.getElementById('aura-chat-window');
      const closeBtn = document.getElementById('aura-close-btn');
      const sendBtn = document.getElementById('aura-send-btn');
      const input = document.getElementById('aura-input');
      const messages = document.getElementById('aura-messages');

      let isOpen = AURA_CONFIG.autoOpen;
      
      // Toggle chat window
      function toggleChat() {
        isOpen = !isOpen;
        chatWindow.style.display = isOpen ? 'flex' : 'none';
      }

      // Add message to chat
      function addMessage(content, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = \`aura-message \${isUser ? 'aura-user-message' : 'aura-bot-message'}\`;
        messageDiv.innerHTML = \`<div class="aura-message-content">\${content}</div>\`;
        messages.appendChild(messageDiv);
        messages.scrollTop = messages.scrollHeight;
      }

      // Send message to AURA API
      async function sendMessage(message) {
        if (!message.trim()) return;

        addMessage(message, true);
        input.value = '';

        // Show typing indicator
        if (AURA_CONFIG.showTyping) {
          const typingDiv = document.createElement('div');
          typingDiv.className = 'aura-typing';
          typingDiv.innerHTML = '<span></span><span></span><span></span>';
          messages.appendChild(typingDiv);
          messages.scrollTop = messages.scrollHeight;
        }

        try {
          const response = await fetch(\`\${AURA_CONFIG.apiUrl}/voice/chat/\${AURA_CONFIG.userSlug}\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              message: message,
              widget: true,
              source: 'embedded_widget'
            })
          });

          const data = await response.json();
          
          // Remove typing indicator
          if (AURA_CONFIG.showTyping) {
            const typing = messages.querySelector('.aura-typing');
            if (typing) typing.remove();
          }

          addMessage(data.response || 'Sorry, I had trouble understanding that.');

        } catch (error) {
          console.error('AURA Widget Error:', error);
          if (AURA_CONFIG.showTyping) {
            const typing = messages.querySelector('.aura-typing');
            if (typing) typing.remove();
          }
          addMessage('Sorry, I\\'m having technical difficulties. Please try again later.');
        }
      }

      // Event listeners
      chatBtn.addEventListener('click', toggleChat);
      closeBtn.addEventListener('click', toggleChat);
      sendBtn.addEventListener('click', () => sendMessage(input.value));
      
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage(input.value);
      });

      // Auto-open if configured
      if (AURA_CONFIG.autoOpen) {
        setTimeout(toggleChat, 1000);
      }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createWidget);
    } else {
      createWidget();
    }
  })();
</script>

<!-- End AURA Voice AI Chat Widget -->
    `.trim();

    setGeneratedCode(code);
  };

  /**
   * Copy code to clipboard
   */
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      showAlert('Code copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      showAlert('Failed to copy code', 'error');
    }
  };

  /**
   * Download code as HTML file
   */
  const downloadCode = () => {
    const blob = new Blob([generatedCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aura-widget-${user?.slug || 'demo'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showAlert('Code downloaded as HTML file', 'success');
  };

  return (
    <div className="widget-generator">
      {/* Alert */}
      {alert && (
        <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
      )}

      {/* Header */}
      <div className="generator-header">
        <h2>Widget Code Generator</h2>
        <p>Create an embeddable chat widget for your website</p>
      </div>

      {/* Mode Tabs */}
      <div className="mode-tabs">
        <button 
          className={`mode-tab ${previewMode === 'code' ? 'active' : ''}`}
          onClick={() => setPreviewMode('code')}
        >
          📄 Code
        </button>
        <button 
          className={`mode-tab ${previewMode === 'preview' ? 'active' : ''}`}
          onClick={() => setPreviewMode('preview')}
        >
          👁️ Preview
        </button>
        <button 
          className={`mode-tab ${previewMode === 'install' ? 'active' : ''}`}
          onClick={() => setPreviewMode('install')}
        >
          📋 Installation
        </button>
      </div>

      <div className="generator-content">
        {/* Configuration Panel */}
        <div className="config-panel">
          <h3>Widget Configuration</h3>
          
          {/* Appearance Settings */}
          <div className="config-section">
            <h4>Appearance</h4>
            
            <div className="config-row">
              <label>Theme</label>
              <select 
                value={config.theme} 
                onChange={(e) => updateConfig('theme', e.target.value)}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto</option>
              </select>
            </div>

            <div className="config-row">
              <label>Primary Color</label>
              <input 
                type="color" 
                value={config.primaryColor}
                onChange={(e) => updateConfig('primaryColor', e.target.value)}
              />
            </div>

            <div className="config-row">
              <label>Position</label>
              <select 
                value={config.position} 
                onChange={(e) => updateConfig('position', e.target.value)}
              >
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="top-right">Top Right</option>
                <option value="top-left">Top Left</option>
              </select>
            </div>

            <div className="config-row">
              <label>Size</label>
              <select 
                value={config.size} 
                onChange={(e) => updateConfig('size', e.target.value)}
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          </div>

          {/* Behavior Settings */}
          <div className="config-section">
            <h4>Behavior</h4>
            
            <div className="config-row">
              <label>
                <input 
                  type="checkbox" 
                  checked={config.autoOpen}
                  onChange={(e) => updateConfig('autoOpen', e.target.checked)}
                />
                Auto-open chat
              </label>
            </div>

            <div className="config-row">
              <label>
                <input 
                  type="checkbox" 
                  checked={config.showTyping}
                  onChange={(e) => updateConfig('showTyping', e.target.checked)}
                />
                Show typing indicator
              </label>
            </div>

            <div className="config-row">
              <label>
                <input 
                  type="checkbox" 
                  checked={config.enableVoice}
                  onChange={(e) => updateConfig('enableVoice', e.target.checked)}
                />
                Enable voice chat
              </label>
            </div>

            <div className="config-row">
              <label>
                <input 
                  type="checkbox" 
                  checked={config.showPoweredBy}
                  onChange={(e) => updateConfig('showPoweredBy', e.target.checked)}
                />
                Show "Powered by AURA"
              </label>
            </div>
          </div>

          {/* Content Settings */}
          <div className="config-section">
            <h4>Content</h4>
            
            <div className="config-row">
              <label>Welcome Message</label>
              <textarea 
                value={config.welcomeMessage}
                onChange={(e) => updateConfig('welcomeMessage', e.target.value)}
                maxLength={200}
                rows={3}
              />
            </div>

            <div className="config-row">
              <label>Input Placeholder</label>
              <input 
                type="text" 
                value={config.placeholder}
                onChange={(e) => updateConfig('placeholder', e.target.value)}
                maxLength={50}
              />
            </div>

            <div className="config-row">
              <label>Button Text</label>
              <input 
                type="text" 
                value={config.buttonText}
                onChange={(e) => updateConfig('buttonText', e.target.value)}
                maxLength={30}
              />
            </div>
          </div>
        </div>

        {/* Output Panel */}
        <div className="output-panel">
          {previewMode === 'code' && (
            <div className="code-section">
              <div className="code-header">
                <h3>Generated Code</h3>
                <div className="code-actions">
                  <button onClick={copyToClipboard} className="copy-btn">
                    {copied ? '✓ Copied' : '📋 Copy'}
                  </button>
                  <button onClick={downloadCode} className="download-btn">
                    💾 Download
                  </button>
                </div>
              </div>
              <pre className="code-output">
                <code>{generatedCode}</code>
              </pre>
            </div>
          )}

          {previewMode === 'preview' && (
            <div className="preview-section">
              <h3>Widget Preview</h3>
              <div className="preview-container">
                <div className="preview-note">
                  <p>🎯 Preview shows how your widget will look on a website</p>
                  <p>Click the chat button to test functionality</p>
                </div>
                <div 
                  className="widget-preview"
                  dangerouslySetInnerHTML={{ __html: generatedCode }}
                />
              </div>
            </div>
          )}

          {previewMode === 'install' && (
            <div className="install-section">
              <h3>Installation Instructions</h3>
              <div className="install-steps">
                <div className="install-step">
                  <h4>Step 1: Copy the Code</h4>
                  <p>Click the "Copy" button to copy the generated widget code.</p>
                </div>

                <div className="install-step">
                  <h4>Step 2: Add to Your Website</h4>
                  <p>Paste the code into your HTML file, just before the closing &lt;/body&gt; tag.</p>
                </div>

                <div className="install-step">
                  <h4>Step 3: Test the Widget</h4>
                  <p>Open your website and test the chat widget to ensure it's working properly.</p>
                </div>

                <div className="install-note">
                  <h4>📝 Important Notes:</h4>
                  <ul>
                    <li>The widget requires an internet connection to function</li>
                    <li>Make sure your AI model is trained before deploying</li>
                    <li>The widget works on all modern browsers</li>
                    <li>Mobile responsive design is included</li>
                  </ul>
                </div>

                <div className="support-info">
                  <h4>Need Help?</h4>
                  <p>If you encounter any issues, check our documentation or contact support.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WidgetGenerator;