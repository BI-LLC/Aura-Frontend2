// Aura Voice AI - Chatbot Service
// ===============================

import { apiHelper } from './api';

/**
 * Chatbot Service
 * 
 * Handles all chatbot-related API calls
 * Training, configuration, and interaction endpoints
 */
export const chatbotService = {
  // Train chatbot with text data
  trainWithText: async (textData, tags = []) => {
    try {
      const result = await apiHelper.post('/chatbot/train/text', {
        text: textData,
        tags,
        type: 'text'
      });

      if (result.success) {
        return {
          success: true,
          message: 'Training data added successfully',
          data: result.data
        };
      }

      return {
        success: false,
        error: result.error?.detail || 'Failed to add training data'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to add training data'
      };
    }
  },

  // Train chatbot with Q&A pairs
  trainWithQA: async (prompt, response, tags = []) => {
    try {
      const result = await apiHelper.post('/chatbot/train/qa', {
        prompt,
        response,
        tags,
        type: 'qa_pair'
      });

      if (result.success) {
        return {
          success: true,
          message: 'Q&A pair added successfully',
          data: result.data
        };
      }

      return {
        success: false,
        error: result.error?.detail || 'Failed to add Q&A pair'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to add Q&A pair'
      };
    }
  },

  // Train chatbot with document
  trainWithDocument: async (file, onProgress = null) => {
    try {
      const result = await apiHelper.uploadFile('/chatbot/train/document', file, onProgress);

      if (result.success) {
        return {
          success: true,
          message: 'Document uploaded and processing started',
          data: result.data
        };
      }

      return {
        success: false,
        error: result.error?.detail || 'Failed to upload document'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to upload document'
      };
    }
  },

  // Add logic note
  addLogicNote: async (title, content, category = 'general', tags = []) => {
    try {
      const result = await apiHelper.post('/chatbot/logic-notes', {
        title,
        content,
        category,
        tags
      });

      if (result.success) {
        return {
          success: true,
          message: 'Logic note added successfully',
          data: result.data
        };
      }

      return {
        success: false,
        error: result.error?.detail || 'Failed to add logic note'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to add logic note'
      };
    }
  },

  // Get training data
  getTrainingData: async (type = 'all') => {
    try {
      const result = await apiHelper.get('/chatbot/training-data', { type });

      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      }

      return {
        success: false,
        error: result.error?.detail || 'Failed to get training data'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to get training data'
      };
    }
  },

  // Delete training data
  deleteTrainingData: async (id, type) => {
    try {
      const result = await apiHelper.delete(`/chatbot/training-data/${id}?type=${type}`);

      if (result.success) {
        return {
          success: true,
          message: 'Training data deleted successfully'
        };
      }

      return {
        success: false,
        error: result.error?.detail || 'Failed to delete training data'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to delete training data'
      };
    }
  },

  // Update chatbot configuration
  updateConfiguration: async (config) => {
    try {
      const result = await apiHelper.put('/chatbot/config', config);

      if (result.success) {
        return {
          success: true,
          message: 'Configuration updated successfully',
          data: result.data
        };
      }

      return {
        success: false,
        error: result.error?.detail || 'Failed to update configuration'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to update configuration'
      };
    }
  },

  // Get chatbot configuration
  getConfiguration: async () => {
    try {
      const result = await apiHelper.get('/chatbot/config');

      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      }

      return {
        success: false,
        error: result.error?.detail || 'Failed to get configuration'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to get configuration'
      };
    }
  },

  // Get widget code
  getWidgetCode: async (userId) => {
    try {
      const result = await apiHelper.get(`/chatbot/widget/${userId}`);

      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      }

      return {
        success: false,
        error: result.error?.detail || 'Failed to get widget code'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to get widget code'
      };
    }
  },

  // Get chatbot analytics
  getAnalytics: async (timeRange = '30d') => {
    try {
      const result = await apiHelper.get('/chatbot/analytics', { timeRange });

      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      }

      return {
        success: false,
        error: result.error?.detail || 'Failed to get analytics'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to get analytics'
      };
    }
  },

  // Send message to chatbot
  sendMessage: async (message, conversationId = null) => {
    try {
      const result = await apiHelper.post('/chatbot/chat', {
        message,
        conversation_id: conversationId
      });

      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      }

      return {
        success: false,
        error: result.error?.detail || 'Failed to send message'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to send message'
      };
    }
  },

  // Get conversation history
  getConversationHistory: async (conversationId) => {
    try {
      const result = await apiHelper.get(`/chatbot/conversation/${conversationId}`);

      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      }

      return {
        success: false,
        error: result.error?.detail || 'Failed to get conversation history'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to get conversation history'
      };
    }
  },

  // Get all conversations
  getConversations: async (limit = 50, offset = 0) => {
    try {
      const result = await apiHelper.get('/chatbot/conversations', { limit, offset });

      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      }

      return {
        success: false,
        error: result.error?.detail || 'Failed to get conversations'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to get conversations'
      };
    }
  }
};

export default chatbotService;