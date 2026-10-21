import axios from 'axios';
import { getToken } from './auth';

// Base API URL
const API_URL = '/api';

// API functions for authentication
export const authApi = {
  login: async (email: string, password: string) => {
    try {
      const token = getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await axios.post(`${API_URL}/auth/login`, 
        { email, password },
        { 
          headers: {
            'Content-Type': 'application/json',
            ...headers
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  register: async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: string;
  }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, userData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },
};

// API functions for chat sessions
export const sessionsApi = {
  getAllSessions: async (userId?: string) => {
    try {
      const token = getToken();
      // Build URL with query parameters
      let url = `${API_URL}/sessions`;
      if (userId) {
        url += `?userId=${userId}`;
      }
      
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Return the sessions array from the response
      return response.data.sessions || [];
    } catch (error) {
      console.error('Get sessions error:', error);
      throw error;
    }
  },
  
  getSessionById: async (sessionId: string) => {
    try {
      const token = getToken();
      const response = await axios.get(`${API_URL}/sessions/${sessionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Get session ${sessionId} error:`, error);
      throw error;
    }
  },
  
  createSession: async (title: string) => {
    try {
      const token = getToken();
      const response = await axios.post(`${API_URL}/sessions`, 
        { title },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Create session error:', error);
      throw error;
    }
  },
};

// API functions for chat messages
export const chatApi = {
  sendMessage: async (sessionId: string, message: string) => {
    try {
      const token = getToken();
      const response = await axios.post(`${API_URL}/chatbot`, 
        { sessionId, message },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Send message error:', error);
      throw error;
    }
  },
};
