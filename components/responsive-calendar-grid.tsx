"use client"

import type { Event } from "./calendar-app"
import { cn } from "@/lib/utils"
import { EventsPopover } from "./events-popover"
import { useState, useEffect } from "react"

interface ResponsiveCalendarGridProps {
  currentDate: Date
  events: Event[]
  onCreateEvent: (date: Date) => void
  onEditEvent: (event: Event) => void
}

export function ResponsiveCalendarGrid({
  currentDate,
  events,
  onCreateEvent,
  onEditEvent,
}: ResponsiveCalendarGridProps) {
  const [maxEvents, setMaxEvents] = useState(1)
  const [isMobile, setIsMobile] = useState(false)
  const today = new Date()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  const firstDayOfWeek = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const mobileDays = ["S", "M", "T", "W", "T", "F", "S"]
  const calendarDays = []

  // Update max events and mobile state based on screen size
  useEffect(() => {
    const updateLayout = () => {
      if (typeof window !== "undefined") {
        const width = window.innerWidth
        const height = window.innerHeight
        const isMobileDevice = width < 640
        const isLandscape = width > height

        setIsMobile(isMobileDevice)

        if (isMobileDevice) {
          // Mobile: adjust based on orientation
          if (isLandscape) {
            setMaxEvents(2) // More space in landscape
          } else {
            setMaxEvents(1) // Compact in portrait
          }
        } else if (width < 1024) {
          setMaxEvents(2) // Tablet
        } else {
          setMaxEvents(3) // Desktop
        }
      }
    }

    updateLayout()
    window.addEventListener("resize", updateLayout)
    window.addEventListener("orientationchange", updateLayout)

    return () => {
      window.removeEventListener("resize", updateLayout)
      window.removeEventListener("orientationchange", updateLayout)
    }
  }, [])

  // Helper function to create a date without timezone issues
  const createLocalDate = (year: number, month: number, day: number) => {
    const date = new Date(year, month, day, 12, 0, 0, 0)
    return date
  }

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfWeek; i++) {
    const prevMonth = currentDate.getMonth() - 1
    const prevYear = prevMonth < 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear()
    const adjustedPrevMonth = prevMonth < 0 ? 11 : prevMonth
    const daysInPrevMonth = new Date(prevYear, adjustedPrevMonth + 1, 0).getDate()
    const day = daysInPrevMonth - (firstDayOfWeek - i - 1)

    const prevMonthDay = createLocalDate(prevYear, adjustedPrevMonth, day)
    calendarDays.push({ date: prevMonthDay, isCurrentMonth: false })
  }

  // Add days of the current month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = createLocalDate(currentDate.getFullYear(), currentDate.getMonth(), day)
    calendarDays.push({ date, isCurrentMonth: true })
  }

  // Add days from next month to fill the grid
  const remainingCells = 42 - calendarDays.length
  for (let day = 1; day <= remainingCells; day++) {
    const nextMonth = currentDate.getMonth() + 1
    const nextYear = nextMonth > 11 ? currentDate.getFullYear() + 1 : currentDate.getFullYear()
    const adjustedNextMonth = nextMonth > 11 ? 0 : nextMonth

    const nextMonthDay = createLocalDate(nextYear, adjustedNextMonth, day)
    calendarDays.push({ date: nextMonthDay, isCurrentMonth: false })
  }

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventDateStr = event.date.toDateString()
      const targetDateStr = date.toDateString()
      return eventDateStr === targetDateStr
    })
  }

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString()
  }

  const handleDateClick = (calendarDay: { date: Date; isCurrentMonth: boolean }) => {
    const clickedDate = createLocalDate(
      calendarDay.date.getFullYear(),
      calendarDay.date.getMonth(),
      calendarDay.date.getDate(),
    )
    onCreateEvent(clickedDate)
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden animate-in fade-in-0 duration-700 dark:md3-elevation-2">
      {/* Days of week header */}
      <div className="grid grid-cols-7 bg-muted/50 border-b border-border">
        {days.map((day, index) => (
          <div
            key={day}
            className={cn(
              "text-center font-medium text-muted-foreground border-r border-border last:border-r-0",
              isMobile ? "p-2 text-xs" : "p-3 text-sm",
            )}
          >
            <span className="hidden xs:inline">{day}</span>
            <span className="xs:hidden">{mobileDays[index]}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((calendarDay, index) => {
          const dayEvents = getEventsForDate(calendarDay.date)
          const visibleEvents = dayEvents.slice(0, maxEvents)
          const remainingCount = dayEvents.length - visibleEvents.length

          return (
            <div
              key={`${calendarDay.date.getFullYear()}-${calendarDay.date.getMonth()}-${calendarDay.date.getDate()}`}
              className={cn(
                "border-r border-b border-border last:border-r-0 cursor-pointer transition-all duration-200 hover:bg-muted/30 group active:scale-[0.98]",
                // Responsive height and padding
                isMobile ? "min-h-[60px] p-1" : "min-h-[80px] sm:min-h-[100px] md:min-h-[120px] p-2",
                // Month styling
                !calendarDay.isCurrentMonth && "bg-muted/20 text-muted-foreground",
                // Today styling
                isToday(calendarDay.date) && "bg-primary/10 border-primary/20 ring-1 ring-primary/20",
              )}
              onClick={() => handleDateClick(calendarDay)}
            >
              {/* Date number */}
              <div
                className={cn(
                  "font-medium mb-1 transition-colors duration-200 flex items-center justify-center",
                  isMobile ? "text-xs h-5 w-5 mx-auto" : "text-sm h-6 w-6",
                  isToday(calendarDay.date) && "text-primary font-bold bg-primary/10 rounded-full",
                )}
              >
                {calendarDay.date.getDate()}
              </div>

              {/* Events container */}
              <div className={cn("space-y-0.5 overflow-hidden", isMobile ? "space-y-[1px]" : "space-y-0.5")}>
                {visibleEvents.map((event) => (
                  <div
                    key={event.id}
                    className={cn(
                      "rounded cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-sm truncate animate-in slide-in-from-left-2 duration-300",
                      isMobile ? "text-[8px] p-0.5 leading-tight" : "text-[9px] sm:text-[10px] md:text-xs p-0.5 sm:p-1",
                    )}
                    style={{
                      backgroundColor: event.color + "20",
                      color: event.color,
                      borderLeft: `2px solid ${event.color}`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditEvent(event)
                    }}
                    title={`${event.title} - ${event.startTime}`}
                  >
                    <div className="font-medium truncate">{event.title}</div>
                    {!isMobile && (
                      <div className="opacity-75 hidden sm:block text-[8px] md:text-[10px] truncate">
                        {event.startTime}
                      </div>
                    )}
                  </div>
                ))}

                {/* More events indicator */}
                {remainingCount > 0 && (
                  <div onClick={(e) => e.stopPropagation()} className="mt-1">
                    <EventsPopover
                      events={dayEvents}
                      onEditEvent={onEditEvent}
                      remainingCount={remainingCount}
                      isMobile={isMobile}
                    />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
