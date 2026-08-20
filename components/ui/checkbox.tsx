"use client";

import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { CheckIcon, MinusIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-5 shrink-0 items-center justify-center rounded-md border border-light-300 bg-white transition-all outline-none select-none cursor-pointer data-[checked]:border-brand data-[checked]:bg-brand data-[indeterminate]:border-brand data-[indeterminate]:bg-brand focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 hover:border-brand/70",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-white"
      >
        <CheckIcon className="size-3.5 stroke-[3] in-data-[indeterminate]:hidden" />
        <MinusIcon className="size-3.5 stroke-[3] in-not-data-[indeterminate]:hidden" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
