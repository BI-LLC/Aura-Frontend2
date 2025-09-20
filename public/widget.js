(function () {
  const WIDGET_FLAG = '__auraWidgetLoaded';
  if (window[WIDGET_FLAG]) {
    return;
  }
  window[WIDGET_FLAG] = true;

  const findScriptElement = () => {
    if (document.currentScript) {
      return document.currentScript;
    }
    const explicit = document.querySelector('script[data-widget="aura"]');
    if (explicit) {
      return explicit;
    }
    const scripts = Array.from(document.getElementsByTagName('script'));
    return scripts.reverse().find(script => /widget\.js(\?.*)?$/.test(script.src));
  };

  const scriptElement = findScriptElement();
  const dataset = scriptElement ? scriptElement.dataset : {};
  const config = {
    userId: dataset.user || null,
    project: dataset.project || null,
    theme: dataset.theme || 'light'
  };

  const createStyles = () => {
    const style = document.createElement('style');
    style.id = 'aura-widget-styles';
    style.innerHTML = `
      .aura-widget-root {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 9999;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      .aura-widget-button {
        border: none;
        border-radius: 999px;
        background: linear-gradient(135deg, #4f46e5, #7c3aed);
        color: #ffffff;
        padding: 14px 20px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        box-shadow: 0 14px 30px rgba(79, 70, 229, 0.3);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .aura-widget-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 18px 34px rgba(79, 70, 229, 0.35);
      }
      .aura-widget-button svg {
        width: 20px;
        height: 20px;
      }
      .aura-widget-panel {
        width: 360px;
        max-width: calc(100vw - 32px);
        background: #ffffff;
        border-radius: 20px;
        box-shadow: 0 24px 54px rgba(15, 23, 42, 0.25);
        overflow: hidden;
        display: none;
        flex-direction: column;
        margin-bottom: 16px;
      }
      .aura-widget-panel.is-open {
        display: flex;
      }
      .aura-widget-header {
        padding: 18px;
        background: linear-gradient(135deg, #4338ca, #7c3aed);
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .aura-widget-title {
        font-size: 1.05rem;
        font-weight: 600;
        margin: 0;
      }
      .aura-widget-close {
        background: rgba(255, 255, 255, 0.15);
        color: #ffffff;
        border: none;
        border-radius: 999px;
        width: 32px;
        height: 32px;
        cursor: pointer;
      }
      .aura-widget-tabs {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2px;
        padding: 14px;
        background: #f1f5f9;
      }
      .aura-widget-tab {
        border: none;
        background: transparent;
        padding: 10px 14px;
        border-radius: 12px;
        font-weight: 600;
        color: #475569;
        cursor: pointer;
        transition: background 0.2s ease, color 0.2s ease;
      }
      .aura-widget-tab.is-active {
        background: #ffffff;
        color: #4338ca;
        box-shadow: 0 10px 20px rgba(79, 70, 229, 0.1);
      }
      .aura-widget-body {
        padding: 0 18px 18px;
      }
      .aura-chat-panel {
        display: none;
        flex-direction: column;
        gap: 12px;
      }
      .aura-chat-panel.is-active {
        display: flex;
      }
      .aura-chat-messages {
        max-height: 260px;
        overflow-y: auto;
        margin-bottom: 16px;
        padding-right: 6px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .aura-message {
        display: inline-flex;
        flex-direction: column;
        max-width: 80%;
        padding: 10px 14px;
        border-radius: 14px;
        line-height: 1.4;
        font-size: 0.92rem;
      }
      .aura-message.agent {
        background: #eef2ff;
        color: #312e81;
        align-self: flex-start;
      }
      .aura-message.visitor {
        background: #4338ca;
        color: #ffffff;
        align-self: flex-end;
      }
      .aura-chat-input {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .aura-chat-input input {
        flex: 1;
        border: 1px solid #cbd5f5;
        border-radius: 12px;
        padding: 10px 14px;
        font-size: 0.95rem;
      }
      .aura-chat-input button {
        border: none;
        background: #4338ca;
        color: #ffffff;
        border-radius: 12px;
        padding: 10px 16px;
        font-weight: 600;
        cursor: pointer;
      }
      .aura-call-panel {
        display: none;
        flex-direction: column;
        gap: 12px;
      }
      .aura-call-panel.is-active {
        display: flex;
      }
      .aura-call-panel label {
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 0.9rem;
        color: #475569;
      }
      .aura-call-panel input,
      .aura-call-panel textarea,
      .aura-call-panel select {
        border: 1px solid #cbd5f5;
        border-radius: 12px;
        padding: 10px 14px;
        font-size: 0.95rem;
      }
      .aura-call-panel button {
        border: none;
        background: linear-gradient(135deg, #0ea5e9, #2563eb);
        color: #ffffff;
        border-radius: 12px;
        padding: 12px 16px;
        font-weight: 600;
        cursor: pointer;
        margin-top: 4px;
      }
      .aura-call-status {
        font-size: 0.9rem;
        color: #2563eb;
        background: #e0f2fe;
        padding: 10px 14px;
        border-radius: 12px;
      }
      @media (max-width: 640px) {
        .aura-widget-root {
          right: 16px;
          left: 16px;
          bottom: 16px;
        }
        .aura-widget-panel {
          width: 100%;
          margin-bottom: 12px;
        }
        .aura-widget-button {
          width: 100%;
          justify-content: center;
        }
      }
    `;
    document.head.appendChild(style);
  };

  const createElement = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) {
      element.className = className;
    }
    if (text) {
      element.textContent = text;
    }
    return element;
  };

  const appendMessage = (list, text, author = 'agent') => {
    const bubble = createElement('div', `aura-message ${author}`);
    bubble.textContent = text;
    list.appendChild(bubble);
    list.scrollTop = list.scrollHeight;
  };

  const initChatPanel = (body) => {
    const chatPanel = createElement('div', 'aura-chat-panel');
    const messageList = createElement('div', 'aura-chat-messages');
    appendMessage(messageList, 'Hi there! Choose chat for instant replies or leave your number for a call back.', 'agent');

    const inputRow = createElement('div', 'aura-chat-input');
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Ask a question...';
    const sendButton = createElement('button', null, 'Send');

    const sendMessage = () => {
      const value = input.value.trim();
      if (!value) return;
      appendMessage(messageList, value, 'visitor');
      input.value = '';
      setTimeout(() => {
        appendMessage(messageList, 'Thanks! Our team will follow up shortly.', 'agent');
      }, 600);
    };

    sendButton.addEventListener('click', sendMessage);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        sendMessage();
      }
    });

    inputRow.appendChild(input);
    inputRow.appendChild(sendButton);
    chatPanel.appendChild(messageList);
    chatPanel.appendChild(inputRow);
    body.appendChild(chatPanel);
    return { chatPanel, messageList };
  };

  const initCallPanel = (body) => {
    const panel = createElement('div', 'aura-call-panel');
    const phoneLabel = createElement('label');
    phoneLabel.textContent = 'Phone number';
    const phoneInput = document.createElement('input');
    phoneInput.type = 'tel';
    phoneInput.placeholder = '+1 (555) 555-1234';
    phoneLabel.appendChild(phoneInput);

    const purposeLabel = createElement('label');
    purposeLabel.textContent = 'Topic';
    const purposeSelect = document.createElement('select');
    ['Product demo', 'Customer support', 'Billing question', 'Partnership', 'Other'].forEach(optionText => {
      const option = document.createElement('option');
      option.value = optionText.toLowerCase();
      option.textContent = optionText;
      purposeSelect.appendChild(option);
    });
    purposeLabel.appendChild(purposeSelect);

    const notesLabel = createElement('label');
    notesLabel.textContent = 'Notes (optional)';
    const notesArea = document.createElement('textarea');
    notesArea.rows = 3;
    notesArea.placeholder = 'Share any context for the call...';
    notesLabel.appendChild(notesArea);

    const submitButton = createElement('button', null, 'Request call back');
    const status = createElement('div', 'aura-call-status');
    status.style.display = 'none';

    submitButton.addEventListener('click', (event) => {
      event.preventDefault();
      const phone = phoneInput.value.trim();
      if (!phone) {
        status.style.display = 'block';
        status.textContent = 'Please provide a phone number so we can reach you.';
        status.style.background = '#fee2e2';
        status.style.color = '#b91c1c';
        return;
      }
      status.style.display = 'block';
      status.style.background = '#e0f2fe';
      status.style.color = '#2563eb';
      status.textContent = 'Thanks! A specialist will call you back shortly.';
      phoneInput.value = '';
      notesArea.value = '';
    });

    panel.appendChild(phoneLabel);
    panel.appendChild(purposeLabel);
    panel.appendChild(notesLabel);
    panel.appendChild(submitButton);
    panel.appendChild(status);
    body.appendChild(panel);
    return panel;
  };

  const mountWidget = () => {
    createStyles();

    const host = document.getElementById('aura-widget') || document.body;
    const container = createElement('div', 'aura-widget-root');
    host.appendChild(container);

    const panel = createElement('div', 'aura-widget-panel');
    const header = createElement('div', 'aura-widget-header');
    const title = createElement('h3', 'aura-widget-title', config.project ? `${config.project} assistant` : 'Aura assistant');
    const closeButton = createElement('button', 'aura-widget-close', '×');

    closeButton.addEventListener('click', () => {
      panel.classList.remove('is-open');
    });

    header.appendChild(title);
    header.appendChild(closeButton);
    panel.appendChild(header);

    const tabs = createElement('div', 'aura-widget-tabs');
    const chatTab = createElement('button', 'aura-widget-tab is-active', 'Chat');
    const callTab = createElement('button', 'aura-widget-tab', 'Call');
    tabs.appendChild(chatTab);
    tabs.appendChild(callTab);
    panel.appendChild(tabs);

    const body = createElement('div', 'aura-widget-body');
    panel.appendChild(body);

    const { chatPanel } = initChatPanel(body);
    const callPanel = initCallPanel(body);

    const setTab = (tab) => {
      if (tab === 'chat') {
        chatTab.classList.add('is-active');
        callTab.classList.remove('is-active');
        chatPanel.classList.add('is-active');
        callPanel.classList.remove('is-active');
      } else {
        chatTab.classList.remove('is-active');
        callTab.classList.add('is-active');
        chatPanel.classList.remove('is-active');
        callPanel.classList.add('is-active');
      }
    };

    chatTab.addEventListener('click', () => setTab('chat'));
    callTab.addEventListener('click', () => setTab('call'));

    container.appendChild(panel);

    const button = createElement('button', 'aura-widget-button');
    button.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2h-4l-4 4v-4H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      <span>${config.project ? 'Contact ' + config.project : 'Chat with Aura'}</span>
    `;
    button.addEventListener('click', () => {
      const isOpen = panel.classList.toggle('is-open');
      if (isOpen) {
        setTab('chat');
      }
    });

    container.appendChild(button);

    setTab('chat');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountWidget);
  } else {
    mountWidget();
  }
})();
