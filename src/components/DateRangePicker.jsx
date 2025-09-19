
import React, { useState } from "react";
import { format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const presets = [
  { label: "Today", range: { from: new Date(), to: new Date() } },
  { label: "Yesterday", range: { from: subDays(new Date(), 1), to: subDays(new Date(), 1) } },
  { label: "This Week", range: { from: startOfWeek(new Date()), to: endOfWeek(new Date()) } },
  { label: "Last 7 Days", range: { from: subDays(new Date(), 6), to: new Date() } },
  { label: "Last 14 Days", range: { from: subDays(new Date(), 13), to: new Date() } },
  { label: "This Month", range: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) } },
  { label: "Last Month", range: { from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) } },
  { label: "Last 30 Days", range: { from: subDays(new Date(), 29), to: new Date() } },
];

export function DateRangePicker({ className, date, onDateChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const handlePresetClick = (range) => {
    onDateChange(range);
    setIsOpen(false);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full lg:w-[260px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
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
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 flex relative right-52" align="start">
          <div className="flex flex-col space-y-2 border-r p-4">
            {presets.map((preset) => (
              <Button
                key={preset.label}
                onClick={() => handlePresetClick(preset.range)}
                variant="ghost"
                className="justify-start"
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={onDateChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
