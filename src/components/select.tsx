"use client";

import type { ComponentProps, ReactNode } from "react";
import {
  Select as SelectRoot, SelectContent, SelectGroup,
  SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function Select<Value extends string | number>({
  className, options, value, onValueChange, disabled, ...props
}: Pick<ComponentProps<"button">, "id" | "aria-label" | "aria-labelledby" | "className" | "disabled"> & {
  value: Value;
  options: readonly { value: Value; label: string; icon?: ReactNode }[];
  onValueChange: (value: Value) => void;
}) {
  const selected = options.find((option) => option.value === value);
  return (
    <SelectRoot items={options} value={value} disabled={disabled} onValueChange={(next) => {
      if (next !== null) onValueChange(next);
    }}>
      <SelectTrigger {...props} className={cn("w-full min-w-0", className)}>
        <SelectValue>
          {selected?.icon}
          <span className="truncate">{selected?.label}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false}>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} label={option.label}>
              {option.icon}
              <span className="min-w-0 break-words">{option.label}</span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </SelectRoot>
  );
}
