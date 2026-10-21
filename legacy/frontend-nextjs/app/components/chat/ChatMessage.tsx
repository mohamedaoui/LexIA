"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';

// Helper function to detect RTL text (Arabic, Hebrew, etc.)
function isRTL(text: string): boolean {
  // RTL Unicode ranges - specifically targeting Arabic characters
  const arabicChars = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  
  // Check if any Arabic character is present
  return arabicChars.test(text);
}

interface ChatMessageProps {
  message: {
    id: string;
    content: string;
    sender: 'user' | 'model';
    timestamp: Date;
  };
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.sender === 'user';
  const isRtlText = isRTL(message.content);
  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Determine alignment based on sender
  const containerClass = isUser ? 'justify-end' : 'justify-start';
  
  // Determine bubble styling based on sender
  const bubbleClass = isUser 
    ? 'bg-amber-200 text-amber-900 border border-amber-300' 
    : 'bg-white border border-amber-200 text-slate-800';

  return (
    <div className={`flex ${containerClass} mb-4`}>
      <div 
        className={`max-w-[80%] md:max-w-[70%] rounded-lg px-4 py-3 shadow-sm ${bubbleClass} ${isRtlText ? 'rtl-text' : 'ltr-text'}`}
        dir={isRtlText ? 'rtl' : 'ltr'}
      >
        {isUser ? (
          <div className={`whitespace-pre-wrap ${isRtlText ? 'rtl-text' : 'ltr-text'}`}>
            {message.content}
          </div>
        ) : (
          <div className={`prose prose-amber prose-sm max-w-none ${isRtlText ? 'rtl-text' : 'ltr-text'}`}>
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
        <div
          className={`text-xs mt-1 ${
            isUser ? 'text-amber-700' : 'text-slate-500'
          }`}
        >
          {formattedTime}
        </div>
      </div>
    </div>
  );
}
