import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, AlertCircle } from 'lucide-react';
import { SignatureCard } from './SignatureCard';
import { useTypedPlaceholder } from './TypedPlaceholder';
import { aiService } from '@/services/ai.service';
import {
  enhancedAIAgentService,
  ClarificationQuestion,
  ClarificationAnswers,
} from '@/services/enhanced-ai-agent.service';
import { creditService } from '@/services/credit.service';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { Recommendation } from '@/lib/types';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  quickReplies?: string[];
  recommendations?: Recommendation[];
  loading?: boolean;
  error?: string;
  reasoning?: string;
  toolsUsed?: string[];
  confidence?: number;
  clarificationQuestions?: ClarificationQuestion[];
}

const initialMessages: Message[] = [
  {
    id: '1',
    text: "Hi! I'm your RepoVerse AI agent. I'm learning and improving every day so I don't disappoint you. If I do, you can always complain to my maker through the feedback section and they'll teach me. Thanks for building with me 🤝",
    sender: 'agent',
  },
];

export function AgentScreen() {
  const { preferences } = useUserPreferences();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [credits, setCredits] = useState(creditService.getBalance());
  const [pendingFeatureDescription, setPendingFeatureDescription] = useState<string | null>(null);
  const [clarificationSelections, setClarificationSelections] = useState<Record<string, string[]>>(
    {}
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Typed placeholder effect
  useTypedPlaceholder({
    strings: [
      "I'm building Netflix for X and want recommendations better than Netflix",
      "I'm building Google for X and want a smarter search engine",
      "I'm building a Notion-style app and need the best open source building blocks",
      "I'm building a Stripe-level product and want world-class API examples",
      "I'm building X — what repos did the best companies learn from?",
      'What are you building today?',
      'Looking for a React project?',
      'Need a Python library?',
    ],
    typeSpeed: 50,
    backSpeed: 30,
    loop: true,
    showCursor: true,
    inputRef,
  });

  // Refill daily credits on mount
  useEffect(() => {
    creditService.refillDailyCredits();
    setCredits(creditService.getBalance());
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const toggleClarificationSelection = (questionId: string, optionId: string, multiSelect?: boolean) => {
    setClarificationSelections((prev) => {
      const current = prev[questionId] || [];
      if (multiSelect) {
        const exists = current.includes(optionId);
        const next = exists ? current.filter((id) => id !== optionId) : [...current, optionId];
        return { ...prev, [questionId]: next };
      }
      // single-select
      return { ...prev, [questionId]: [optionId] };
    });
  };

  const handleSubmitClarifications = async () => {
    const lastAgentWithQuestions = [...messages]
      .reverse()
      .find((m) => m.sender === 'agent' && m.clarificationQuestions && m.clarificationQuestions.length > 0);

    if (!lastAgentWithQuestions || !pendingFeatureDescription) {
      return;
    }

    const answers: ClarificationAnswers = {};
    for (const q of lastAgentWithQuestions.clarificationQuestions || []) {
      const selected = clarificationSelections[q.id] || [];
      if (!selected.length) continue;
      answers[q.id] = q.multiSelect ? selected : selected[0];
    }

    if (Object.keys(answers).length === 0) {
      return;
    }

    // Add loading message for clarification round
    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: 'Got it, searching with your selections...',
      sender: 'agent',
      loading: true,
    };
    setMessages((prev) => [...prev, loadingMessage]);

    try {
      const response = await enhancedAIAgentService.getRecommendations(
        pendingFeatureDescription,
        preferences,
        undefined,
        answers
      );

      const agentResponse: Message = {
        id: (Date.now() + 2).toString(),
        text: response.text,
        sender: 'agent',
        recommendations: response.recommendations,
        reasoning: response.reasoning,
        toolsUsed: response.tools_used,
        confidence: response.confidence,
        clarificationQuestions: response.clarificationQuestions,
        quickReplies: response.recommendations && response.recommendations.length > 0
          ? [
              'Show more',
              'Explain reasoning',
              'Find alternatives',
              'Start over',
            ]
          : undefined,
      };

      // Clear selections if we got results (or new questions)
      setClarificationSelections({});
      if (!response.clarificationQuestions || response.clarificationQuestions.length === 0) {
        setPendingFeatureDescription(null);
      }

      setMessages((prev) => {
        const withoutLoading = prev.filter((m) => !m.loading);
        return [...withoutLoading, agentResponse];
      });
    } catch (error) {
      setMessages((prev) => {
        const withoutLoading = prev.filter((m) => !m.loading);
        const errorMessage: Message = {
          id: (Date.now() + 2).toString(),
          text: "Sorry, I couldn't complete the search with those details. Please try again.",
          sender: 'agent',
          error: 'api_error',
        };
        return [...withoutLoading, errorMessage];
      });
    }
  };

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    // Check credits
    if (!creditService.hasCredits()) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: "You've run out of credits! Please upgrade to continue using the AI agent.",
        sender: 'agent',
        error: 'no_credits',
      };
      setMessages((prev) => [...prev, errorMessage]);
      return;
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');

    // Add loading message
    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: 'Searching for the perfect repos...',
      sender: 'agent',
      loading: true,
    };
    setMessages((prev) => [...prev, loadingMessage]);

    try {
      // Use credits
      creditService.useCredits(1);
      setCredits(creditService.getBalance());

      // Use enhanced AI agent if available
      let agentResponse: Message;
      
      if (enhancedAIAgentService.isConfigured()) {
        const response = await enhancedAIAgentService.getRecommendations(text, preferences);
        agentResponse = {
          id: (Date.now() + 2).toString(),
          text: response.text,
          sender: 'agent',
          recommendations: response.recommendations,
          reasoning: response.reasoning,
          toolsUsed: response.tools_used,
          confidence: response.confidence,
          clarificationQuestions: response.clarificationQuestions,
          quickReplies: [
            'Show more',
            'Explain reasoning',
            'Find alternatives',
            'Start over',
          ],
        };

        // If the agent is asking clarification questions, remember this as a feature-building session
        if (response.clarificationQuestions && response.clarificationQuestions.length > 0) {
          setPendingFeatureDescription(text);
          setClarificationSelections({});
        } else {
          setPendingFeatureDescription(null);
          setClarificationSelections({});
        }
      } else {
        // Fallback to basic AI service
        const recommendations = await aiService.getRecommendations(text, preferences);
        agentResponse = {
          id: (Date.now() + 2).toString(),
          text: recommendations.length > 0
            ? "Here are my top recommendations based on your needs:"
            : "I couldn't find specific matches, but here are some popular repos you might like:",
          sender: 'agent',
          recommendations,
          quickReplies: [
            'Show more',
            'Different tech stack',
            'Start over',
          ],
        };
      }

      // Remove loading message and add response
      setMessages((prev) => {
        const withoutLoading = prev.filter(m => !m.loading);
        return [...withoutLoading, agentResponse];
      });
    } catch (error) {
      // Remove loading message and add error
      setMessages((prev) => {
        const withoutLoading = prev.filter(m => !m.loading);
        const errorMessage: Message = {
          id: (Date.now() + 2).toString(),
          text: "Sorry, I encountered an error. Please try again or check your API configuration.",
          sender: 'agent',
          error: 'api_error',
        };
        return [...withoutLoading, errorMessage];
      });
    }
  };

  const handleQuickReply = (reply: string) => {
    if (reply === 'Explain reasoning') {
      // Show reasoning from last agent message
      const lastAgentMessage = [...messages].reverse().find(m => m.sender === 'agent' && m.reasoning);
      if (lastAgentMessage) {
        const reasoningMessage: Message = {
          id: Date.now().toString(),
          text: `My reasoning process:\n\n${lastAgentMessage.reasoning}\n\nTools used: ${lastAgentMessage.toolsUsed?.join(', ') || 'N/A'}\nConfidence: ${((lastAgentMessage.confidence || 0) * 100).toFixed(0)}%`,
          sender: 'agent',
        };
        setMessages((prev) => [...prev, reasoningMessage]);
        return;
      }
    }
    handleSend(reply);
  };

  return (
    <div 
      className="h-full bg-black flex flex-col pb-24 md:pb-0"
    >
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-gray-700">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <h1 className="text-xl md:text-2xl text-white" style={{ fontWeight: 700 }}>Agent</h1>
          <div className="flex items-center gap-2 text-xs md:text-sm text-gray-300">
            <span>Credits:</span>
            <span className="font-bold">{credits.total}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-3 md:space-y-4 max-w-4xl mx-auto w-full">
        {messages.map((message) => (
          <div key={message.id}>
            {message.loading ? (
              <div className="flex justify-start">
                <div className="rounded-[20px] px-4 py-3 flex items-center gap-2"
                  style={{ backgroundColor: '#1C1C1E', color: '#F5F5F7' }}>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <p>{message.text}</p>
                </div>
              </div>
            ) : message.error ? (
              <div className="flex justify-start">
                <div className="rounded-[20px] px-4 py-3 flex items-center gap-2"
                  style={{ backgroundColor: '#1C1C1E', color: '#F5F5F7', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <AlertCircle className="w-4 h-4" />
                  <p>{message.text}</p>
                </div>
              </div>
            ) : (
              <div
                className={`flex ${
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[85%] md:max-w-[80%] rounded-[16px] md:rounded-[20px] px-3 md:px-4 py-2 md:py-3 ${
                    message.sender === 'user'
                      ? 'bg-white text-gray-900'
                      : 'bg-gray-700 text-gray-200'
                  }`}
                >
                  <p className="text-sm md:text-base leading-relaxed">{message.text}</p>
                </div>
              </div>
            )}

            {/* Recommendations */}
            {message.recommendations && (
              <div className="mt-4 space-y-3">
                {message.recommendations.map((rec, index) => (
                  <SignatureCard
                    key={index}
                    className="p-4"
                    showLayers={false}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-white text-gray-900 font-bold flex items-center justify-center text-xs shadow-md">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg text-white font-mono" style={{ fontWeight: 700 }}>{rec.name}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          {rec.stars && (
                            <p className="text-gray-400 text-xs">
                              ⭐ {rec.stars.toLocaleString()} stars
                            </p>
                          )}
                          {rec.fitScore !== undefined && (
                            <p className="text-gray-300 text-xs font-semibold">
                              Fit: {rec.fitScore}%
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm mb-3">{rec.description}</p>
                    <div className="bg-gray-900 border border-gray-700 rounded-[16px] p-3">
                      <p className="text-gray-200 text-sm">
                        <span className="font-bold">Why this fits:</span> {rec.reason}
                      </p>
                    </div>
                    {rec.url && (
                      <a
                        href={rec.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-block text-gray-100 hover:text-white text-sm font-medium"
                      >
                        View on GitHub →
                      </a>
                    )}
                  </SignatureCard>
                ))}
              </div>
            )}

            {/* Clarification questions (slot filling) */}
            {message.clarificationQuestions && message.clarificationQuestions.length > 0 && (
              <div className="mt-4 space-y-4">
                {message.clarificationQuestions.map((q) => {
                  const selected = clarificationSelections[q.id] || [];
                  return (
                    <div key={q.id} className="bg-gray-800/60 border border-gray-700 rounded-[16px] p-3">
                      <p className="text-sm text-gray-100 mb-2">{q.question}</p>
                      <div className="flex flex-wrap gap-2">
                        {q.options.map((opt) => {
                          const isSelected = selected.includes(opt.id);
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => toggleClarificationSelection(q.id, opt.id, q.multiSelect)}
                              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                                isSelected
                                  ? 'bg-white border-white text-gray-900'
                                  : 'bg-gray-900 border-gray-600 text-gray-200 hover:bg-gray-700'
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={handleSubmitClarifications}
                  className="px-4 py-2 bg-white hover:bg-gray-200 text-gray-900 rounded-full text-sm font-medium transition-colors"
                >
                  Continue with these choices
                </button>
              </div>
            )}

            {/* Reasoning and Tools Used (if available) */}
            {(message.toolsUsed || message.confidence !== undefined) && (
              <div className="mt-3 text-xs text-gray-400 space-y-1">
                {message.toolsUsed && message.toolsUsed.length > 0 && (
                  <p>🔧 Tools used: {message.toolsUsed.join(', ')}</p>
                )}
                {message.confidence !== undefined && (
                  <p>📊 Confidence: {((message.confidence * 100).toFixed(0))}%</p>
                )}
              </div>
            )}

            {/* Quick replies */}
            {message.quickReplies && (
              <div className="flex flex-wrap gap-2 mt-3">
                {message.quickReplies.map((reply) => (
                  <button
                    key={reply}
                    onClick={() => handleQuickReply(reply)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-full text-sm font-medium transition-colors"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Disabled while in development */}
      <div className="p-3 md:p-6 border-t border-gray-700 pb-safe">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend(inputValue)}
            placeholder="Ask me anything..."
            className="flex-1 px-3 md:px-4 py-2 md:py-3 bg-gray-800/50 text-white placeholder-gray-500 rounded-full border border-gray-700 focus:outline-none focus:border-white focus:ring-2 focus:ring-white/20 text-sm md:text-base"
          />
          <button
            onClick={() => handleSend(inputValue)}
            disabled={!inputValue.trim()}
            className="w-10 h-10 md:w-12 md:h-12 bg-white text-gray-900 rounded-full flex items-center justify-center hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
        <p className="text-center text-gray-500 text-[10px] md:text-xs mt-1.5 md:mt-2 max-w-4xl mx-auto px-2">
          {enhancedAIAgentService.isConfigured() 
            ? "Enhanced AI agent ready - Ask me anything!" 
            : "Configure OpenAI API key in .env to enable enhanced AI agent"}
        </p>
      </div>
    </div>
  );
}