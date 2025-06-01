"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Calendar, List, Plus, Clock, MapPin } from "lucide-react"
import { format, addDays, startOfWeek, isSameDay, isToday } from "date-fns"
import type { Event } from "./calendar-app"

interface MobileCalendarViewProps {
  currentDate: Date
  events: Event[]
  onCreateEvent: (date: Date) => void
  onEditEvent: (event: Event) => void
  onDateChange: (date: Date) => void
}

type ViewMode = "week" | "list" | "day"

export function MobileCalendarView({
  currentDate,
  events,
  onCreateEvent,
  onEditEvent,
  onDateChange,
}: MobileCalendarViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("week")
  const [selectedDate, setSelectedDate] = useState(currentDate)

  // Получаем неделю начиная с понедельника
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Получаем события для конкретного дня
  const getEventsForDate = (date: Date) => {
    return events.filter((event) => isSameDay(event.date, date))
  }

  // Получаем ближайшие события для списка
  const getUpcomingEvents = () => {
    const today = new Date()
    return events
      .filter((event) => event.date >= today)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 10)
  }

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = addDays(selectedDate, direction === "prev" ? -7 : 7)
    setSelectedDate(newDate)
    onDateChange(newDate)
  }

  const navigateDay = (direction: "prev" | "next") => {
    const newDate = addDays(selectedDate, direction === "prev" ? -1 : 1)
    setSelectedDate(newDate)
    onDateChange(newDate)
  }

  // Недельный вид
  const WeekView = () => (
    <div className="space-y-4">
      {/* Навигация по неделям */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => navigateWeek("prev")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-semibold">
          {format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d, yyyy")}
        </h3>
        <Button variant="ghost" size="icon" onClick={() => navigateWeek("next")}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Дни недели */}
      <div className="space-y-3">
        {weekDays.map((day) => {
          const dayEvents = getEventsForDate(day)
          const isSelected = isSameDay(day, selectedDate)
          const isTodayDate = isToday(day)

          return (
            <Card
              key={day.toISOString()}
              className={`cursor-pointer transition-all duration-200 ${
                isSelected ? "ring-2 ring-primary" : ""
              } ${isTodayDate ? "bg-primary/5" : ""}`}
              onClick={() => setSelectedDate(day)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`text-center ${isTodayDate ? "text-primary font-bold" : ""}`}>
                      <div className="text-xs text-muted-foreground">{format(day, "EEE")}</div>
                      <div className="text-lg font-semibold">{format(day, "d")}</div>
                    </div>
                    <Badge variant={dayEvents.length > 0 ? "default" : "secondary"}>{dayEvents.length} events</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      onCreateEvent(day)
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* События дня */}
                {dayEvents.length > 0 && (
                  <div className="space-y-2">
                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted/50"
                        style={{ borderLeft: `3px solid ${event.color}` }}
                        onClick={(e) => {
                          e.stopPropagation()
                          onEditEvent(event)
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{event.title}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {event.startTime}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )

  // Дневной вид
  const DayView = () => {
    const dayEvents = getEventsForDate(selectedDate)

    return (
      <div className="space-y-4">
        {/* Навигация по дням */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigateDay("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <h3 className="font-semibold">{format(selectedDate, "EEEE")}</h3>
            <p className="text-sm text-muted-foreground">{format(selectedDate, "MMMM d, yyyy")}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigateDay("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Кнопка добавления события */}
        <Button className="w-full" onClick={() => onCreateEvent(selectedDate)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Event for {format(selectedDate, "MMM d")}
        </Button>

        {/* События дня */}
        <div className="space-y-3">
          {dayEvents.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No events for this day</p>
              </CardContent>
            </Card>
          ) : (
            dayEvents.map((event) => (
              <Card key={event.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4" onClick={() => onEditEvent(event)}>
                  <div className="flex items-start gap-3">
                    <div className="w-4 h-4 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: event.color }} />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-base mb-1">{event.title}</h4>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {event.startTime} - {event.endTime}
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                      </div>

                      {event.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    )
  }

  // Список ближайших событий
  const ListView = () => {
    const upcomingEvents = getUpcomingEvents()

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Upcoming Events</h3>
          <Button size="sm" onClick={() => onCreateEvent(new Date())}>
            <Plus className="h-4 w-4 mr-2" />
            New Event
          </Button>
        </div>

        <div className="space-y-3">
          {upcomingEvents.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <List className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No upcoming events</p>
              </CardContent>
            </Card>
          ) : (
            upcomingEvents.map((event) => (
              <Card key={event.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4" onClick={() => onEditEvent(event)}>
                  <div className="flex items-start gap-3">
                    <div className="w-4 h-4 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: event.color }} />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-base mb-1">{event.title}</h4>

                      <div className="text-sm text-muted-foreground mb-2">
                        {format(event.date, "EEE, MMM d")} at {event.startTime}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {event.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                      </div>

                      {event.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{event.description}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Переключатель видов */}
      <div className="flex bg-muted rounded-lg p-1">
        <Button
          variant={viewMode === "week" ? "default" : "ghost"}
          size="sm"
          className="flex-1"
          onClick={() => setViewMode("week")}
        >
          Week
        </Button>
        <Button
          variant={viewMode === "day" ? "default" : "ghost"}
          size="sm"
          className="flex-1"
          onClick={() => setViewMode("day")}
        >
          Day
        </Button>
        <Button
          variant={viewMode === "list" ? "default" : "ghost"}
          size="sm"
          className="flex-1"
          onClick={() => setViewMode("list")}
        >
          List
        </Button>
      </div>

      {/* Контент в зависимости от выбранного вида */}
      {viewMode === "week" && <WeekView />}
      {viewMode === "day" && <DayView />}
      {viewMode === "list" && <ListView />}
    </div>
  )
}
