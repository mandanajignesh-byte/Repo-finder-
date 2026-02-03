import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, AlertCircle } from 'lucide-react';
import { SignatureCard } from './SignatureCard';
import { useTypedPlaceholder } from './TypedPlaceholder';
import { aiService } from '@/services/ai.service';
import { enhancedAIAgentService } from '@/services/enhanced-ai-agent.service';
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
}

const initialMessages: Message[] = [
  {
    id: '1',
    text: "Hi! I'm your RepoVerse AI agent - your intelligent navigator through the GitHub universe. I use advanced tools, reasoning, and your personal preferences to find the perfect repositories for you. Ask me anything about finding repos!",
    sender: 'agent',
  },
];

export function AgentScreen() {
  const { preferences } = useUserPreferences();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [credits, setCredits] = useState(creditService.getBalance());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Typed placeholder effect
  useTypedPlaceholder({
    strings: [
      'Type a message...',
      'What are you building?',
      'Looking for a React project?',
      'Need a Python library?',
      'Search for repositories...',
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
          quickReplies: [
            'Show more',
            'Explain reasoning',
            'Find alternatives',
            'Start over',
          ],
        };
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
      style={{
        backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(6, 182, 212, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(219, 39, 119, 0.05) 0%, transparent 50%)',
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-gray-700">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <h1 className="text-2xl text-white" style={{ fontWeight: 700 }}>Agent</h1>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <span>Credits:</span>
            <span className="font-bold">{credits.total}</span>
          </div>
        </div>
      </div>

      {/* Enhanced Agent Features Banner */}
      <div className="px-4 md:px-6 pt-4 max-w-4xl mx-auto w-full">
        <div className="bg-gradient-to-r from-cyan-900/30 to-pink-900/30 border-2 border-cyan-700/50 rounded-[20px] p-4 md:p-6 relative overflow-hidden">
          {/* Animated background effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-pink-500/5 animate-pulse" />
          
          <div className="relative z-10">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-pink-500 flex items-center justify-center">
                <span className="text-white text-xl">🤖</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg text-white font-bold mb-2" style={{ fontWeight: 700 }}>
                  Enhanced AI Agent - Powered by Tools & Reasoning
                </h3>
                <p className="text-gray-300 text-sm md:text-base leading-relaxed">
                  Our AI agent uses <span className="text-cyan-400 font-semibold">advanced tool orchestration</span>, 
                  <span className="text-cyan-400 font-semibold"> personalized recommendations</span>, and 
                  <span className="text-cyan-400 font-semibold"> deep reasoning</span> to find the perfect repos. 
                  It understands your tech stack, experience level, and goals to provide better-than-LLM results.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-cyan-900/40 text-cyan-300 text-xs rounded-full">Tool-based</span>
                  <span className="px-2 py-1 bg-pink-900/40 text-pink-300 text-xs rounded-full">Personalized</span>
                  <span className="px-2 py-1 bg-purple-900/40 text-purple-300 text-xs rounded-full">Reasoning</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 max-w-4xl mx-auto w-full">
        {messages.map((message) => (
          <div key={message.id}>
            {message.loading ? (
              <div className="flex justify-start">
                <div className="bg-gray-700 text-gray-200 rounded-[20px] px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <p>{message.text}</p>
                </div>
              </div>
            ) : message.error ? (
              <div className="flex justify-start">
                <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-[20px] px-4 py-3 flex items-center gap-2">
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
                  className={`max-w-[80%] rounded-[20px] px-4 py-3 ${
                    message.sender === 'user'
                      ? 'bg-white text-gray-900'
                      : 'bg-gray-700 text-gray-200'
                  }`}
                >
                  <p>{message.text}</p>
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
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-cyan-700 to-pink-700 text-white font-bold flex items-center justify-center text-xs shadow-md">
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
                            <p className="text-cyan-400 text-xs font-semibold">
                              Fit: {rec.fitScore}%
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm mb-3">{rec.description}</p>
                    <div className="bg-cyan-900/30 border-2 border-cyan-700 rounded-[16px] p-3">
                      <p className="text-cyan-200 text-sm">
                        <span className="font-bold">Why this fits:</span> {rec.reason}
                      </p>
                    </div>
                    {rec.url && (
                      <a
                        href={rec.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-block text-cyan-400 hover:text-cyan-300 text-sm font-medium"
                      >
                        View on GitHub →
                      </a>
                    )}
                  </SignatureCard>
                ))}
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
      <div className="p-4 md:p-6 border-t border-gray-700">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend(inputValue)}
            placeholder="Ask me anything about finding repos..."
            className="flex-1 px-4 py-3 bg-gray-800/50 text-white placeholder-gray-500 rounded-full border border-gray-700 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
          />
          <button
            onClick={() => handleSend(inputValue)}
            disabled={!inputValue.trim()}
            className="w-12 h-12 bg-gradient-to-br from-cyan-600 to-pink-600 text-white rounded-full flex items-center justify-center hover:from-cyan-500 hover:to-pink-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-center text-gray-500 text-xs mt-2 max-w-4xl mx-auto">
          {enhancedAIAgentService.isConfigured() 
            ? "Enhanced AI agent ready - Ask me anything!" 
            : "Configure OpenAI API key in .env to enable enhanced AI agent"}
        </p>
      </div>
    </div>
  );
}