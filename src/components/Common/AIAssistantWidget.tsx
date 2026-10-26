/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Bot, X, Send, RefreshCw, Minimize2, AlertCircle, MessageSquare } from './Icons';
import { useI18n } from '../../i18n/I18nContext';
import type { ComplaintRecord, JobVacancy, UserAccount, Department } from '../../types/needmap';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isError?: boolean;
}

interface AIAssistantWidgetProps {
  currentUser: UserAccount;
  complaints: ComplaintRecord[];
  departments: Department[];
  vacancies: JobVacancy[];
  onNavigateToView?: (viewId: any, targetId?: string) => void;
}

export const AIAssistantWidget: React.FC<AIAssistantWidgetProps> = ({
  currentUser,
  complaints,
  departments,
  vacancies,
  onNavigateToView,
}) => {
  const { lang, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'init-msg',
      sender: 'assistant',
      text:
        currentUser.role === 'worker'
          ? 'Hello. I can assist with your assigned tasks, work checklists, and submitting resolution notes. What would you like to review?'
          : currentUser.role === 'dept_admin' || currentUser.role === 'platform_admin'
          ? 'Hello. I can summarize department queues, analyze priority weights, and help track unresolved complaints. How can I help?'
          : 'Hello. I can help you report an issue, check the progress of your submitted complaints, or explore campus job openings. How can I assist you today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Prepare authorized context based on user's role (ensuring strict ABAC privacy)
  const authorizedContext = useMemo(() => {
    if (currentUser.role === 'citizen') {
      const myComplaints = complaints
        .filter((c) => c.reporterAccountId === currentUser.id)
        .map((c) => ({
          id: c.id,
          title: c.title,
          category: c.category,
          status: c.status,
          priorityTier: c.priorityTier,
          assignedDepartment: departments.find((d) => d.id === c.assignedDepartmentId)?.name || c.assignedDepartmentId,
          resolutionNotes: c.resolutionNotes,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        }));
      return {
        accessibleComplaints: myComplaints,
        vacancies: vacancies.filter((v) => v.status === 'open').map((v) => ({
          id: v.id,
          title: v.title,
          employmentType: v.employmentType,
          status: v.status,
        })),
      };
    } else if (currentUser.role === 'worker') {
      const myTasks = complaints
        .filter(
          (c) =>
            c.assignedWorkerId === (currentUser.workerProfileId || currentUser.id) &&
            c.status !== 'closed' &&
            c.status !== 'cancelled'
        )
        .map((c) => ({
          id: c.id,
          title: c.title,
          category: c.category,
          status: c.status,
          priorityTier: c.priorityTier,
          locationText: c.location?.address || 'Specified site',
          expectedResolutionDate: c.expectedResolutionDate,
        }));
      return {
        accessibleTasks: myTasks,
        departments: departments.map((d) => ({ id: d.id, name: d.name, shortCode: d.shortCode, slaDaysDefault: d.slaDaysDefault })),
      };
    } else {
      // Admin context
      const deptComplaints = complaints
        .filter(
          (c) =>
            !currentUser.departmentId || c.assignedDepartmentId === currentUser.departmentId
        )
        .slice(0, 30)
        .map((c) => ({
          id: c.id,
          title: c.title,
          category: c.category,
          status: c.status,
          priorityTier: c.priorityTier,
          assignedDepartment: departments.find((d) => d.id === c.assignedDepartmentId)?.name || c.assignedDepartmentId,
          assignedWorker: c.assignedWorkerId || 'Unassigned',
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        }));
      return {
        accessibleComplaints: deptComplaints,
        departments: departments.map((d) => ({ id: d.id, name: d.name, shortCode: d.shortCode, slaDaysDefault: d.slaDaysDefault })),
        vacanciesCount: vacancies.length,
      };
    }
  }, [currentUser, complaints, departments, vacancies]);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputText).trim();
    if (!textToSend || isLoading) return;

    setErrorMessage(null);
    setInputText('');

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text,
      }));

      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          role: currentUser.role,
          language: lang,
          context: authorizedContext,
          history: historyPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'The assistant could not complete the request.');
      }

      const botReply: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botReply]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Communication error with assistant service.';
      setErrorMessage(msg);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: `Service Notice: ${msg}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick prompt suggestions based on role
  const quickPrompts = useMemo(() => {
    if (currentUser.role === 'citizen') {
      return [
        'How do I report a new problem?',
        'What is the status of my complaints?',
        'What does resolved awaiting confirmation mean?',
        'Are there any campus job openings?',
      ];
    } else if (currentUser.role === 'worker') {
      return [
        'List my pending tasks',
        'Suggest a checklist for resolving water supply issues',
        'How do I submit resolution evidence?',
      ];
    } else {
      return [
        'Summarize active department complaints',
        'Explain priority score factors',
        'Which complaints require immediate attention?',
      ];
    }
  }, [currentUser.role]);

  return (
    <aside aria-label="NEEDMAP AI Assistant" className="fixed bottom-5 right-5 z-40">
      {/* Floating launcher button when closed */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 px-4 py-3 bg-teal-800 text-teal-50 hover:bg-teal-900 border border-teal-700 transition-colors cursor-pointer select-none"
          title="Open NEEDMAP AI Assistant"
          aria-expanded="false"
        >
          <Bot className="w-5 h-5" />
          <span className="text-sm font-semibold tracking-wide">Assistant</span>
        </button>
      )}

      {/* Assistant Chat Panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label="NEEDMAP AI Assistant Chat"
          className="w-96 sm:w-[420px] max-w-[calc(100vw-24px)] h-[540px] max-h-[82vh] bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-slate-200 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-teal-800 text-teal-100">
                <Bot className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">NEEDMAP Assistant</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">Evidence and workflow guidance</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-700"
                title="Minimize assistant"
                aria-label="Minimize assistant"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-700"
                title="Close assistant"
                aria-label="Close assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Prompts */}
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex gap-1.5 overflow-x-auto scrollbar-thin">
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(q)}
                disabled={isLoading}
                className="text-xs px-2.5 py-1 whitespace-nowrap bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 disabled:opacity-50 text-left transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-50 dark:bg-slate-950">
            {messages.map((m) => {
              const isUser = m.sender === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-500 dark:text-slate-400 px-1">
                    <span>{isUser ? 'You' : 'Assistant'}</span>
                    <span>•</span>
                    <span>{m.timestamp}</span>
                  </div>
                  <div
                    className={`max-w-[88%] text-xs leading-relaxed px-3.5 py-2.5 border ${
                      isUser
                        ? 'bg-teal-800 text-teal-50 border-teal-700'
                        : m.isError
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-900'
                        : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-700 dark:text-teal-400" />
                <span>Checking records and generating guidance...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Error Notice */}
          {errorMessage && (
            <div className="px-3 py-1.5 bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 text-xs border-t border-rose-200 dark:border-rose-900 flex items-center justify-between">
              <span className="truncate">{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-900 dark:text-rose-100 font-semibold ml-2 underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Input Area */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-slate-100 dark:bg-slate-900 border-t border-slate-300 dark:border-slate-800 flex gap-2"
          >
            <label htmlFor="assistant-input-field" className="sr-only">
              Ask NEEDMAP Assistant
            </label>
            <input
              id="assistant-input-field"
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask about complaints, departments, or jobs..."
              disabled={isLoading}
              className="flex-1 text-xs px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-teal-700 dark:focus:border-teal-500 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="px-3.5 py-2 bg-teal-800 hover:bg-teal-900 text-teal-50 text-xs font-semibold disabled:opacity-50 transition-colors flex items-center gap-1 cursor-pointer"
              aria-label="Send message"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      )}
    </aside>
  );
};
