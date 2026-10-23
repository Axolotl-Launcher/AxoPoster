"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function IconButton({
  label,
  children,
  ...props
}: ComponentProps<typeof Button> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button variant="ghost" size="icon" aria-label={label} {...props}>{children}</Button>} />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
