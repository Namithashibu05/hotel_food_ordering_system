"use client";

import { useState } from "react";
import { Star, Send, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

interface RatingSectionProps {
  tableNumber: string;
  sessionId: string;
}

export default function RatingSection({ tableNumber, sessionId }: RatingSectionProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!rating) {
      toast.error("Please select a star rating");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          comment,
          tableNumber,
          sessionId,
        }),
      });

      if (res.ok) {
        toast.success("Thank you for your feedback!");
        setSubmitted(true);
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit rating");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to submit rating");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-green-50 rounded-3xl p-8 border border-green-100 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckIcon className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-black text-green-800">Feedback Received!</h3>
        <p className="text-green-600 text-sm mt-2 max-w-xs font-medium">
          Your review helps us serve you better next time. Thank you for your time!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2rem] p-8 border border-gray-200 shadow-sm animate-in fade-in zoom-in duration-300">
      <div className="text-center mb-6">
        <h3 className="text-xl font-black text-gray-900 tracking-tight">Rate Your Experience</h3>
        <p className="text-gray-500 text-sm font-medium mt-1">How was our website and service today?</p>
      </div>

      <div className="flex justify-center gap-3 mb-8">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(star)}
            className="transition-all transform hover:scale-125 active:scale-95 group focus:outline-none"
          >
            <Star
              className={`w-10 h-10 transition-colors ${
                star <= (hoverRating || rating)
                  ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]"
                  : "text-gray-200 group-hover:text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <div className="relative">
          <textarea
            placeholder="Tell us what you liked or what we can improve..."
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-5 text-sm focus:ring-4 focus:ring-primary/5 focus:border-primary focus:outline-none transition-all min-h-[120px] resize-none font-medium"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !rating}
          className="w-full bg-primary text-primary-foreground font-black py-4 rounded-2xl flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-xl shadow-primary/20 text-lg"
        >
          {isSubmitting ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>
              <Send className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              <span>Submit Feedback</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor" 
      strokeWidth={3}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
