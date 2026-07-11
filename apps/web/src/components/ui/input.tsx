import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "border-input bg-card flex h-10 w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors",
      "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:outline-none focus-visible:ring-2",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "border-input bg-card flex min-h-24 w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors",
      "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:outline-none focus-visible:ring-2",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-foreground text-sm font-medium", className)} {...props} />;
}
