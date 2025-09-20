import React, { useMemo, useState } from 'react';
import Alert from '../common/Alert';

const WidgetGenerator = ({ user }) => {
  const [projectLabel, setProjectLabel] = useState(
    user?.user_metadata?.project_slug || user?.user_metadata?.workspace || ''
  );
  const [copied, setCopied] = useState(false);
  const [alert, setAlert] = useState(null);

  const widgetHost = useMemo(() => {
    if (process.env.REACT_APP_WIDGET_URL) {
      return process.env.REACT_APP_WIDGET_URL;
    }

    if (typeof window !== 'undefined') {
      return `${window.location.origin}/widget.js`;
    }

    return '/widget.js';
  }, []);

  const embedCode = useMemo(() => {
    const attributes = [
      `src="${widgetHost}"`,
      'async',
      `data-user="${user?.id || ''}"`
    ];

    if (projectLabel) {
      attributes.push(`data-project="${projectLabel}"`);
    }

    const scriptTag = `<script ${attributes.join(' ')}></script>`;
    return `<div id="aura-widget"></div>\n${scriptTag}`;
  }, [projectLabel, widgetHost, user?.id]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setAlert({ type: 'success', message: 'Embed code copied to clipboard.' });
      setTimeout(() => setCopied(false), 2500);
      setTimeout(() => setAlert(null), 3000);
    } catch (error) {
      console.error('Copy failed:', error);
      setCopied(false);
      setAlert({
        type: 'error',
        message: 'Copy failed. Please highlight the snippet and copy it manually.'
      });
      setTimeout(() => setAlert(null), 4000);
    }
  };

  return (
    <div className="widget-generator">
      <div className="header">
        <div>
          <h2>Widget Generator</h2>
          <p>Use this short embed snippet to drop Aura’s voice widget into any site.</p>
        </div>
      </div>

      <div className="form-card">
        <label className="form-field">
          <span>Project label (optional)</span>
          <input
            type="text"
            placeholder="my-product"
            value={projectLabel}
            onChange={(event) => setProjectLabel(event.target.value)}
          />
          <small>Included as <code>data-project</code> so you can identify the widget origin.</small>
        </label>

        <div className="code-block">
          <code>{embedCode}</code>
        </div>

        <div className="actions">
          <button className="copy-btn" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy embed code'}
          </button>
          <span className="hint">Paste inside your site’s <code>&lt;body&gt;</code>.</span>
        </div>
      </div>

      <div className="notes-card">
        <h3>Deployment tips</h3>
        <ul>
          <li>The widget automatically connects using your authenticated Supabase session.</li>
          <li>Host the <code>widget.js</code> file at the same origin as your dashboard or set <code>REACT_APP_WIDGET_URL</code>.</li>
          <li>Add optional data attributes like <code>data-theme</code> or <code>data-language</code> to extend the embed.</li>
        </ul>
      </div>

      {alert && (
        <div className="alert-wrapper">
          <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
        </div>
      )}

      <style jsx>{`
        .widget-generator {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }

        .header h2 {
          font-size: var(--text-3xl);
          font-weight: var(--font-weight-bold);
          color: var(--gray-900);
          margin-bottom: var(--space-1);
        }

        .header p {
          color: var(--gray-600);
        }

        .form-card,
        .notes-card {
          background: var(--white);
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-xl);
          padding: var(--space-5);
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .form-field input {
          border: 1px solid var(--gray-300);
          border-radius: var(--radius-md);
          padding: var(--space-3);
          font-size: var(--text-base);
        }

        .form-field small {
          color: var(--gray-500);
        }

        .code-block {
          background: var(--gray-900);
          color: var(--gray-100);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
          font-family: 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
          font-size: 0.95rem;
          overflow-x: auto;
          white-space: pre-wrap;
        }

        .actions {
          display: flex;
          align-items: center;
          gap: var(--space-4);
        }

        .copy-btn {
          border: none;
          background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
          color: var(--white);
          padding: var(--space-2) var(--space-5);
          border-radius: var(--radius-md);
          cursor: pointer;
          font-weight: var(--font-weight-medium);
        }

        .copy-btn:hover {
          background: linear-gradient(135deg, var(--primary-600), var(--primary-700));
        }

        .hint {
          color: var(--gray-500);
          font-size: var(--text-sm);
        }

        .notes-card ul {
          padding-left: 1.25rem;
          color: var(--gray-600);
          line-height: 1.6;
        }

        .alert-wrapper {
          position: fixed;
          bottom: var(--space-6);
          right: var(--space-6);
          z-index: 20;
        }

        @media (max-width: 768px) {
          .actions {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default WidgetGenerator;
