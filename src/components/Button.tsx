import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import React from "react";

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "secondary" | "danger" | "outline" | "ghost";
  size?: "sm" | "md" | "lg" | "xl";
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", fullWidth, children, ...props }, ref) => {
    
    const variants = {
      primary: "bg-[#58CC02] hover:bg-[#46A302] text-white border-b-4 border-[#46A302] active:border-b-0 active:translate-y-1",
      secondary: "bg-[#1CB0F6] hover:bg-[#1899D6] text-white border-b-4 border-[#1899D6] active:border-b-0 active:translate-y-1",
      danger: "bg-[#FF4B4B] hover:bg-[#D43F3F] text-white border-b-4 border-[#D43F3F] active:border-b-0 active:translate-y-1",
      outline: "bg-transparent border-2 border-[#E5E5E5] text-[#AFAFAF] hover:bg-[#E5E5E5] hover:text-[#777] active:translate-y-1",
      ghost: "bg-transparent text-[#1CB0F6] hover:bg-blue-50/50 font-bold uppercase tracking-widest",
    };

    const sizes = {
      sm: "py-2 px-4 text-sm",
      md: "py-3 px-6 text-base",
      lg: "py-4 px-8 text-lg",
      xl: "py-5 px-10 text-xl font-black tracking-wide",
    };

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "rounded-2xl font-bold uppercase transition-all select-none disabled:opacity-50 disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          fullWidth ? "w-full" : "",
          className
        )}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);
Button.displayName = "Button";
