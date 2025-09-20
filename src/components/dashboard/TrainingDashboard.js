import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
import Alert from '../common/Alert';

const TrainingDashboard = ({ user, supabase, updateDashboardData, onRefresh }) => {
  const LOGIC_NOTE_CATEGORIES = useMemo(
    () => [
      { value: 'general', label: 'General Guidance' },
      { value: 'personality', label: 'Personality & Tone' },
      { value: 'knowledge', label: 'Knowledge Base' },
      { value: 'behavior', label: 'Behavior Rules' },
      { value: 'compliance', label: 'Compliance & Safety' },
      { value: 'escalation', label: 'Escalation' }
    ],
    []
  );

  const defaultLogicCategory = LOGIC_NOTE_CATEGORIES[0].value;
  const [activeTab, setActiveTab] = useState('qa');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const [trainingData, setTrainingData] = useState([]);
  const [referenceMaterials, setReferenceMaterials] = useState([]);
  const [logicNotes, setLogicNotes] = useState([]);

  const logicCategories = useMemo(() => {
    const baseCategories = [...LOGIC_NOTE_CATEGORIES];
    const seen = new Set(baseCategories.map(category => category.value));

    logicNotes
      .map(note => note.category)
      .filter(Boolean)
      .forEach(category => {
        if (!seen.has(category)) {
          seen.add(category);
          baseCategories.push({
            value: category,
            label: category.charAt(0).toUpperCase() + category.slice(1)
          });
        }
      });

    return baseCategories;
  }, [LOGIC_NOTE_CATEGORIES, logicNotes]);

  const [isQADialogOpen, setIsQADialogOpen] = useState(false);
  const [isLogicDialogOpen, setIsLogicDialogOpen] = useState(false);

  const [editingQAItem, setEditingQAItem] = useState(null);
  const [editingLogicItem, setEditingLogicItem] = useState(null);

  const [qaFormData, setQAFormData] = useState({ prompt: '', response: '', tags: [] });
  const [qaTagInput, setQATagInput] = useState('');
  const [qaSaving, setQASaving] = useState(false);

  const [logicFormData, setLogicFormData] = useState({ title: '', content: '', category: defaultLogicCategory, tags: [] });
  const [logicTagInput, setLogicTagInput] = useState('');
  const [logicSaving, setLogicSaving] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const alertTimeoutRef = useRef(null);

  const userId = user?.user_id || user?.id || null;

  const showAlert = useCallback((message, type = 'info') => {
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
    }
    setAlert({ message, type });
    alertTimeoutRef.current = setTimeout(() => setAlert(null), 4000);
  }, []);

  const fetchAllData = useCallback(
    async (withLoader = false) => {
      if (withLoader) {
        setLoading(true);
      }

      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        const trainingResult = await supabase
          .from('training_data')
          .select('*')
          .order('created_at', { ascending: false });

        let materialsResult;
        let notesResult;

        if (userId) {
          materialsResult = await supabase
            .from('reference_materials')
            .select('*')
            .eq('uploaded_by', userId)
            .order('created_at', { ascending: false });

          if (materialsResult.error || (materialsResult.data ?? []).length === 0) {
            if (materialsResult.error) {
              console.warn('Falling back to all reference materials:', materialsResult.error?.message || materialsResult.error);
            }
            materialsResult = await supabase
              .from('reference_materials')
              .select('*')
              .order('created_at', { ascending: false });
          }

          notesResult = await supabase
            .from('logic_notes')
            .select('*')
            .eq('created_by', userId)
            .order('created_at', { ascending: false });

          if (notesResult.error || (notesResult.data ?? []).length === 0) {
            if (notesResult.error) {
              console.warn('Falling back to all logic notes:', notesResult.error?.message || notesResult.error);
            }
            notesResult = await supabase
              .from('logic_notes')
              .select('*')
              .order('created_at', { ascending: false });
          }
        } else {
          [materialsResult, notesResult] = await Promise.all([
            supabase
              .from('reference_materials')
              .select('*')
              .order('created_at', { ascending: false }),
            supabase
              .from('logic_notes')
              .select('*')
              .order('created_at', { ascending: false })
          ]);
        }

        if (trainingResult.error) throw trainingResult.error;
        if (materialsResult.error) throw materialsResult.error;
        if (notesResult.error) throw notesResult.error;

        const trainingItems = (trainingResult?.data || []).map(item => ({
          ...item,
          tags: Array.isArray(item.tags) ? item.tags : []
        }));
        const materialItems = (materialsResult?.data || []).map(item => ({
          ...item,
          tags: Array.isArray(item.tags) ? item.tags : []
        }));
        const logicItems = (notesResult?.data || []).map(item => ({
          ...item,
          tags: Array.isArray(item.tags) ? item.tags : [],
          category: item.category || 'general'
        }));

        setTrainingData(trainingItems);
        setReferenceMaterials(materialItems);
        setLogicNotes(logicItems);

        const aggregateTags = new Set();
        trainingItems.forEach(item => item.tags?.forEach(tag => aggregateTags.add(tag)));
        materialItems.forEach(item => item.tags?.forEach(tag => aggregateTags.add(tag)));
        logicItems.forEach(item => item.tags?.forEach(tag => aggregateTags.add(tag)));

        if (updateDashboardData) {
          updateDashboardData({
            totalQAPairs: trainingItems.length,
            totalDocuments: materialItems.length,
            totalLogicNotes: logicItems.length,
            uniqueTagCount: aggregateTags.size
          });
        }
      } catch (error) {
        console.error('Failed to load training data:', error);
        showAlert('Failed to load training data from Supabase.', 'error');
      } finally {
        setLoading(false);
      }
    },
    [supabase, updateDashboardData, showAlert, userId]
  );

  useEffect(() => {
    fetchAllData(true);
  }, [fetchAllData]);

  useEffect(() => {
    return () => {
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
    };
  }, []);

  const handleQADialogOpen = (item = null) => {
    if (item) {
      setEditingQAItem(item);
      setQAFormData({
        prompt: item.prompt || '',
        response: item.response || '',
        tags: Array.isArray(item.tags) ? item.tags : []
      });
    } else {
      setEditingQAItem(null);
      setQAFormData({ prompt: '', response: '', tags: [] });
    }
    setQATagInput('');
    setIsQADialogOpen(true);
  };

  const handleLogicDialogOpen = (item = null) => {
    if (item) {
      setEditingLogicItem(item);
      setLogicFormData({
        title: item.title || '',
        content: item.content || '',
        category: item.category || defaultLogicCategory,
        tags: Array.isArray(item.tags) ? item.tags : []
      });
    } else {
      setEditingLogicItem(null);
      setLogicFormData({ title: '', content: '', category: defaultLogicCategory, tags: [] });
    }
    setLogicTagInput('');
    setIsLogicDialogOpen(true);
  };

  const closeQADialog = () => {
    setIsQADialogOpen(false);
    setEditingQAItem(null);
    setQAFormData({ prompt: '', response: '', tags: [] });
    setQATagInput('');
  };

  const closeLogicDialog = () => {
    setIsLogicDialogOpen(false);
    setEditingLogicItem(null);
    setLogicFormData({ title: '', content: '', category: defaultLogicCategory, tags: [] });
    setLogicTagInput('');
  };

  const addQATag = () => {
    const value = qaTagInput.trim();
    if (!value || qaFormData.tags.includes(value)) return;
    setQAFormData(prev => ({ ...prev, tags: [...prev.tags, value] }));
    setQATagInput('');
  };

  const removeQATag = (tagToRemove) => {
    setQAFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addLogicTag = () => {
    const value = logicTagInput.trim();
    if (!value || logicFormData.tags.includes(value)) return;
    setLogicFormData(prev => ({ ...prev, tags: [...prev.tags, value] }));
    setLogicTagInput('');
  };

  const removeLogicTag = (tagToRemove) => {
    setLogicFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleQASave = async () => {
    if (!supabase) {
      showAlert('Supabase client is not available.', 'error');
      return;
    }

    if (!qaFormData.prompt.trim() || !qaFormData.response.trim()) {
      showAlert('Prompt and response are required.', 'error');
      return;
    }

    setQASaving(true);

    try {
      const payload = {
        prompt: qaFormData.prompt.trim(),
        response: qaFormData.response.trim(),
        tags: qaFormData.tags
      };

      if (editingQAItem?.id) {
        const { error } = await supabase
          .from('training_data')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingQAItem.id);

        if (error) throw error;
        showAlert('Q&A pair updated successfully.', 'success');
      } else {
        const { error } = await supabase
          .from('training_data')
          .insert([payload]);

        if (error) throw error;
        showAlert('Q&A pair added successfully.', 'success');
      }

      closeQADialog();
      await fetchAllData();
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to save Q&A pair:', error);
      showAlert('Failed to save Q&A data.', 'error');
    } finally {
      setQASaving(false);
    }
  };

  const handleQADelete = async (id) => {
    if (!supabase) {
      showAlert('Supabase client is not available.', 'error');
      return;
    }

    try {
      const { error } = await supabase
        .from('training_data')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showAlert('Q&A pair deleted.', 'success');
      await fetchAllData();
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to delete Q&A pair:', error);
      showAlert('Failed to delete Q&A data.', 'error');
    }
  };

  const handleLogicSave = async () => {
    if (!supabase) {
      showAlert('Supabase client is not available.', 'error');
      return;
    }

    if (!logicFormData.title.trim() || !logicFormData.content.trim()) {
      showAlert('Title and content are required.', 'error');
      return;
    }

    setLogicSaving(true);

    try {
      const payload = {
        title: logicFormData.title.trim(),
        content: logicFormData.content.trim(),
        category: (logicFormData.category || defaultLogicCategory).toString(),
        tags: logicFormData.tags
      };

      if (editingLogicItem?.id) {
        const { error } = await supabase
          .from('logic_notes')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingLogicItem.id);

        if (error) throw error;
        showAlert('Logic note updated successfully.', 'success');
      } else {
        const { error } = await supabase
          .from('logic_notes')
          .insert([{ ...payload, created_by: userId }]);

        if (error) throw error;
        showAlert('Logic note added successfully.', 'success');
      }

      closeLogicDialog();
      await fetchAllData();
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to save logic note:', error);
      showAlert('Failed to save logic note.', 'error');
    } finally {
      setLogicSaving(false);
    }
  };

  const handleLogicDelete = async (id) => {
    if (!supabase) {
      showAlert('Supabase client is not available.', 'error');
      return;
    }

    try {
      const { error } = await supabase
        .from('logic_notes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showAlert('Logic note deleted.', 'success');
      await fetchAllData();
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to delete logic note:', error);
      showAlert('Failed to delete logic note.', 'error');
    }
  };

  const handleFileUpload = async (event) => {
    if (!supabase) {
      showAlert('Supabase client is not available.', 'error');
      return;
    }

    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown'];

    if (!allowedTypes.includes(file.type)) {
      showAlert('Only PDF, DOCX, TXT, and MD files are allowed.', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const storagePath = `${userId || 'admin'}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('reference-materials')
        .upload(storagePath, file, { upsert: false });

      if (uploadError) throw uploadError;

      setUploadProgress(60);

      let content = '';
      if (file.type === 'text/plain' || file.type === 'text/markdown') {
        content = await file.text();
      }

      const { error: dbError } = await supabase
        .from('reference_materials')
        .insert([
          {
            filename: storagePath,
            original_filename: file.name,
            file_type: file.type,
            file_size: file.size,
            content,
            uploaded_by: userId
          }
        ]);

      if (dbError) throw dbError;

      setUploadProgress(100);
      showAlert('File uploaded successfully.', 'success');
      await fetchAllData();
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
      showAlert('Failed to upload file.', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      event.target.value = '';
    }
  };

  const handleDeleteMaterial = async (material) => {
    if (!supabase) {
      showAlert('Supabase client is not available.', 'error');
      return;
    }

    try {
      const { error: storageError } = await supabase.storage
        .from('reference-materials')
        .remove([material.filename]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('reference_materials')
        .delete()
        .eq('id', material.id);

      if (dbError) throw dbError;

      showAlert('Reference material deleted.', 'success');
      await fetchAllData();
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to delete reference material:', error);
      showAlert('Failed to delete reference material.', 'error');
    }
  };

  const formatDate = (value) => {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleDateString();
    } catch (error) {
      return value;
    }
  };

  const formatNumber = (value) => {
    if (value === null || value === undefined) return '—';
    if (value > 999999) return `${(value / 1000000).toFixed(1)}M`;
    if (value > 999) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return '—';
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    const value = bytes / Math.pow(1024, index);
    return `${value.toFixed(1)} ${units[index]}`;
  };

  const totalQAPairs = trainingData.length;
  const totalReferenceFiles = referenceMaterials.length;
  const totalLogicNotes = logicNotes.length;
  const totalKnowledgeItems = totalQAPairs + totalReferenceFiles + totalLogicNotes;
  const totalFileBytes = referenceMaterials.reduce((acc, item) => acc + (item.file_size || 0), 0);
  const uniqueTags = new Set([
    ...trainingData.flatMap(item => item.tags || []),
    ...referenceMaterials.flatMap(item => item.tags || []),
    ...logicNotes.flatMap(item => item.tags || [])
  ]);

  const summaryCards = [
    {
      label: 'Q&A Pairs',
      value: formatNumber(totalQAPairs),
      helper: 'Manual prompt / response entries'
    },
    {
      label: 'Reference Files',
      value: formatNumber(totalReferenceFiles),
      helper: 'Documents stored in Supabase'
    },
    {
      label: 'Logic Notes',
      value: formatNumber(totalLogicNotes),
      helper: 'Conversation rules & guardrails'
    },
    {
      label: 'Unique Tags',
      value: formatNumber(uniqueTags.size),
      helper: 'Topics applied across training'
    }
  ];

  const insightCards = [
    {
      title: 'Knowledge Items',
      value: formatNumber(totalKnowledgeItems),
      description: 'Combined Q&A pairs, logic notes, and reference files.'
    },
    {
      title: 'File Library Size',
      value: formatFileSize(totalFileBytes),
      description: 'Total storage footprint for uploaded materials.'
    },
    {
      title: 'Latest Sync',
      value: formatDate(
        [
          ...trainingData.map(item => item.updated_at || item.created_at),
          ...referenceMaterials.map(item => item.updated_at || item.created_at),
          ...logicNotes.map(item => item.updated_at || item.created_at)
        ]
          .filter(Boolean)
          .sort()
          .pop()
      ),
      description: 'Most recent update across any dataset.'
    }
  ];

  const renderQATab = () => (
    <div className="tab-panel">
      <div className="panel-header">
        <div>
          <h3>Question &amp; Answer Pairs</h3>
          <p>Create specific prompt-response pairs for Aura to learn from.</p>
        </div>
        <button className="btn primary" onClick={() => handleQADialogOpen()}>
          <span className="icon">+</span>
          Add Q&amp;A Pair
        </button>
      </div>

      {loading ? (
        <div className="panel-loading">
          <LoadingSpinner size="medium" message="Loading Q&A pairs..." />
        </div>
      ) : trainingData.length === 0 ? (
        <div className="empty-state">
          <h4>No Q&amp;A pairs yet</h4>
          <p>Click "Add Q&amp;A Pair" to create your first prompt-response pair.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Prompt</th>
                <th>Response</th>
                <th>Tags</th>
                <th>Created</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {trainingData.map(item => (
                <tr key={item.id}>
                  <td title={item.prompt}>{item.prompt}</td>
                  <td title={item.response}>{item.response}</td>
                  <td>
                    <div className="tag-list">
                      {item.tags?.map(tag => (
                        <span key={tag} className="tag">
                          {tag}
                        </span>
                      ))}
                      {(!item.tags || item.tags.length === 0) && <span className="muted">No tags</span>}
                    </div>
                  </td>
                  <td>{formatDate(item.created_at)}</td>
                  <td>
                    <div className="table-actions">
                      <button className="icon-btn" onClick={() => handleQADialogOpen(item)} title="Edit">
                        Edit
                      </button>
                      <button className="icon-btn" onClick={() => handleQADelete(item.id)} title="Delete">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderMaterialsTab = () => (
    <div className="tab-panel">
      <div className="panel-header">
        <div>
          <h3>Reference Materials</h3>
          <p>Upload documents for Aura to use as background knowledge (PDF, DOCX, TXT, MD).</p>
        </div>
        <label className={`btn primary ${isUploading ? 'disabled' : ''}`}>
          <input type="file" accept=".pdf,.docx,.txt,.md" onChange={handleFileUpload} disabled={isUploading} />
          <span className="icon" aria-hidden="true">File</span>
          {isUploading ? `Uploading… ${uploadProgress}%` : 'Upload File'}
        </label>
      </div>

      {loading ? (
        <div className="panel-loading">
          <LoadingSpinner size="medium" message="Loading reference materials..." />
        </div>
      ) : referenceMaterials.length === 0 ? (
        <div className="empty-state">
          <h4>No reference materials yet</h4>
          <p>Upload documents to build Aura's knowledge base.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Filename</th>
                <th>Type</th>
                <th>Size</th>
                <th>Uploaded</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {referenceMaterials.map(item => (
                <tr key={item.id}>
                  <td title={item.original_filename}>{item.original_filename}</td>
                  <td>{item.file_type?.split('/').pop()?.toUpperCase()}</td>
                  <td>{formatFileSize(item.file_size)}</td>
                  <td>{formatDate(item.created_at)}</td>
                  <td>
                    <div className="table-actions">
                      <button className="icon-btn" onClick={() => handleDeleteMaterial(item)} title="Delete">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderLogicTab = () => (
    <div className="tab-panel">
      <div className="panel-header">
        <div>
          <h3>Logic Notes</h3>
          <p>Add facts, rules, and guidelines that shape Aura's conversational logic.</p>
        </div>
        <button className="btn primary" onClick={() => handleLogicDialogOpen()}>
          <span className="icon">+</span>
          Add Logic Note
        </button>
      </div>

      {loading ? (
        <div className="panel-loading">
          <LoadingSpinner size="medium" message="Loading logic notes..." />
        </div>
      ) : logicNotes.length === 0 ? (
        <div className="empty-state">
          <h4>No logic notes yet</h4>
          <p>Define guidance and behavioral rules for Aura.</p>
        </div>
      ) : (
        <div className="logic-grid">
          {logicNotes.map(item => (
            <div key={item.id} className="logic-card">
              <div className="logic-header">
                <div>
                  <h4>{item.title}</h4>
                  <div className="logic-meta">
                    <span className="tag subtle">{item.category}</span>
                    <span className="muted">{formatDate(item.created_at)}</span>
                  </div>
                </div>
                <div className="table-actions">
                  <button className="icon-btn" onClick={() => handleLogicDialogOpen(item)} title="Edit">
                    Edit
                  </button>
                  <button className="icon-btn" onClick={() => handleLogicDelete(item.id)} title="Delete">
                    Delete
                  </button>
                </div>
              </div>
              <p className="logic-content">{item.content}</p>
              {item.tags && item.tags.length > 0 && (
                <div className="tag-list">
                  {item.tags.map(tag => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="training-dashboard">
      {alert && (
        <div className="alert-container">
          <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
        </div>
      )}

      <div className="header">
        <div>
          <h2>AI Training Content</h2>
          <p>Keep Aura’s prompts, documents, and logic synchronized with your Supabase tables.</p>
        </div>
        <div className="header-actions">
          <button
            className="btn secondary"
            onClick={() => fetchAllData(true)}
            disabled={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh Data'}
          </button>
        </div>
      </div>

      <div className="summary-grid">
        {summaryCards.map(card => (
          <div key={card.label} className="summary-card">
            <div className="summary-value">{card.value}</div>
            <div className="summary-label">{card.label}</div>
            <div className="summary-helper">{card.helper}</div>
          </div>
        ))}
      </div>

      <div className="insight-grid">
        {insightCards.map(card => (
          <div key={card.title} className="insight-card">
            <h4>{card.title}</h4>
            <div className="insight-value">{card.value}</div>
            <p>{card.description}</p>
          </div>
        ))}
      </div>

      <div className="tabs">
        <button className={`tab-button ${activeTab === 'qa' ? 'active' : ''}`} onClick={() => setActiveTab('qa')}>
          Manual Training
        </button>
        <button className={`tab-button ${activeTab === 'materials' ? 'active' : ''}`} onClick={() => setActiveTab('materials')}>
          Reference Materials
        </button>
        <button className={`tab-button ${activeTab === 'logic' ? 'active' : ''}`} onClick={() => setActiveTab('logic')}>
          Logic Notes
        </button>
      </div>

      {activeTab === 'qa' && renderQATab()}
      {activeTab === 'materials' && renderMaterialsTab()}
      {activeTab === 'logic' && renderLogicTab()}

      {isQADialogOpen && (
        <div className="modal-overlay" onClick={closeQADialog}>
          <div className="modal" onClick={event => event.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingQAItem ? 'Edit Q&A Pair' : 'Add Q&A Pair'}</h3>
              <button className="icon-btn" onClick={closeQADialog}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <label>
                <span>Prompt / Question</span>
                <textarea
                  value={qaFormData.prompt}
                  onChange={event => setQAFormData(prev => ({ ...prev, prompt: event.target.value }))}
                  rows={3}
                  placeholder="Enter the user prompt or question..."
                />
              </label>
              <label>
                <span>Response</span>
                <textarea
                  value={qaFormData.response}
                  onChange={event => setQAFormData(prev => ({ ...prev, response: event.target.value }))}
                  rows={4}
                  placeholder="Enter Aura's response..."
                />
              </label>
              <label>
                <span>Tags</span>
                <div className="tag-input">
                  <input
                    type="text"
                    value={qaTagInput}
                    onChange={event => setQATagInput(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addQATag();
                      }
                    }}
                    placeholder="Add a tag and press Enter"
                  />
                  <button type="button" className="btn secondary" onClick={addQATag}>
                    Add Tag
                  </button>
                </div>
              </label>
              {qaFormData.tags.length > 0 && (
                <div className="tag-list editable">
                  {qaFormData.tags.map(tag => (
                    <span key={tag} className="tag" onClick={() => removeQATag(tag)}>
                      {tag} ×
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn secondary" onClick={closeQADialog}>
                Cancel
              </button>
              <button className={`btn primary ${qaSaving ? 'disabled' : ''}`} onClick={handleQASave} disabled={qaSaving}>
                {qaSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLogicDialogOpen && (
        <div className="modal-overlay" onClick={closeLogicDialog}>
          <div className="modal" onClick={event => event.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingLogicItem ? 'Edit Logic Note' : 'Add Logic Note'}</h3>
              <button className="icon-btn" onClick={closeLogicDialog}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <label>
                <span>Title</span>
                <input
                  type="text"
                  value={logicFormData.title}
                  onChange={event => setLogicFormData(prev => ({ ...prev, title: event.target.value }))}
                  placeholder="Enter note title..."
                />
              </label>
              <label>
                <span>Category</span>
                <select
                  value={logicFormData.category}
                  onChange={event => setLogicFormData(prev => ({ ...prev, category: event.target.value }))}
                >
                  {logicCategories.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Content</span>
                <textarea
                  value={logicFormData.content}
                  onChange={event => setLogicFormData(prev => ({ ...prev, content: event.target.value }))}
                  rows={6}
                  placeholder="Enter facts, rules, or guidance for Aura..."
                />
              </label>
              <label>
                <span>Tags</span>
                <div className="tag-input">
                  <input
                    type="text"
                    value={logicTagInput}
                    onChange={event => setLogicTagInput(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addLogicTag();
                      }
                    }}
                    placeholder="Add a tag and press Enter"
                  />
                  <button type="button" className="btn secondary" onClick={addLogicTag}>
                    Add Tag
                  </button>
                </div>
              </label>
              {logicFormData.tags.length > 0 && (
                <div className="tag-list editable">
                  {logicFormData.tags.map(tag => (
                    <span key={tag} className="tag" onClick={() => removeLogicTag(tag)}>
                      {tag} ×
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn secondary" onClick={closeLogicDialog}>
                Cancel
              </button>
              <button className={`btn primary ${logicSaving ? 'disabled' : ''}`} onClick={handleLogicSave} disabled={logicSaving}>
                {logicSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .training-dashboard {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }

        .alert-container {
          position: sticky;
          top: var(--space-2);
          z-index: 10;
        }

        .header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
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
          max-width: 720px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--space-4);
        }

        .summary-card {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: var(--space-1);
          padding: var(--space-4);
          border-radius: var(--radius-xl);
          border: 1px solid var(--gray-200);
          background: var(--white);
          box-shadow: var(--shadow-xs);
        }

        .summary-value {
          font-size: var(--text-2xl);
          font-weight: var(--font-weight-semibold);
          color: var(--gray-900);
        }

        .summary-label {
          font-weight: var(--font-weight-medium);
          color: var(--gray-700);
        }

        .summary-helper {
          color: var(--gray-500);
          font-size: var(--text-sm);
        }

        .insight-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: var(--space-4);
        }

        .insight-card {
          background: var(--white);
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-xl);
          padding: var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .insight-card h4 {
          font-size: var(--text-base);
          font-weight: var(--font-weight-semibold);
          color: var(--gray-800);
        }

        .insight-value {
          font-size: var(--text-xl);
          font-weight: var(--font-weight-semibold);
          color: var(--primary-600);
        }

        .insight-card p {
          color: var(--gray-600);
          font-size: var(--text-sm);
        }

        .tabs {
          display: flex;
          gap: var(--space-2);
          background: var(--gray-100);
          padding: var(--space-1);
          border-radius: var(--radius-lg);
        }

        .tab-button {
          flex: 1;
          border: none;
          background: transparent;
          padding: var(--space-3) var(--space-4);
          border-radius: var(--radius-md);
          font-weight: var(--font-weight-medium);
          color: var(--gray-600);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .tab-button.active {
          background: var(--white);
          color: var(--primary-600);
          box-shadow: var(--shadow-sm);
        }

        .tab-panel {
          background: var(--white);
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-xl);
          padding: var(--space-5);
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          gap: var(--space-4);
          align-items: center;
          flex-wrap: wrap;
        }

        .panel-header h3 {
          font-size: var(--text-xl);
          font-weight: var(--font-weight-semibold);
          color: var(--gray-900);
        }

        .panel-header p {
          color: var(--gray-600);
          margin-top: var(--space-1);
          max-width: 520px;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          border-radius: var(--radius-md);
          padding: var(--space-2) var(--space-4);
          cursor: pointer;
          font-weight: var(--font-weight-medium);
          border: none;
          transition: background var(--transition-fast), color var(--transition-fast);
          position: relative;
          overflow: hidden;
        }

        .btn.primary {
          background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
          color: var(--white);
        }

        .btn.primary.disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn.secondary {
          background: var(--gray-100);
          color: var(--gray-700);
        }

        .btn.secondary:hover {
          background: var(--gray-200);
        }

        .btn.primary:hover:not(.disabled) {
          background: linear-gradient(135deg, var(--primary-600), var(--primary-700));
        }

        .btn input[type='file'] {
          position: absolute;
          inset: 0;
          opacity: 0;
          cursor: pointer;
          width: 100%;
          height: 100%;
        }

        .btn.disabled input[type='file'] {
          pointer-events: none;
        }

        select {
          border: 1px solid var(--gray-300);
          border-radius: var(--radius-md);
          padding: var(--space-3);
          font-size: var(--text-base);
        }

        .table-container {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th,
        td {
          text-align: left;
          padding: var(--space-3);
          border-bottom: 1px solid var(--gray-200);
          vertical-align: top;
        }

        th {
          font-weight: var(--font-weight-semibold);
          font-size: var(--text-sm);
          color: var(--gray-600);
          text-transform: uppercase;
          letter-spacing: 0.03em;
          background: var(--gray-50);
        }

        .actions-col {
          width: 120px;
        }

        .table-actions {
          display: flex;
          gap: var(--space-2);
        }

        .icon-btn {
          border: none;
          background: var(--gray-100);
          padding: var(--space-2);
          border-radius: var(--radius-md);
          cursor: pointer;
        }

        .icon-btn:hover {
          background: var(--gray-200);
        }

        .tag-list {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-2);
        }

        .tag-list.editable .tag {
          cursor: pointer;
        }

        .tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--gray-100);
          padding: 4px 10px;
          border-radius: 999px;
          font-size: var(--text-sm);
        }

        .tag.subtle {
          background: var(--primary-50);
          color: var(--primary-600);
        }

        .muted {
          color: var(--gray-500);
          font-size: var(--text-sm);
        }

        .empty-state {
          text-align: center;
          padding: var(--space-12) var(--space-4);
          color: var(--gray-600);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-2);
        }

        .panel-loading {
          display: flex;
          justify-content: center;
          padding: var(--space-10) 0;
        }

        .logic-grid {
          display: grid;
          gap: var(--space-4);
        }

        .logic-card {
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
          background: var(--gray-50);
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .logic-header {
          display: flex;
          justify-content: space-between;
          gap: var(--space-4);
          align-items: flex-start;
        }

        .logic-meta {
          display: flex;
          gap: var(--space-3);
          align-items: center;
          margin-top: var(--space-1);
        }

        .logic-content {
          white-space: pre-wrap;
          color: var(--gray-700);
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(17, 24, 39, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: var(--space-4);
        }

        .modal {
          background: var(--white);
          border-radius: var(--radius-xl);
          max-width: 640px;
          width: 100%;
          display: flex;
          flex-direction: column;
          max-height: 90vh;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-4) var(--space-5);
          border-bottom: 1px solid var(--gray-200);
        }

        .modal-body {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          padding: var(--space-5);
          overflow-y: auto;
        }

        .modal-body label {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          font-weight: var(--font-weight-medium);
          color: var(--gray-700);
        }

        .modal-body textarea,
        .modal-body input {
          border: 1px solid var(--gray-300);
          border-radius: var(--radius-md);
          padding: var(--space-3);
          font-size: var(--text-base);
        }

        .tag-input {
          display: flex;
          gap: var(--space-2);
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: var(--space-3);
          padding: var(--space-4) var(--space-5);
          border-top: 1px solid var(--gray-200);
        }

        @media (max-width: 768px) {
          .header {
            flex-direction: column;
            align-items: flex-start;
          }

          .summary-grid,
          .insight-grid {
            grid-template-columns: 1fr;
          }

          .tabs {
            flex-direction: column;
          }

          .tab-button {
            width: 100%;
          }

          .panel-header {
            align-items: flex-start;
          }
        }

        @media (max-width: 540px) {
          .modal {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default TrainingDashboard;
