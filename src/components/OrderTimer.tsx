"use client";

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface OrderTimerProps {
  createdAt: string;
  estimatedPrepTime: number; // in minutes
  status: string;
}

export default function OrderTimer({ createdAt, estimatedPrepTime, status }: OrderTimerProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [percentDone, setPercentDone] = useState(0);

  useEffect(() => {
    if (status === 'Delivered' || status === 'Cancelled' || status === 'Ready') {
      setTimeLeft(0);
      setPercentDone(100);
      return;
    }

    const calculateTime = () => {
      const start = new Date(createdAt).getTime();
      const now = new Date().getTime();
      
      // Parse estimatedPrepTime and ensure it's a number
      const prepTime = typeof estimatedPrepTime === 'number' ? estimatedPrepTime : parseInt(estimatedPrepTime as any) || 15;
      
      const prepDurationMs = prepTime * 60 * 1000;
      const end = start + prepDurationMs;
      
      const remainingMs = end - now;
      const elapsedMs = now - start;
      
      const remainingMinutes = Math.max(0, Math.ceil(remainingMs / 60000));
      // Avoid division by zero
      const percentage = prepDurationMs > 0 
        ? Math.min(100, Math.max(0, (elapsedMs / prepDurationMs) * 100))
        : 100;
      
      setTimeLeft(isNaN(remainingMinutes) ? 15 : remainingMinutes);
      setPercentDone(isNaN(percentage) ? 0 : percentage);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, [createdAt, estimatedPrepTime, status]);

  if (status === 'Delivered' || status === 'Cancelled' || status === 'Ready') {
      return null;
  }

  // Visual classes based on percent
  let bgColor = "bg-green-500";
  let textColor = "text-green-600";
  let borderColor = "border-green-200";

  if (percentDone >= 90) {
    bgColor = "bg-red-500";
    textColor = "text-red-600";
    borderColor = "border-red-200";
  } else if (percentDone >= 50) {
    bgColor = "bg-orange-500";
    textColor = "text-orange-600";
    borderColor = "border-orange-200";
  }

  return (
    <div className={`mt-4 p-4 rounded-xl border ${borderColor} bg-white`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Clock className={`w-5 h-5 ${textColor} animate-pulse`} />
          <span className={`text-sm font-bold ${textColor}`}>Estimated Prep Time</span>
        </div>
        <span className={`text-2xl font-black ${textColor}`}>
          {timeLeft} <span className="text-xs uppercase">min left</span>
        </span>
      </div>
      
      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 ${bgColor}`} 
          style={{ width: `${percentDone}%` }}
        />
      </div>
      
      <div className="mt-2 flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
        <span>Order Started</span>
        <span>{percentDone >= 100 ? "Ready Soon" : "In Progress"}</span>
      </div>
    </div>
  );
}
