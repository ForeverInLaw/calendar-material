"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Clock, MapPin } from "lucide-react"
import type { Event } from "./calendar-app"

interface EventsPopoverProps {
  events: Event[]
  onEditEvent: (event: Event) => void
  remainingCount: number
  isMobile?: boolean
}

export function EventsPopover({ events, onEditEvent, remainingCount, isMobile = false }: EventsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsOpen(true)
  }

  return (
    <>
      {/* Restored original button styling */}
      <Button
        variant="ghost"
        className={`text-muted-foreground hover:text-foreground font-normal hover:bg-muted/50 transition-all duration-200 ${
          isMobile ? "text-[8px] p-0.5 h-auto leading-tight" : "text-xs p-1 h-auto"
        }`}
        onClick={handleButtonClick}
      >
        +{remainingCount} more
      </Button>

      {/* Use Dialog for reliable functionality */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className={`p-0 ${isMobile ? "max-w-sm" : "max-w-md"}`}>
          <div className="p-3 border-b border-border">
            <DialogTitle className={`font-medium ${isMobile ? "text-sm" : "text-sm"}`}>
              All Events ({events.length})
            </DialogTitle>
          </div>
          <div className={`overflow-y-auto ${isMobile ? "max-h-56" : "max-h-64"}`}>
            {events.map((event, index) => (
              <div
                key={`${event.id}-${index}`}
                className="p-3 hover:bg-muted/50 cursor-pointer transition-colors duration-200 border-b border-border last:border-b-0"
                onClick={() => {
                  onEditEvent(event)
                  setIsOpen(false)
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: event.color }} />
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium truncate ${isMobile ? "text-sm" : "text-sm"}`}>{event.title}</div>
                    <div
                      className={`flex items-center gap-2 mt-1 text-muted-foreground ${isMobile ? "text-xs" : "text-xs"}`}
                    >
                      <Clock className="h-3 w-3" />
                      <span>
                        {event.startTime} - {event.endTime}
                      </span>
                    </div>
                    {event.location && (
                      <div
                        className={`flex items-center gap-2 mt-1 text-muted-foreground ${isMobile ? "text-xs" : "text-xs"}`}
                      >
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                    {event.description && (
                      <div className={`text-muted-foreground mt-1 line-clamp-2 ${isMobile ? "text-xs" : "text-xs"}`}>
                        {event.description}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
