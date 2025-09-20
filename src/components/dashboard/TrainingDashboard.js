// TrainingDashboard.js - Complete AI Training Management Component
// ==================================================================
// Handles all training content: Q&A pairs, document uploads, and logic notes
// Integrated with Supabase and your existing backend

import React, { useState, useEffect, useRef } from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
import Alert from '../common/Alert';

const TrainingDashboard = ({ user, supabase, dashboardData, updateDashboardData, onRefresh }) => {
  const [activeTab, setActiveTab] = useState('manual');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  // Training data state
  const [qaPairs, setQaPairs] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [logicNotes, setLogicNotes] = useState([]);
  
  // Modals state
  const [showQAModal, setShowQAModal] = useState(false);
  const [showLogicModal, setShowLogicModal] = useState(false);

  // Load training data when component mounts or tab changes
  useEffect(() => {
    fetchTrainingData();
  }, [activeTab, user]);

  /**
   * Show alert message
   */
  const showAlert = (message, type = 'info') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  /**
   * Fetch training data based on active tab
   */
  const fetchTrainingData = async () => {
    if (!supabase || !user) return;
    
    setLoading(true);
    try {
      if (activeTab === 'manual') {
        // Fetch Q&A pairs - you can create a table for this or use existing structure
        // For now using mock data, but you can create a 'qa_pairs' table
        setQaPairs([
          { 
            id: 1, 
            prompt: 'What services do you offer?', 
            response: 'I offer voice AI assistance and consulting services.', 
            tags: ['general', 'services'], 
            created_at: '2024-01-15T10:00:00Z'
          },
          {
            id: 2,
            prompt: 'How can I contact support?',
            response: 'You can reach our support team through the contact form or email support@aura.ai',
            tags: ['support', 'contact'],
            created_at: '2024-01-16T14:30:00Z'
          }
        ]);
        
        // Update dashboard data
        updateDashboardData({ totalQAPairs: 2 });
        
      } else if (activeTab === 'upload') {
        // Fetch documents from your existing documents table
        const { data: docs, error } = await supabase
          .from('documents')
          .select('*')
          .eq('user_id', user.user_id)
          .order('upload_time', { ascending: false });
        
        if (error) throw error;
        setDocuments(docs || []);
        
      } else if (activeTab === 'logic') {
        // Fetch logic notes - you can create a table for this
        // For now using mock data, but you can create a 'logic_notes' table
        setLogicNotes([
          { 
            id: 1, 
            title: 'General Guidelines', 
            content: 'Always be professional and helpful. Maintain a friendly tone while providing accurate information.', 
            category: 'general',
            created_at: '2024-01-15T10:00:00Z'
          },
          {
            id: 2,
            title: 'Voice Response Rules',
            content: 'Keep voice responses concise and natural. Avoid overly technical language unless specifically requested.',
            category: 'voice',
            created_at: '2024-01-16T09:15:00Z'
          }
        ]);
        
        // Update dashboard data
        updateDashboardData({ totalLogicNotes: 2 });
      }
    } catch (error) {
      console.error('Error fetching training data:', error);
      showAlert('Failed to load training data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const trainingTabs = [
    { id: 'manual', label: 'Manual Training (Q&A Format)', icon: '💬' },
    { id: 'upload', label: 'Upload Reference Materials', icon: '📄' },
    { id: 'logic', label: 'Logic Notes', icon: '🧠' }
  ];

  return (
    <div className="training-dashboard">
      {/* Alert */}
      {alert && (
        <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
      )}

      {/* Header */}
      <div className="training-header">
        <h2 className="section-title">Training Content</h2>
        <p className="section-description">
          Manage different types of training data to enhance Aura's capabilities
        </p>
      </div>

      {/* Training Status Overview */}
      <div className="training-status-overview">
        <div className="status-card">
          <div className="status-icon">💬</div>
          <div className="status-content">
            <div className="status-number">{dashboardData?.totalQAPairs || qaPairs.length}</div>
            <div className="status-label">Q&A Pairs</div>
          </div>
        </div>
        
        <div className="status-card">
          <div className="status-icon">📄</div>
          <div className="status-content">
            <div className="status-number">{dashboardData?.totalDocuments || documents.length}</div>
            <div className="status-label">Documents</div>
          </div>
        </div>
        
        <div className="status-card">
          <div className="status-icon">🧠</div>
          <div className="status-content">
            <div className="status-number">{dashboardData?.totalLogicNotes || logicNotes.length}</div>
            <div className="status-label">Logic Notes</div>
          </div>
        </div>
        
        <div className="status-card accent">
          <div className="status-icon">⚡</div>
          <div className="status-content">
            <div className="status-number">
              {((dashboardData?.totalQAPairs || 0) + (dashboardData?.totalDocuments || 0) + (dashboardData?.totalLogicNotes || 0)) > 10 ? 'Ready' : 'Training'}
            </div>
            <div className="status-label">AI Status</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="training-tabs">
        {trainingTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`training-tab ${activeTab === tab.id ? 'active' : ''}`}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'manual' && (
          <ManualTrainingTab 
            qaPairs={qaPairs}
            onAddQA={() => setShowQAModal(true)}
            onDeleteQA={(id) => {
              setQaPairs(prev => prev.filter(qa => qa.id !== id));
              showAlert('Q&A pair deleted', 'success');
            }}
            loading={loading}
          />
        )}
        
        {activeTab === 'upload' && (
          <UploadMaterialsTab 
            documents={documents}
            user={user}
            supabase={supabase}
            onRefresh={fetchTrainingData}
            showAlert={showAlert}
            loading={loading}
          />
        )}
        
        {activeTab === 'logic' && (
          <LogicNotesTab 
            logicNotes={logicNotes}
            onAddNote={() => setShowLogicModal(true)}
            onDeleteNote={(id) => {
              setLogicNotes(prev => prev.filter(note => note.id !== id));
              showAlert('Logic note deleted', 'success');
            }}
            loading={loading}
          />
        )}
      </div>

      {/* Modals */}
      {showQAModal && (
        <QAModal 
          onClose={() => setShowQAModal(false)} 
          onSave={(newQA) => {
            setQaPairs(prev => [{ ...newQA, id: Date.now() }, ...prev]);
            setShowQAModal(false);
            showAlert('Q&A pair added successfully', 'success');
          }}
        />
      )}
      
      {showLogicModal && (
        <LogicModal 
          onClose={() => setShowLogicModal(false)} 
          onSave={(newNote) => {
            setLogicNotes(prev => [{ ...newNote, id: Date.now() }, ...prev]);
            setShowLogicModal(false);
            showAlert('Logic note added successfully', 'success');
          }}
        />
      )}

      <style jsx>{`
        .training-dashboard {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
          max-width: 100%;
        }

        .training-header {
          margin-bottom: var(--space-4);
        }

        .section-title {
          font-size: var(--text-3xl);
          font-weight: var(--font-weight-bold);
          color: var(--gray-900);
          margin-bottom: var(--space-2);
        }

        .section-description {
          font-size: var(--text-base);
          color: var(--gray-600);
          line-height: 1.6;
        }

        .training-status-overview {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--space-4);
          margin-bottom: var(--space-6);
        }

        .status-card {
          background: var(--white);
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-xl);
          padding: var(--space-6);
          display: flex;
          align-items: center;
          gap: var(--space-4);
          transition: all var(--transition-fast);
          border-left: 4px solid var(--primary-500);
        }

        .status-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .status-card.accent {
          border-left-color: var(--success-500);
        }

        .status-icon {
          font-size: 2rem;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--gray-50);
          border-radius: var(--radius-lg);
        }

        .status-number {
          font-size: var(--text-2xl);
          font-weight: var(--font-weight-bold);
          color: var(--gray-900);
          margin-bottom: var(--space-1);
        }

        .status-label {
          font-size: var(--text-sm);
          color: var(--gray-600);
          font-weight: var(--font-weight-medium);
        }

        .training-tabs {
          display: flex;
          gap: var(--space-2);
          background: var(--gray-100);
          padding: var(--space-1);
          border-radius: var(--radius-lg);
          margin-bottom: var(--space-6);
        }

        .training-tab {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-4);
          border: none;
          background: none;
          color: var(--gray-600);
          font-weight: var(--font-weight-medium);
          cursor: pointer;
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
          flex: 1;
          justify-content: center;
          white-space: nowrap;
        }

        .training-tab:hover {
          color: var(--gray-900);
          background: var(--gray-200);
        }

        .training-tab.active {
          color: var(--primary-600);
          background: var(--white);
          box-shadow: var(--shadow-sm);
        }

        .tab-content {
          background: var(--gray-50);
          border-radius: var(--radius-xl);
          padding: var(--space-6);
          min-height: 400px;
        }

        @media (max-width: 768px) {
          .training-status-overview {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .training-tabs {
            flex-direction: column;
            gap: var(--space-1);
          }
          
          .training-tab {
            justify-content: flex-start;
          }
          
          .tab-content {
            padding: var(--space-4);
          }
        }

        @media (max-width: 480px) {
          .training-status-overview {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

// Manual Training Tab (Q&A Format)
const ManualTrainingTab = ({ qaPairs, onAddQA, onDeleteQA, loading }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="manual-training">
      <div className="tab-header">
        <div>
          <h3 className="tab-title">Question & Answer Pairs</h3>
          <p className="tab-description">Create specific prompt-response pairs for Aura to learn from</p>
        </div>
        <button onClick={onAddQA} className="btn btn-primary">
          ➕ Add Q&A Pair
        </button>
      </div>

      {loading ? (
        <div className="loading-content">
          <LoadingSpinner size="medium" message="Loading Q&A pairs..." />
        </div>
      ) : (
        <div className="qa-container">
          {qaPairs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">❓</div>
              <h4>No Q&A pairs yet</h4>
              <p>Add your first training pair to help Aura learn your communication style!</p>
              <button onClick={onAddQA} className="btn btn-primary">
                Add Your First Q&A
              </button>
            </div>
          ) : (
            <div className="qa-grid">
              {qaPairs.map(pair => (
                <div key={pair.id} className="qa-card">
                  <div className="qa-header">
                    <div className="qa-tags">
                      {pair.tags?.map(tag => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                    </div>
                    <div className="qa-actions">
                      <button className="action-btn edit" title="Edit">✏️</button>
                      <button 
                        className="action-btn delete" 
                        onClick={() => onDeleteQA(pair.id)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  
                  <div className="qa-content">
                    <div className="qa-question">
                      <h5>Question:</h5>
                      <p>{pair.prompt}</p>
                    </div>
                    <div className="qa-answer">
                      <h5>Answer:</h5>
                      <p>{pair.response}</p>
                    </div>
                  </div>
                  
                  <div className="qa-footer">
                    <span className="qa-date">{formatDate(pair.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .manual-training {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }

        .tab-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--space-4);
        }

        .tab-title {
          font-size: var(--text-xl);
          font-weight: var(--font-weight-semibold);
          color: var(--gray-900);
          margin-bottom: var(--space-1);
        }

        .tab-description {
          color: var(--gray-600);
          font-size: var(--text-sm);
          line-height: 1.5;
        }

        .loading-content {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 200px;
        }

        .qa-container {
          background: var(--white);
          border-radius: var(--radius-lg);
          border: 1px solid var(--gray-200);
          overflow: hidden;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--space-12);
          text-align: center;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: var(--space-4);
          opacity: 0.5;
        }

        .empty-state h4 {
          font-size: var(--text-xl);
          font-weight: var(--font-weight-semibold);
          color: var(--gray-900);
          margin-bottom: var(--space-2);
        }

        .empty-state p {
          color: var(--gray-600);
          margin-bottom: var(--space-6);
          max-width: 400px;
        }

        .qa-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: var(--space-4);
          padding: var(--space-4);
        }

        .qa-card {
          background: var(--gray-50);
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
          transition: all var(--transition-fast);
        }

        .qa-card:hover {
          box-shadow: var(--shadow-md);
          transform: translateY(-2px);
        }

        .qa-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--space-3);
        }

        .qa-tags {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-1);
        }

        .tag {
          background: var(--primary-100);
          color: var(--primary-700);
          padding: var(--space-1) var(--space-2);
          border-radius: var(--radius-sm);
          font-size: var(--text-xs);
          font-weight: var(--font-weight-medium);
        }

        .qa-actions {
          display: flex;
          gap: var(--space-1);
        }

        .action-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: var(--space-1);
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
          font-size: var(--text-sm);
        }

        .action-btn:hover {
          background: var(--gray-200);
        }

        .action-btn.delete:hover {
          background: var(--error-100);
        }

        .qa-content {
          margin-bottom: var(--space-4);
        }

        .qa-question,
        .qa-answer {
          margin-bottom: var(--space-3);
        }

        .qa-question h5,
        .qa-answer h5 {
          font-size: var(--text-sm);
          font-weight: var(--font-weight-semibold);
          color: var(--gray-700);
          margin-bottom: var(--space-1);
        }

        .qa-question p,
        .qa-answer p {
          color: var(--gray-900);
          line-height: 1.6;
          margin: 0;
        }

        .qa-footer {
          padding-top: var(--space-3);
          border-top: 1px solid var(--gray-200);
        }

        .qa-date {
          color: var(--gray-500);
          font-size: var(--text-xs);
        }

        @media (max-width: 768px) {
          .tab-header {
            flex-direction: column;
            align-items: stretch;
          }
          
          .qa-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

// Upload Materials Tab (from your original code, enhanced)
const UploadMaterialsTab = ({ documents, user, supabase, onRefresh, showAlert, loading }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files) {
        // Validate file type and size
        const allowedTypes = ['.pdf', '.docx', '.txt', '.md'];
        const isValidType = allowedTypes.some(type => 
          file.name.toLowerCase().endsWith(type)
        );
        
        if (!isValidType) {
          showAlert(`${file.name}: Invalid file type. Allowed: PDF, DOCX, TXT, MD`, 'error');
          continue;
        }
        
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          showAlert(`${file.name}: File too large. Max size: 10MB`, 'error');
          continue;
        }

        // Upload to Supabase storage
        const fileName = `${user.user_id}/${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Insert document record
        const { error: insertError } = await supabase
          .from('documents')
          .insert({
            user_id: user.user_id,
            tenant_id: user.tenant_id,
            filename: file.name,
            file_type: file.type,
            file_size: file.size,
            file_path: uploadData.path,
            processing_status: 'pending'
          });

        if (insertError) throw insertError;
      }
      
      showAlert('Files uploaded successfully', 'success');
      onRefresh();
    } catch (error) {
      console.error('Upload error:', error);
      showAlert('Failed to upload files. Please try again.', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (filename) => {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'pdf': return '📕';
      case 'docx': case 'doc': return '📘';
      case 'txt': return '📄';
      case 'md': return '📝';
      default: return '📄';
    }
  };

  return (
    <div className="upload-materials">
      <div className="tab-header">
        <div>
          <h3 className="tab-title">Reference Materials</h3>
          <p className="tab-description">Upload documents for Aura to use as background knowledge</p>
        </div>
        <div className="upload-controls">
          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept=".pdf,.docx,.txt,.md"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            disabled={uploading}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-primary"
            disabled={uploading}
          >
            {uploading ? (
              <>
                <LoadingSpinner size="small" />
                Uploading...
              </>
            ) : (
              <>📁 Upload Files</>
            )}
          </button>
        </div>
      </div>

      <div className="upload-info">
        <div className="info-card">
          <h4>Supported Formats</h4>
          <p>PDF, DOCX, TXT, MD files up to 10MB each</p>
        </div>
        <div className="info-card">
          <h4>Processing</h4>
          <p>Files are automatically processed and made searchable</p>
        </div>
        <div className="info-card">
          <h4>Usage</h4>
          <p>Aura will reference these documents when answering questions</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-content">
          <LoadingSpinner size="medium" message="Loading documents..." />
        </div>
      ) : (
        <div className="documents-container">
          {documents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📄</div>
              <h4>No documents uploaded yet</h4>
              <p>Upload your first reference material to enhance Aura's knowledge base!</p>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-primary"
              >
                Upload Your First Document
              </button>
            </div>
          ) : (
            <div className="documents-grid">
              {documents.map(doc => (
                <div key={doc.doc_id} className="document-card">
                  <div className="doc-header">
                    <div className="doc-icon">{getFileIcon(doc.filename)}</div>
                    <div className="doc-actions">
                      <button 
                        className="action-btn delete"
                        title="Delete document"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  
                  <div className="doc-content">
                    <h5 className="doc-name">{doc.filename}</h5>
                    <div className="doc-meta">
                      <span className="doc-size">{formatFileSize(doc.file_size || 0)}</span>
                      <span className="doc-date">
                        {new Date(doc.upload_time).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="doc-status">
                    <span className={`status-badge ${doc.processing_status || 'pending'}`}>
                      {doc.processing_status || 'Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .upload-materials {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }

        .tab-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--space-4);
        }

        .tab-title {
          font-size: var(--text-xl);
          font-weight: var(--font-weight-semibold);
          color: var(--gray-900);
          margin-bottom: var(--space-1);
        }

        .tab-description {
          color: var(--gray-600);
          font-size: var(--text-sm);
          line-height: 1.5;
        }

        .upload-info {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--space-4);
          margin-bottom: var(--space-4);
        }

        .info-card {
          background: var(--primary-50);
          border: 1px solid var(--primary-200);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
        }

        .info-card h4 {
          font-size: var(--text-sm);
          font-weight: var(--font-weight-semibold);
          color: var(--primary-900);
          margin-bottom: var(--space-1);
        }

        .info-card p {
          font-size: var(--text-xs);
          color: var(--primary-700);
          margin: 0;
        }

        .documents-container {
          background: var(--white);
          border-radius: var(--radius-lg);
          border: 1px solid var(--gray-200);
          overflow: hidden;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--space-12);
          text-align: center;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: var(--space-4);
          opacity: 0.5;
        }

        .empty-state h4 {
          font-size: var(--text-xl);
          font-weight: var(--font-weight-semibold);
          color: var(--gray-900);
          margin-bottom: var(--space-2);
        }

        .empty-state p {
          color: var(--gray-600);
          margin-bottom: var(--space-6);
          max-width: 400px;
        }

        .documents-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: var(--space-4);
          padding: var(--space-4);
        }

        .document-card {
          background: var(--gray-50);
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
          transition: all var(--transition-fast);
        }

        .document-card:hover {
          box-shadow: var(--shadow-md);
          transform: translateY(-2px);
        }

        .doc-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-3);
        }

        .doc-icon {
          font-size: 2rem;
        }

        .doc-content {
          margin-bottom: var(--space-3);
        }

        .doc-name {
          font-size: var(--text-base);
          font-weight: var(--font-weight-semibold);
          color: var(--gray-900);
          margin-bottom: var(--space-2);
          word-break: break-word;
        }

        .doc-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: var(--text-xs);
          color: var(--gray-500);
        }

        .doc-status {
          padding-top: var(--space-3);
          border-top: 1px solid var(--gray-200);
        }

        .status-badge {
          padding: var(--space-1) var(--space-2);
          border-radius: var(--radius-sm);
          font-size: var(--text-xs);
          font-weight: var(--font-weight-medium);
          text-transform: capitalize;
        }

        .status-badge.pending {
          background: var(--warning-100);
          color: var(--warning-700);
        }

        .status-badge.completed {
          background: var(--success-100);
          color: var(--success-700);
        }

        .status-badge.failed {
          background: var(--error-100);
          color: var(--error-700);
        }

        .action-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: var(--space-1);
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
          font-size: var(--text-sm);
        }

        .action-btn:hover {
          background: var(--gray-200);
        }

        .action-btn.delete:hover {
          background: var(--error-100);
        }

        @media (max-width: 768px) {
          .tab-header {
            flex-direction: column;
            align-items: stretch;
          }
          
          .upload-info {
            grid-template-columns: 1fr;
          }
          
          .documents-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

// Logic Notes Tab (from your original code, enhanced)
const LogicNotesTab = ({ logicNotes, onAddNote, onDeleteNote, loading }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getCategoryColor = (category) => {
    const colors = {
      general: 'primary',
      voice: 'success',
      behavior: 'warning',
      knowledge: 'info'
    };
    return colors[category] || 'primary';
  };

  return (
    <div className="logic-notes">
      <div className="tab-header">
        <div>
          <h3 className="tab-title">Logic Notes</h3>
          <p className="tab-description">Add facts, rules, and guidance for Aura's conversational logic</p>
        </div>
        <button onClick={onAddNote} className="btn btn-primary">
          ➕ Add Logic Note
        </button>
      </div>

      {loading ? (
        <div className="loading-content">
          <LoadingSpinner size="medium" message="Loading logic notes..." />
        </div>
      ) : (
        <div className="notes-container">
          {logicNotes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🧠</div>
              <h4>No logic notes yet</h4>
              <p>Add your first guidance note to shape Aura's conversational behavior!</p>
              <button onClick={onAddNote} className="btn btn-primary">
                Add Your First Logic Note
              </button>
            </div>
          ) : (
            <div className="notes-grid">
              {logicNotes.map(note => (
                <div key={note.id} className="note-card">
                  <div className="note-header">
                    <div className="note-category">
                      <span className={`category-badge ${getCategoryColor(note.category)}`}>
                        {note.category}
                      </span>
                    </div>
                    <div className="note-actions">
                      <button className="action-btn edit" title="Edit">✏️</button>
                      <button 
                        className="action-btn delete" 
                        onClick={() => onDeleteNote(note.id)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  
                  <div className="note-content">
                    <h4 className="note-title">{note.title}</h4>
                    <p className="note-text">{note.content}</p>
                  </div>
                  
                  <div className="note-footer">
                    <span className="note-date">{formatDate(note.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .logic-notes {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }

        .tab-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--space-4);
        }

        .tab-title {
          font-size: var(--text-xl);
          font-weight: var(--font-weight-semibold);
          color: var(--gray-900);
          margin-bottom: var(--space-1);
        }

        .tab-description {
          color: var(--gray-600);
          font-size: var(--text-sm);
          line-height: 1.5;
        }

        .notes-container {
          background: var(--white);
          border-radius: var(--radius-lg);
          border: 1px solid var(--gray-200);
          overflow: hidden;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--space-12);
          text-align: center;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: var(--space-4);
          opacity: 0.5;
        }

        .empty-state h4 {
          font-size: var(--text-xl);
          font-weight: var(--font-weight-semibold);
          color: var(--gray-900);
          margin-bottom: var(--space-2);
        }

        .empty-state p {
          color: var(--gray-600);
          margin-bottom: var(--space-6);
          max-width: 400px;
        }

        .notes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: var(--space-4);
          padding: var(--space-4);
        }

        .note-card {
          background: var(--gray-50);
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
          transition: all var(--transition-fast);
        }

        .note-card:hover {
          box-shadow: var(--shadow-md);
          transform: translateY(-2px);
        }

        .note-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--space-3);
        }

        .category-badge {
          padding: var(--space-1) var(--space-2);
          border-radius: var(--radius-sm);
          font-size: var(--text-xs);
          font-weight: var(--font-weight-medium);
          text-transform: capitalize;
        }

        .category-badge.primary {
          background: var(--primary-100);
          color: var(--primary-700);
        }

        .category-badge.success {
          background: var(--success-100);
          color: var(--success-700);
        }

        .category-badge.warning {
          background: var(--warning-100);
          color: var(--warning-700);
        }

        .category-badge.info {
          background: var(--info-100);
          color: var(--info-700);
        }

        .note-actions {
          display: flex;
          gap: var(--space-1);
        }

        .action-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: var(--space-1);
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
          font-size: var(--text-sm);
        }

        .action-btn:hover {
          background: var(--gray-200);
        }

        .action-btn.delete:hover {
          background: var(--error-100);
        }

        .note-content {
          margin-bottom: var(--space-4);
        }

        .note-title {
          font-size: var(--text-base);
          font-weight: var(--font-weight-semibold);
          color: var(--gray-900);
          margin-bottom: var(--space-2);
        }

        .note-text {
          color: var(--gray-700);
          font-size: var(--text-sm);
          line-height: 1.6;
          margin: 0;
        }

        .note-footer {
          padding-top: var(--space-3);
          border-top: 1px solid var(--gray-200);
        }

        .note-date {
          color: var(--gray-500);
          font-size: var(--text-xs);
        }

        @media (max-width: 768px) {
          .tab-header {
            flex-direction: column;
            align-items: stretch;
          }
          
          .notes-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

// Enhanced Modal Components
const QAModal = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    prompt: '',
    response: '',
    tags: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.prompt.trim() || !formData.response.trim()) return;

    const newQA = {
      prompt: formData.prompt.trim(),
      response: formData.response.trim(),
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      created_at: new Date().toISOString()
    };

    onSave(newQA);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add New Q&A Pair</h3>
          <button onClick={onClose} className="modal-close">×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="prompt">Question/Prompt</label>
            <textarea
              id="prompt"
              value={formData.prompt}
              onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
              placeholder="Enter the question or prompt..."
              rows={3}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="response">Response</label>
            <textarea
              id="response"
              value={formData.response}
              onChange={(e) => setFormData(prev => ({ ...prev, response: e.target.value }))}
              placeholder="Enter the desired response..."
              rows={4}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="tags">Tags (comma-separated)</label>
            <input
              type="text"
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="e.g., general, support, product"
            />
          </div>
          
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Q&A Pair
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const LogicModal = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) return;

    const newNote = {
      title: formData.title.trim(),
      content: formData.content.trim(),
      category: formData.category,
      created_at: new Date().toISOString()
    };

    onSave(newNote);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add New Logic Note</h3>
          <button onClick={onClose} className="modal-close">×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter a descriptive title..."
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            >
              <option value="general">General</option>
              <option value="voice">Voice</option>
              <option value="behavior">Behavior</option>
              <option value="knowledge">Knowledge</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="content">Content</label>
            <textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Enter the logic note content..."
              rows={5}
              required
            />
          </div>
          
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Logic Note
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TrainingDashboard;