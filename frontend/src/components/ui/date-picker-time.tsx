"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { format } from "date-fns"
import { ChevronDownIcon } from "lucide-react"

interface DatePickerTimeProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  onTimeChange?: (time: string) => void
  defaultTime?: string
}

export function DatePickerTime({ 
  date: controlledDate, 
  onDateChange,
  onTimeChange,
  defaultTime = "00:00:00"
}: DatePickerTimeProps) {
  const [open, setOpen] = React.useState(false)
  const [date, setDate] = React.useState<Date | undefined>(controlledDate)
  const [time, setTime] = React.useState(defaultTime)

  const handleDateSelect = (newDate: Date | undefined) => {
    setDate(newDate)
    onDateChange?.(newDate)
    setOpen(false)
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value
    setTime(newTime)
    onTimeChange?.(newTime)
  }

  return (
    <FieldGroup className="grid grid-cols-2 gap-3">
      <Field>
        <FieldLabel htmlFor="date-picker-optional">Date</FieldLabel>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              id="date-picker-optional"
              className="w-full justify-between font-normal"
            >
              {date ? format(date, "PPP") : "Select date"}
              <ChevronDownIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              captionLayout="dropdown"
              defaultMonth={date}
              onSelect={handleDateSelect}
            />
          </PopoverContent>
        </Popover>
      </Field>
      <Field>
        <FieldLabel htmlFor="time-picker-optional">Time</FieldLabel>
        <Input
          type="time"
          id="time-picker-optional"
          step="1"
          value={time}
          onChange={handleTimeChange}
          className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />
      </Field>
    </FieldGroup>
  )
}
