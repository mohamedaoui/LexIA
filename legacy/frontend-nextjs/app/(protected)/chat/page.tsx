"use client";

import React, { useState, useEffect, useRef } from "react";
import ChatMessage from "../../components/chat/ChatMessage";
import ChatInput from "../../components/chat/ChatInput";
import { getSession } from "../../utils/chat";
import styles from "../../components/chat/chat.module.css";
import { sessionsApi } from "@/app/utils/api";
import { Prisma } from "@/app/generated/prisma";

interface Message {
  id: string;
  content: string;
  sender: "user" | "model";
  timestamp: Date;
}

export default function ChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // get sessionId from url and load session data
  useEffect(() => {
    const loadSessionData = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const sid = urlParams.get("session");
        
        if (sid) {
          setLoading(true);
          setSessionId(sid);
          
          // Get session data with chat history
          const session = await sessionsApi.getSessionById(sid);
          
          if (session && session.Chat && Array.isArray(session.Chat)) {
            // Filter chat messages and format them
            const formattedMessages = session.Chat
              .filter((chat: any) => chat.type === "chat")
              .map((msg: any) => ({
                id: msg.id,
                content: msg.message,
                sender: msg.sender,
                timestamp: new Date(msg.sentAt),
              }));
            
            setMessages(formattedMessages);
          } else {
            console.error("Invalid session data structure:", session);
            setMessages([
              {
                id: "err-structure",
                content: "Error loading chat history: Invalid data structure.",
                sender: "model",
                timestamp: new Date(),
              },
            ]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch session messages:", err);
        setMessages([
          {
            id: "err",
            content: "Could not load chat history. Please try again later.",
            sender: "model",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    loadSessionData();
  }, []);

  // auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (content: string) => {
    setLoading(true);

    // 1) Ensure we have a locally-scoped sid
    let sid = sessionId;
    if (!sid) {
      try {
        const session = await getSession(content);
        sid = session.id; // <— hold onto it locally
        setSessionId(sid); // <— also update React state
      } catch (err) {
        console.error(err);
        setMessages([
          {
            id: "err",
            content: "Could not start session.",
            sender: "model",
            timestamp: new Date(),
          },
        ]);
        setLoading(false);
        return;
      }
    }

    // 2) Append the user message
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      content,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((m) => [...m, userMsg]);

    // 3) POST using our local sid
    try {
      const user = JSON.parse(sessionStorage.getItem("user") || "{}");
      const token = sessionStorage.getItem("token");
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          userId: user.userId,
          sessionId: sid, // <— use sid, not sessionId!
          prompt: content,
        }),
      });
      if (!res.ok) throw new Error(`Chatbot POST failed (${res.status})`);

      // 4) Stream the response
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let partial = "";

      // Insert placeholder AI message
      const aiId = `ai-${Date.now()}`;
      setMessages((m) => [
        ...m,
        { id: aiId, content: "", sender: "model", timestamp: new Date() },
      ]);

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          // decode with streaming flag!
          partial += decoder.decode(value, { stream: true });
          setMessages((m) =>
            m.map((msg) =>
              msg.id === aiId ? { ...msg, content: partial } : msg
            )
          );
        }
      }
    } catch (err) {
      console.error(err);
      setMessages((m) => [
        ...m,
        {
          id: `err-${Date.now()}`,
          content: "Error processing your request.",
          sender: "model",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* header */}
      <div className="bg-white p-4 border-b border-amber-200 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-xl font-semibold text-amber-900">
            Legal Consultation
          </h1>
          <p className="text-sm text-amber-700">
            Ask your legal questions about Moroccan law
          </p>
        </div>
      </div>

      {/* message list */}
      <div className="flex-1 overflow-y-auto p-4 bg-amber-50">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {loading && (
          <div className="flex justify-start mb-4">
            <div className="bg-white border border-amber-200 rounded-lg px-4 py-3 shadow-sm">
              <div className={styles.typingIndicator}>
                <div className={styles.typingDot} />
                <div className={styles.typingDot} />
                <div className={styles.typingDot} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* input */}
      <ChatInput onSendMessage={handleSend} disabled={loading} />
    </div>
  );
}
