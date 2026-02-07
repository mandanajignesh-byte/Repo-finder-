/**
 * Feedback Section Component
 * Allows users to submit feedback, report issues, and share experiences
 * Only users who have completed onboarding can submit feedback
 */

import { useState, useEffect } from 'react';
import { MessageSquare, Send, CheckCircle, Lock } from 'lucide-react';
import { SignatureCard } from './SignatureCard';
import { supabase } from '@/lib/supabase';
import { useUserPreferences } from '@/hooks/useUserPreferences';

export function FeedbackSection() {
  const { preferences, loaded } = useUserPreferences;
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);

  // Check if user has completed onboarding
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!loaded) {
        setIsCheckingOnboarding(true);
        return;
      }

      try {
        // Check if onboarding is completed in preferences
        if (preferences.onboardingCompleted) {
          setHasCompletedOnboarding(true);
          setIsCheckingOnboarding(false);
          return;
        }

        // Also check in Supabase to be sure
        const { supabaseService } = await import('@/services/supabase.service');
        const userId = await supabaseService.getOrCreateUserId();
        const userPrefs = await supabaseService.getUserPreferences(userId);
        
        setHasCompletedOnboarding(userPrefs?.onboardingCompleted === true);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // Default to false if we can't check
        setHasCompletedOnboarding(false);
      } finally {
        setIsCheckingOnboarding(false);
      }
    };

    checkOnboardingStatus();
  }, [preferences.onboardingCompleted, loaded]);

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      alert('Please enter your feedback before submitting');
      return;
    }

    if (!hasCompletedOnboarding) {
      alert('Please complete the onboarding process before submitting feedback.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Get user ID
      const { supabaseService } = await import('@/services/supabase.service');
      const userId = await supabaseService.getOrCreateUserId();

      // Verify onboarding completion one more time before submitting
      const userPrefs = await supabaseService.getUserPreferences(userId);
      if (!userPrefs?.onboardingCompleted) {
        alert('Please complete the onboarding process before submitting feedback.');
        setIsSubmitting(false);
        return;
      }

      // Save feedback to Supabase
      const { error } = await supabase
        .from('feedback')
        .insert([
          {
            user_id: userId,
            feedback_text: feedback.trim(),
            created_at: new Date().toISOString(),
          },
        ]);

      if (error) {
        console.error('Error saving feedback:', error);
        // Fallback to localStorage if Supabase fails
        const existingFeedback = JSON.parse(localStorage.getItem('app_feedback') || '[]');
        existingFeedback.push({
          feedback: feedback.trim(),
          timestamp: new Date().toISOString(),
        });
        localStorage.setItem('app_feedback', JSON.stringify(existingFeedback));
      }

      // Show success message
      setIsSubmitted(true);
      setFeedback('');
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setIsSubmitted(false);
      }, 3000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SignatureCard className="p-6" showLayers={false}>
      <div className="flex items-start gap-4 mb-6">
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
          <MessageSquare className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl text-white mb-2" style={{ fontWeight: 700 }}>
            Share Your Feedback
          </h2>
          <p className="text-gray-300 text-sm leading-relaxed mb-3">
            Your feedback helps us improve! We'd love to hear from you.
          </p>
          <div className="space-y-2 text-gray-400 text-xs">
            <p>• Point out any mistakes or bugs you've encountered</p>
            <p>• Suggest improvements or new features</p>
            <p>• Share your experiences - good or bad</p>
            <p>• Tell us what you love or what could be better</p>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {isSubmitted && (
        <div className="mb-4 p-4 bg-gray-800 border border-gray-600 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-gray-200" />
          <p className="text-gray-200 text-sm">
            Thank you! Your feedback has been submitted successfully.
          </p>
        </div>
      )}

      {/* Feedback Textarea */}
      <div className="mb-4">
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Write your feedback here... Share your thoughts, report issues, suggest improvements, or tell us about your experience using this app."
          disabled={isSubmitting || !hasCompletedOnboarding || isCheckingOnboarding}
          rows={6}
          className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-50 resize-none placeholder-gray-500"
        />
        <p className="text-gray-500 text-xs mt-2">
          {feedback.length} characters
        </p>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || !feedback.trim() || !hasCompletedOnboarding || isCheckingOnboarding}
        className="w-full px-6 py-3 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Submit Feedback
          </>
        )}
      </button>

      {/* Onboarding Required Message */}
      {!isCheckingOnboarding && !hasCompletedOnboarding && (
        <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-300 text-sm font-medium mb-1">
                Onboarding Required
              </p>
              <p className="text-yellow-400 text-xs">
                Please complete the onboarding process to submit feedback. This helps us understand your preferences and provide better recommendations.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Note */}
      <div className="mt-4 p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg">
        <p className="text-gray-400 text-xs text-center">
          Your feedback is anonymous and helps us make this app better for everyone.
        </p>
      </div>
    </SignatureCard>
  );
}
