import { forwardRef } from "react";
import { clsx } from "clsx";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "trading" | "danger";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={clsx(
          "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-gray-800 text-white hover:bg-gray-700 border border-gray-700": variant === "default",
            "border border-gray-700 bg-transparent text-gray-300 hover:bg-gray-800 hover:text-white": variant === "outline",
            "bg-transparent text-gray-300 hover:bg-gray-800 hover:text-white": variant === "ghost",
            "bg-green-600 text-white hover:bg-green-700 border border-green-600": variant === "trading",
            "bg-red-600 text-white hover:bg-red-700 border border-red-600": variant === "danger",
          },
          {
            "h-9 px-4 py-2": size === "default",
            "h-8 px-3 text-xs": size === "sm",
            "h-10 px-8": size === "lg",
            "h-9 w-9": size === "icon",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
