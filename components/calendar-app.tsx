"use client"

import { useState, useEffect } from "react"
import { ResponsiveCalendarGrid } from "./responsive-calendar-grid"
import { EventModal } from "./event-modal"
import { TelegramSettings } from "./telegram-settings"
import { ThemeProvider } from "./theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AuthProvider, useAuth } from "./auth-provider"
import { AuthModal } from "./auth-modal"
import { EventsService } from "@/lib/events-service"
import { MobileHeader } from "./mobile-header"
import { DesktopHeader } from "./desktop-header"
import { MobileCalendarNavigation } from "./mobile-calendar-navigation"
import { MobileCalendarView } from "./mobile-calendar-view"

export interface Event {
  id: string
  title: string
  description?: string
  date: Date
  startTime: string
  endTime: string
  reminder?: number
  color: string
  location?: string
}

export function CalendarApp() {
  return (
    <AuthProvider>
      <CalendarAppContent />
    </AuthProvider>
  )
}

function CalendarAppContent() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()

  // Load events from database when user is authenticated
  useEffect(() => {
    if (user && !authLoading) {
      loadEvents()
    } else if (!authLoading) {
      setIsLoading(false)
      // Load events from localStorage for non-authenticated users
      loadLocalEvents()
    }
  }, [user, authLoading])

  const loadEvents = async () => {
    try {
      setIsLoading(true)
      const userEvents = await EventsService.getEvents()
      setEvents(userEvents)
    } catch (error) {
      console.error("Error loading events:", error)
      toast({
        title: "Error loading events",
        description: "Failed to load your events from the database. Using local storage instead.",
        variant: "destructive",
      })
      // Fallback to localStorage
      loadLocalEvents()
    } finally {
      setIsLoading(false)
    }
  }

  const loadLocalEvents = () => {
    try {
      const savedEvents = localStorage.getItem("calendar-events")
      if (savedEvents) {
        const parsedEvents = JSON.parse(savedEvents).map((event: any) => ({
          ...event,
          date: new Date(event.date),
        }))
        setEvents(parsedEvents)
      }
    } catch (error) {
      console.error("Error loading local events:", error)
      setEvents([])
    }
  }

  const saveLocalEvents = (eventsToSave: Event[]) => {
    try {
      localStorage.setItem("calendar-events", JSON.stringify(eventsToSave))
    } catch (error) {
      console.error("Error saving local events:", error)
    }
  }

  const handleCreateEvent = (date?: Date) => {
    setSelectedDate(date || new Date())
    setSelectedEvent(null)
    setIsModalOpen(true)
  }

  const handleEditEvent = (event: Event) => {
    setSelectedEvent(event)
    setSelectedDate(null)
    setIsModalOpen(true)
  }

  const handleSaveEvent = async (eventData: Omit<Event, "id">) => {
    if (isSaving) return // Prevent double submission

    setIsSaving(true)

    try {
      if (user) {
        // Save to database for authenticated users
        if (selectedEvent) {
          // Update existing event
          const updatedEvent = await EventsService.updateEvent(selectedEvent.id, eventData)
          setEvents((prev) => prev.map((event) => (event.id === selectedEvent.id ? updatedEvent : event)))
          toast({
            title: "Event updated",
            description: "Your event has been successfully updated.",
          })
        } else {
          // Create new event
          try {
            const newEvent = await EventsService.createEvent(eventData)
            setEvents((prev) => [...prev, newEvent])
            toast({
              title: "Event created",
              description: "Your event has been successfully created.",
            })
          } catch (error) {
            console.error("Database error:", error)

            // If there's a foreign key constraint error, it might be because the user profile doesn't exist
            if (error instanceof Error && error.message.includes("foreign key constraint")) {
              toast({
                title: "Database error",
                description: "There was an issue with your user profile. Please try signing out and back in.",
                variant: "destructive",
              })

              // Fall back to local storage
              const newEvent: Event = {
                ...eventData,
                id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              }
              const updatedEvents = [...events, newEvent]
              setEvents(updatedEvents)
              saveLocalEvents(updatedEvents)
            } else {
              throw error // Re-throw if it's not a foreign key constraint error
            }
          }
        }
      } else {
        // Save to localStorage for non-authenticated users
        if (selectedEvent) {
          // Update existing event
          const updatedEvents = events.map((event) =>
            event.id === selectedEvent.id ? { ...eventData, id: selectedEvent.id } : event,
          )
          setEvents(updatedEvents)
          saveLocalEvents(updatedEvents)
          toast({
            title: "Event updated",
            description: "Your event has been successfully updated.",
          })
        } else {
          // Create new event
          const newEvent: Event = {
            ...eventData,
            id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          }
          const updatedEvents = [...events, newEvent]
          setEvents(updatedEvents)
          saveLocalEvents(updatedEvents)
          toast({
            title: "Event created",
            description: "Your event has been successfully created.",
          })
        }
      }
      setIsModalOpen(false)
    } catch (error) {
      console.error("Error saving event:", error)

      // More specific error handling
      let errorMessage = "Failed to save your event. Please try again."
      if (error instanceof Error) {
        if (error.message.includes("Authentication")) {
          errorMessage = "Authentication failed. Please sign in again."
          setIsAuthModalOpen(true)
        } else if (error.message.includes("Database")) {
          errorMessage = "Database error. Your event will be saved locally instead."
          // Try to save locally as fallback
          try {
            if (selectedEvent) {
              const updatedEvents = events.map((event) =>
                event.id === selectedEvent.id ? { ...eventData, id: selectedEvent.id } : event,
              )
              setEvents(updatedEvents)
              saveLocalEvents(updatedEvents)
            } else {
              const newEvent: Event = {
                ...eventData,
                id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              }
              const updatedEvents = [...events, newEvent]
              setEvents(updatedEvents)
              saveLocalEvents(updatedEvents)
            }
            setIsModalOpen(false)
            return
          } catch (localError) {
            console.error("Local save also failed:", localError)
          }
        }
      }

      toast({
        title: "Error saving event",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    try {
      if (user && !eventId.startsWith("local_")) {
        // Delete from database for authenticated users
        await EventsService.deleteEvent(eventId)
      }

      // Always update local state
      const updatedEvents = events.filter((event) => event.id !== eventId)
      setEvents(updatedEvents)

      if (!user || eventId.startsWith("local_")) {
        // Save to localStorage for non-authenticated users or local events
        saveLocalEvents(updatedEvents)
      }

      setIsModalOpen(false)
      toast({
        title: "Event deleted",
        description: "Your event has been successfully deleted.",
      })
    } catch (error) {
      console.error("Error deleting event:", error)
      toast({
        title: "Error deleting event",
        description: "Failed to delete your event. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (authLoading || isLoading) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background transition-colors duration-300">
        {/* Mobile Header */}
        <MobileHeader
          onCreateEvent={() => handleCreateEvent()}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenAuth={() => setIsAuthModalOpen(true)}
        />

        {/* Desktop Header */}
        <DesktopHeader
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          onCreateEvent={() => handleCreateEvent()}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenAuth={() => setIsAuthModalOpen(true)}
        />

        {/* Mobile Calendar Navigation */}
        <MobileCalendarNavigation currentDate={currentDate} onDateChange={setCurrentDate} />

        {/* Main Content */}
        <div className="px-3 pb-6 md:px-6 md:pb-8 pt-2 md:pt-0">
          {/* Sign in prompt for non-authenticated users */}
          {!user && (
            <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-border mx-1 md:mx-0">
              <p className="text-center text-sm text-muted-foreground">
                <Button variant="link" onClick={() => setIsAuthModalOpen(true)} className="p-0 h-auto text-sm">
                  Sign in
                </Button>{" "}
                to save your events and sync across devices
              </p>
            </div>
          )}

          {/* Calendar Grid */}
          <div className="hidden md:block">
            <ResponsiveCalendarGrid
              currentDate={currentDate}
              events={events}
              onCreateEvent={handleCreateEvent}
              onEditEvent={handleEditEvent}
            />
          </div>

          {/* Mobile Calendar View */}
          <div className="md:hidden">
            <MobileCalendarView
              currentDate={currentDate}
              events={events}
              onCreateEvent={handleCreateEvent}
              onEditEvent={handleEditEvent}
              onDateChange={setCurrentDate}
            />
          </div>
        </div>

        {/* Modals */}
        <EventModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
          event={selectedEvent}
          selectedDate={selectedDate}
          isLoading={isSaving}
        />

        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

        {/* Settings Modal */}
        {isSettingsOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-300">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">Settings</h2>
                <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-4">
                <TelegramSettings />
              </div>
            </div>
          </div>
        )}
      </div>
      <Toaster />
    </ThemeProvider>
  )
}
