"use client";

import { useState } from "react";
import { Star, Send, X, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableNumber: string;
  sessionId: string;
}

export default function RatingModal({ isOpen, onClose, tableNumber, sessionId }: RatingModalProps) {
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
        setSubmitted(true);
        setTimeout(() => {
          onClose();
          // Reset after closing
          setTimeout(() => {
            setSubmitted(false);
            setRating(0);
            setComment("");
          }, 500);
        }, 2000);
      } else {
        throw new Error("Failed to submit rating");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to submit rating");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-card w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all font-black z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 pt-10">
          {!submitted ? (
            <div className="text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Star className="w-10 h-10 text-primary fill-primary" />
              </div>
              <h2 className="text-3xl font-black text-foreground tracking-tighter mb-2">Rate Your Experience</h2>
              <p className="text-muted-foreground mb-8 font-medium">We value your feedback on our website and service!</p>

              <div className="bg-muted/30 rounded-3xl p-6 mb-8 border border-border animate-in fade-in zoom-in duration-300">
                <div className="flex justify-center gap-2 mb-6">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="transition-all transform hover:scale-125 active:scale-95"
                    >
                      <Star
                        className={`w-10 h-10 ${
                          star <= (hoverRating || rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-slate-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <textarea
                  placeholder="What's on your mind? We'd love to hear your thoughts..."
                  className="w-full bg-background border border-border rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary focus:outline-none mb-4 min-h-[120px] resize-none shadow-inner"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !rating}
                  className="w-full bg-primary text-primary-foreground font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Submit Review</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-12 h-12 text-green-600 animate-pulse" />
              </div>
              <h2 className="text-3xl font-black text-foreground tracking-tighter mb-2">Thank You!</h2>
              <p className="text-green-600 font-bold mb-2">Feedback Received Successfully</p>
              <p className="text-muted-foreground text-sm max-w-[200px] mx-auto">Your review helps us provide the best experience for everyone.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
