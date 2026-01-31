'use client';

import { motion } from 'framer-motion';

export default function Mascot({ message, className = "" }: { message: string, className?: string }) {
  return (
    <div className={`flex items-start gap-4 ${className}`}>
      <motion.div 
        animate={{ 
            y: [0, -5, 0],
            rotate: [0, -2, 2, 0]
        }}
        transition={{ 
            repeat: Infinity, 
            duration: 4,
            ease: "easeInOut"
        }}
        className="w-16 h-16 shrink-0 bg-brand-green rounded-2xl flex items-center justify-center text-3xl shadow-lg border-b-4 border-green-700"
      >
        🕵️
      </motion.div>
      <div className="relative bg-white border-2 border-gray-100 p-3 rounded-2xl rounded-tl-none shadow-sm">
        {/* Triangle for bubble */}
        <div className="absolute top-[-2px] left-[-10px] w-0 h-0 border-t-[10px] border-t-transparent border-r-[12px] border-r-white border-b-[10px] border-b-transparent"></div>
        <p className="text-sm font-bold text-gray-600 leading-tight">
          {message}
        </p>
      </div>
    </div>
  );
}
