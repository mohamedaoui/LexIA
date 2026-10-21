"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { sessionsApi } from '@/app/utils/api';
import { getUser } from '@/app/utils/auth';

interface Session {
  id: string;
  title: string;
  startDate: string;
  messageCount?: number;
}

export default function DashboardPage() {
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [sessionCount, setSessionCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchRecentSessions = async () => {
      try {
        setLoading(true);
        
        // Get the current user from session storage
        const user = getUser();
        
        if (!user || !user.userId) {
          throw new Error('User ID not found');
        }
        
        // Pass the user ID to the API call
        const sessions = await sessionsApi.getAllSessions(user.userId);
        setSessionCount(sessions.length);
        
        // Sort by date (newest first) and take the 3 most recent
        const sortedSessions = sessions
          .sort((a: Session, b: Session) => {
            return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
          })
          .slice(0, 3);
        
        setRecentSessions(sortedSessions);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch recent sessions:', err);
        setError('Could not load recent consultations');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecentSessions();
  }, []);
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to Morocco Legal Assistant</h1>
          <p className="text-gray-600 mt-1">Get expert legal guidance on Moroccan law through our AI-powered assistant.</p>
        </div>
        <div className="hidden sm:block">
          <Link href="/chat">
            <button className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md transition-colors shadow-sm font-medium">
              Start New Consultation
            </button>
          </Link>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-center">
          <div className="rounded-full bg-amber-100 p-3 mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Sessions</p>
            <h3 className="text-2xl font-bold text-gray-900">{sessionCount || 0}</h3>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-center">
          <div className="rounded-full bg-orange-100 p-3 mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Last Session</p>
            <h3 className="text-2xl font-bold text-gray-900">{recentSessions.length > 0 ? new Date(recentSessions[0].startDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'}) : 'N/A'}</h3>
          </div>
        </div>
      </div>
      
      <div className="sm:hidden mb-6">
        <Link href="/chat" className="block w-full">
          <button className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-md transition-colors shadow-sm font-medium text-center">
            Continue session
          </button>
        </Link>
      </div>
      
      {/* Recent Sessions Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Recent Sessions</h2>
          <Link href="/history" className="text-sm text-amber-600 hover:text-amber-700">View all sessions</Link>
        </div>
          
          {loading ? (
            <div className="flex items-center justify-center p-6">
              <svg className="animate-spin h-5 w-5 mr-2 text-amber-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-gray-600">Loading sessions...</span>
            </div>
          ) : error ? (
            <div className="text-red-600 p-4 bg-red-50 rounded-md text-sm">
              {error}
            </div>
          ) : recentSessions.length === 0 ? (
            <div className="text-gray-600 p-6 text-center bg-gray-50 rounded-md">
              <p>No recent sessions found.</p>
              <p className="mt-2 text-sm">Start a new consultation to get legal assistance.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentSessions.map((session) => {
                const date = new Date(session.startDate);
                const formattedDate = date.toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });
                
                return (
                  <Link 
                    href={`/chat?session=${session.id}`} 
                    key={session.id}
                    className="block p-4 hover:bg-gray-50 transition-colors rounded-md"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium text-gray-900">{session.title || 'Untitled Session'}</h3>
                        <p className="text-xs text-gray-500 mt-1">Started on {formattedDate}</p>
                      </div>
                      {session.messageCount && (
                        <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full font-medium">
                          {session.messageCount} messages
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      
      {/* Quick Links Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Legal Resources</h2>
          <div className="space-y-3">
            <a href="#" className="flex items-center p-3 rounded-md hover:bg-gray-50 transition-colors border border-gray-100">
              <div className="rounded-full bg-green-100 p-2 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-gray-900">Moroccan Legal Codes</div>
                <div className="text-xs text-gray-500">Access legal codes and regulations</div>
              </div>
            </a>
            <a href="#" className="flex items-center p-3 rounded-md hover:bg-gray-50 transition-colors border border-gray-100">
              <div className="rounded-full bg-purple-100 p-2 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-gray-900">Court Schedules</div>
                <div className="text-xs text-gray-500">Find court dates and schedules</div>
              </div>
            </a>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link href="/chat" className="flex items-center p-3 rounded-md hover:bg-gray-50 transition-colors border border-gray-100">
              <div className="rounded-full bg-amber-100 p-2 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-gray-900">New Consultation</div>
                <div className="text-xs text-gray-500">Ask a legal question</div>
              </div>
            </Link>
            <Link href="/history" className="flex items-center p-3 rounded-md hover:bg-gray-50 transition-colors border border-gray-100">
              <div className="rounded-full bg-blue-100 p-2 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-gray-900">History</div>
                <div className="text-xs text-gray-500">View all past consultations</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
