"use client";

import React, { useState, KeyboardEvent, useEffect } from 'react';

// Helper function to detect RTL text (Arabic, Hebrew, etc.)
function isRTL(text: string): boolean {
  // RTL Unicode ranges - specifically targeting Arabic characters
  const arabicChars = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  
  // Check if any Arabic character is present
  return arabicChars.test(text);
}

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSendMessage, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isRtlInput, setIsRtlInput] = useState(false);
  
  // Detect text direction when message changes
  useEffect(() => {
    // Even if empty, we want to reset to LTR
    setIsRtlInput(message.trim() ? isRTL(message) : false);
  }, [message]);
  
  // Handle input changes with immediate RTL detection
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setMessage(newValue);
    
    // Immediately detect if Arabic is being typed
    if (newValue.trim()) {
      setIsRtlInput(isRTL(newValue));
    } else {
      setIsRtlInput(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-amber-200 p-4 bg-white shadow-sm">
      <div className="flex flex-col space-x-3">
        <div className="w-full">
          <textarea
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your legal question here..."
            className={`w-full border border-amber-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-slate-600 focus:border-slate-600 resize-none placeholder-slate-700 text-black ${isRtlInput ? 'rtl-input' : 'ltr-input'}`}
            dir={isRtlInput ? 'rtl' : 'ltr'}
            rows={3}
            disabled={disabled}
          />
          
        </div>
        <div className='flex justify-between items-center'>
          <p className="text-xs text-amber-700 mt-1">
            Press Enter to send, Shift+Enter for a new line
          </p>
          <button
            type="submit"
            disabled={!message.trim() || disabled}
            className={`px-6 py-3 rounded-md transition-colors ${!message.trim() || disabled 
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
              : 'bg-slate-700 text-white hover:bg-slate-600'}`}
          >
            Send
          </button>
        </div>
      </div>
    </form>
  );
}
