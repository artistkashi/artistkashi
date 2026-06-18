"use client";

import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerWithRangeProps {
  className?: string;
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
  label?: string;
}

export function DatePickerWithRange({
  className,
  date,
  setDate,
  label = "Start Date - End Date",
}: DatePickerWithRangeProps) {
  return (
    <Field className={cn("w-full", className)}>
      <FieldLabel htmlFor="date-picker-range">{label}</FieldLabel>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            id="date-picker-range"
            className={cn(
              "w-full justify-start text-left font-mono text-2xs uppercase tracking-widest bg-dark/40 border-border/60 h-10",
              !date && "text-text-muted"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-gold" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 border-border bg-surface shadow-2xl"
          align="start"
        >
          <Calendar
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
          />
          {date && (
            <div className="p-3 border-t border-border/40 flex justify-end bg-dark/20">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDate(undefined)}
                className="text-2xs h-7 px-2"
              >
                <X className="mr-1 h-3 w-3" /> Clear Range
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </Field>
  );
}
