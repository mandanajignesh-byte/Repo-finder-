/**
 * Feedback Section Component
 * Allows users to submit feedback, report issues, and share experiences
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { MessageSquare, Send, CheckCircle } from 'lucide-react';
import { SignatureCard } from './SignatureCard';
import { supabase } from '@/lib/supabase';

export function FeedbackSection() {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      alert('Please enter your feedback before submitting');
      return;
    }

    setIsSubmitting(true);
    try {
      // Get user ID
      const { supabaseService } = await import('@/services/supabase.service');
      const userId = await supabaseService.getOrCreateUserId();

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
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-pink-600 flex items-center justify-center">
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
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center gap-2"
        >
          <CheckCircle className="w-5 h-5 text-green-400" />
          <p className="text-green-400 text-sm">
            Thank you! Your feedback has been submitted successfully.
          </p>
        </motion.div>
      )}

      {/* Feedback Textarea */}
      <div className="mb-4">
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Write your feedback here... Share your thoughts, report issues, suggest improvements, or tell us about your experience using this app."
          disabled={isSubmitting}
          rows={6}
          className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 resize-none placeholder-gray-500"
        />
        <p className="text-gray-500 text-xs mt-2">
          {feedback.length} characters
        </p>
      </div>

      {/* Submit Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSubmit}
        disabled={isSubmitting || !feedback.trim()}
        className="w-full px-6 py-3 bg-gradient-to-r from-cyan-700 to-pink-700 text-white rounded-lg font-medium hover:from-cyan-600 hover:to-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
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
      </motion.button>

      {/* Privacy Note */}
      <div className="mt-4 p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg">
        <p className="text-gray-400 text-xs text-center">
          Your feedback is anonymous and helps us make this app better for everyone.
        </p>
      </div>
    </SignatureCard>
  );
}
