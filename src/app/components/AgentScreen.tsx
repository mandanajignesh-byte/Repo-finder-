import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, AlertCircle } from 'lucide-react';
import { SignatureCard } from './SignatureCard';
import { useTypedPlaceholder } from './TypedPlaceholder';
import { aiService } from '@/services/ai.service';
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
}

const initialMessages: Message[] = [
  {
    id: '1',
    text: "Hi! I'm your repo discovery agent. I'll help you find the perfect GitHub repositories for your needs.",
    sender: 'agent',
  },
  {
    id: '2',
    text: "What are you building? Tell me about your project and tech stack!",
    sender: 'agent',
    quickReplies: [
      'Web app with React',
      'Mobile app with Flutter',
      'CLI tool with Python',
      'AI project',
    ],
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

      // Get AI recommendations
      const recommendations = await aiService.getRecommendations(text, preferences);

      // Remove loading message and add response
      setMessages((prev) => {
        const withoutLoading = prev.filter(m => !m.loading);
        const agentResponse: Message = {
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
                        {rec.stars && (
                          <p className="text-gray-400 text-xs mt-1">
                            ⭐ {rec.stars.toLocaleString()} stars
                          </p>
                        )}
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

      {/* Input */}
      <div className="p-4 md:p-6 border-t border-gray-700">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend(inputValue)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 bg-gray-800 text-white placeholder-gray-400 rounded-full focus:outline-none focus:ring-2 focus:ring-white border border-gray-700"
          />
          <button
            onClick={() => handleSend(inputValue)}
            className="w-12 h-12 bg-white text-gray-900 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}