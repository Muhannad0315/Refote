import * as React from "react";

import { cn } from "@/lib/utils";
import { localizedClassForText } from "@/components/LocalizedText";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    // h-9 to match icon buttons and default buttons.
    // Apply localized font class based on value (when controlled) or placeholder.
    const value = (props as any).value as string | undefined;
    const placeholder = (props as any).placeholder as string | undefined;
    const localized = localizedClassForText(value ?? placeholder ?? "");

    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          localized,
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
