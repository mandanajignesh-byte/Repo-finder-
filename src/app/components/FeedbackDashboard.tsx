/**
 * Feedback Dashboard Component
 * Displays all user feedback submitted to the app
 */

import { useState, useEffect } from 'react';
import { MessageSquare, RefreshCw, Calendar, User } from 'lucide-react';
import { SignatureCard } from './SignatureCard';
import { supabase } from '@/lib/supabase';

interface FeedbackItem {
  id: number;
  user_id: string;
  feedback_text: string;
  created_at: string;
}

export function FeedbackDashboard() {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadFeedbacks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch all feedback from Supabase, ordered by most recent first
      const { data, error: fetchError } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100); // Limit to most recent 100 feedbacks

      if (fetchError) {
        console.error('Error fetching feedback:', fetchError);
        
        // Provide more specific error messages
        let errorMessage = 'Failed to load feedback. ';
        if (fetchError.code === 'PGRST116' || fetchError.message?.includes('relation') || fetchError.message?.includes('does not exist')) {
          errorMessage += 'The feedback table does not exist in Supabase. Please run the SQL setup script.';
        } else if (fetchError.code === '42501' || fetchError.message?.includes('permission') || fetchError.message?.includes('policy')) {
          errorMessage += 'RLS policies do not allow reading feedback. Please update the policies in Supabase.';
        } else {
          errorMessage += `Error: ${fetchError.message || 'Unknown error'}. Please check your Supabase connection.`;
        }
        setError(errorMessage);
        
        // Try to load from localStorage fallback
        const localFeedback = localStorage.getItem('app_feedback');
        if (localFeedback) {
          try {
            const parsed = JSON.parse(localFeedback);
            setFeedbacks(parsed.map((item: any, index: number) => ({
              id: index,
              user_id: 'local',
              feedback_text: item.feedback || item.feedback_text || '',
              created_at: item.timestamp || item.created_at || new Date().toISOString(),
            })));
            setError(null); // Clear error if we have local feedback
          } catch (e) {
            console.error('Error parsing local feedback:', e);
          }
        }
        return;
      }

      if (data) {
        setFeedbacks(data);
        setLastRefresh(new Date());
      } else {
        setFeedbacks([]);
      }
    } catch (err) {
      console.error('Error loading feedback:', err);
      setError('An unexpected error occurred while loading feedback.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return dateString;
    }
  };

  const maskUserId = (userId: string) => {
    if (!userId || userId === 'local') return 'Anonymous';
    // Show first 4 and last 4 characters
    if (userId.length > 8) {
      return `${userId.substring(0, 4)}...${userId.substring(userId.length - 4)}`;
    }
    return userId;
  };

  return (
    <SignatureCard className="p-6" showLayers={false}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl text-white mb-1" style={{ fontWeight: 700 }}>
              Feedback Dashboard
            </h2>
            <p className="text-gray-400 text-xs">
              {feedbacks.length} feedback{feedbacks.length !== 1 ? 's' : ''} received
              {lastRefresh && ` • Last updated ${formatDate(lastRefresh.toISOString())}`}
            </p>
          </div>
        </div>
        <button
          onClick={loadFeedbacks}
          disabled={isLoading}
          className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-900/20 border border-red-700 rounded-lg">
          <p className="text-red-300 text-sm font-medium mb-2">{error}</p>
          <div className="text-red-400 text-xs space-y-1">
            <p><strong>Quick Fix:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Go to your Supabase Dashboard → SQL Editor</li>
              <li>Open the file: <code className="bg-red-900/30 px-1 rounded">supabase-feedback-setup-complete.sql</code></li>
              <li>Copy and paste the entire SQL script</li>
              <li>Click "Run" to execute it</li>
              <li>Refresh this dashboard</li>
            </ol>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && feedbacks.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
            <p className="text-gray-400 text-sm">Loading feedback...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && feedbacks.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-12">
          <MessageSquare className="w-16 h-16 text-gray-600 mb-4" />
          <p className="text-gray-400 text-lg mb-2">No feedback yet</p>
          <p className="text-gray-500 text-sm text-center max-w-md">
            Feedback submitted by users will appear here. Check back later!
          </p>
        </div>
      )}

      {/* Feedback List */}
      {feedbacks.length > 0 && (
        <div className="space-y-4 max-h-[600px] overflow-y-auto">
          {feedbacks.map((feedback) => (
            <div
              key={feedback.id}
              className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-2 text-gray-400 text-xs">
                  <User className="w-3 h-3" />
                  <span>{maskUserId(feedback.user_id)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500 text-xs">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(feedback.created_at)}</span>
                </div>
              </div>
              <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
                {feedback.feedback_text}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Info Note */}
      <div className="mt-6 p-3 bg-gray-800/30 border border-gray-700/50 rounded-lg">
        <p className="text-gray-400 text-xs">
          <strong className="text-gray-300">Note:</strong> To view all feedback, make sure your Supabase RLS policies allow reading from the feedback table. 
          You may need to update the policy in Supabase SQL Editor to allow viewing all feedback entries.
        </p>
      </div>
    </SignatureCard>
  );
}
