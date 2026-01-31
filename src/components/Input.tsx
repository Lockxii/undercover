import { cn } from "@/lib/utils";
import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-2xl border-2 bg-gray-100 p-4 text-lg font-bold text-gray-700 outline-none transition-all placeholder:text-gray-400 focus:border-[#1CB0F6] focus:bg-white",
          error ? "border-[#FF4B4B] bg-red-50" : "border-transparent",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
