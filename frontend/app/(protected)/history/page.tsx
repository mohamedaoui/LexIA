"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { getToken, getUser } from '../../utils/auth';
import { Session as SessionType } from '../../types';

interface SessionWithCount extends SessionType {
  messageCount?: number;
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'recent' | 'older'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchSessions = async () => {
      setLoading(true);
      try {
        const token = getToken();
        const user = getUser();
        
        if (!user || !user.userId) {
          setError('User information not found. Please log in again.');
          setLoading(false);
          return;
        }
        
        const response = await axios.get(`/api/sessions?userId=${user.userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        // Check if response has the expected structure
        if (response.data && response.data.sessions) {
          const sessionList = response.data.sessions || [];
          setSessions(sessionList.map((session: SessionType) => ({ 
            ...session, 
            messageCount: session.Chat?.length || 0 
          })));
        } else {
          setSessions([]);
        }
        setError(null);
      } catch (err: any) {
        console.error('Failed to fetch sessions:', err);
        
        // Provide more detailed error information
        if (err.response?.status === 400) {
          const errorMessage = err.response.data?.error || 'Invalid request parameters';
          setError(`Error: ${errorMessage}`);
        } else {
          setError('Failed to load consultation history. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  // Filter sessions based on date
  const getFilteredSessions = () => {
    let filtered = [...sessions];
    
    // Apply date filter
    if (filter === 'recent') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      filtered = filtered.filter(
        (session) => new Date(session.startDate) >= oneWeekAgo
      );
    } else if (filter === 'older') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      filtered = filtered.filter(
        (session) => new Date(session.startDate) < oneWeekAgo
      );
    }
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (session) => session.title.toLowerCase().includes(term)
      );
    }
    
    // Sort by date (newest first)
    return filtered.sort(
      (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );
  };

  // Group sessions by month
  const groupSessionsByMonth = () => {
    const filteredSessions = getFilteredSessions();
    const grouped: Record<string, SessionWithCount[]> = {};
    
    filteredSessions.forEach((session) => {
      const date = new Date(session.startDate);
      const monthYear = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
      
      if (!grouped[monthYear]) {
        grouped[monthYear] = [];
      }
      
      grouped[monthYear].push(session);
    });
    
    return grouped;
  };

  const groupedSessions = groupSessionsByMonth();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2 text-amber-900">Consultation History</h1>
      <p className="text-amber-700 mb-6">View and manage your past legal consultations</p>
      
      {error && (
        <div className="bg-amber-50 border-l-4 border-amber-600 text-amber-800 px-4 py-3 rounded-r-md mb-6">
          {error}
        </div>
      )}
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md border border-amber-100 p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`text-sm px-4 py-2 rounded-md transition-colors ${filter === 'all' 
                ? 'bg-slate-700 text-white' 
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('recent')}
              className={`text-sm px-4 py-2 rounded-md transition-colors ${filter === 'recent' 
                ? 'bg-slate-700 text-white' 
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'}`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setFilter('older')}
              className={`text-sm px-4 py-2 rounded-md transition-colors ${filter === 'older' 
                ? 'bg-slate-700 text-white' 
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'}`}
            >
              Older
            </button>
          </div>
          
          <div className="relative">
            <input
              type="text"
              placeholder="Search consultations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-64 px-3 py-2 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-600 focus:border-slate-600 placeholder-amber-400 text-amber-900"
            />
          </div>
        </div>
      </div>
      
      {/* Sessions list */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-md border border-amber-100 p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-700 mx-auto mb-3"></div>
          <p className="text-amber-800">Loading consultation history...</p>
        </div>
      ) : Object.keys(groupedSessions).length === 0 ? (
        <div className="bg-white rounded-lg shadow-md border border-amber-100 p-8 text-center">
          <div className="text-amber-700 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-amber-800 mb-4">No consultations found.</p>
          <div className="mt-4">
            <Link href="/chat">
              <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors">
                Start New Consultation
              </button>
            </Link>
          </div>
        </div>
      ) : (
        Object.entries(groupedSessions).map(([monthYear, monthSessions]) => (
          <div key={monthYear} className="mb-8">
            <h2 className="text-lg font-semibold mb-3 text-amber-800">{monthYear}</h2>
            <div className="bg-white rounded-lg shadow-md border border-amber-100 divide-y divide-amber-100">
              {monthSessions.map((session) => {
                const date = new Date(session.startDate);
                const formattedDate = date.toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });
                const formattedTime = date.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                
                return (
                  <Link 
                    href={`/chat?session=${session.id}`} 
                    key={session.id}
                    className="block p-4 hover:bg-amber-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-amber-900">{session.title}</h3>
                        <p className="text-sm text-amber-700">
                          {formattedDate} at {formattedTime}
                        </p>
                      </div>
                      {session.messageCount && (
                        <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-full">
                          {session.messageCount} messages
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
