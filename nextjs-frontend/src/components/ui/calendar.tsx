"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center",
        caption_label:
          "text-xs font-mono uppercase tracking-widest text-text-main",
        nav: "space-x-1 flex items-center",
        button_previous: cn(
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 transition-opacity border border-border/40 rounded-sm flex items-center justify-center text-text-muted hover:text-gold hover:border-gold/40 absolute left-1 z-10"
        ),
        button_next: cn(
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 transition-opacity border border-border/40 rounded-sm flex items-center justify-center text-text-muted hover:text-gold hover:border-gold/40 absolute right-1 z-10"
        ),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday:
          "text-text-muted rounded-md w-9 font-mono uppercase text-2xs tracking-tighter",
        week: "flex w-full mt-2",
        day: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
        day_button: cn(
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-gold/10 hover:text-gold rounded transition-colors font-mono text-xs flex items-center justify-center relative"
        ),
        range_start:
          "bg-transparent [&_button]:bg-gold [&_button]:!text-dark [&_button]:font-bold [&_button]:rounded bg-gold/20",
        range_end:
          "bg-transparent [&_button]:bg-gold [&_button]:!text-dark [&_button]:font-bold [&_button]:rounded bg-gold/20",
        range_middle:
          "aria-selected:bg-gold/20 aria-selected:text-gold rounded-none",
        selected:
          "bg-gold text-dark hover:bg-gold/10 hover:text-dark focus:bg-gold focus:text-dark font-bold rounded", // Remove all default background for selected state to use range specific styling
        today:
          "text-gold font-bold after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-gold after:rounded-full [&_button]:text-gold",
        outside: "outside text-text-muted/30 opacity-0",
        disabled: "text-text-muted/30 opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          if (orientation === "left")
            return <ChevronLeft className="h-4 w-4" />;
          if (orientation === "right")
            return <ChevronRight className="h-4 w-4" />;
          return <></>;
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
