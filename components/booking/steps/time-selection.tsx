"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { formatTimeSlot } from "@/lib/utils/booking";
import { ChevronLeft } from "lucide-react";

interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

interface TimeSelectionProps {
  barberId: string;
  serviceId: string;
  date: string;
  selectedTimeSlot?: { start: string; end: string };
  onSelect: (timeSlot: { start: string; end: string }) => void;
  onBack: () => void;
}

export function TimeSelection({
  barberId,
  serviceId,
  date,
  selectedTimeSlot,
  onSelect,
  onBack,
}: TimeSelectionProps) {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTimeSlots() {
      setLoading(true);
      try {
        const url = `/api/availability/slots?barberId=${barberId}&serviceId=${serviceId}&date=${date}`;
        console.log("Fetching time slots:", url);

        const response = await fetch(url);
        const data = await response.json();

        console.log("Time slots response:", data);
        console.log(
          "Available slots:",
          data.slots?.filter((s: TimeSlot) => s.available),
        );

        setTimeSlots(data.slots || []);
      } catch (error) {
        console.error("Error loading time slots:", error);
      } finally {
        setLoading(false);
      }
    }

    loadTimeSlots();
  }, [barberId, serviceId, date]);

  const availableSlots = timeSlots.filter((slot) => slot.available);

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-xl font-bold">Select a Time</h3>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">
            Loading available times...
          </p>
        </div>
      ) : availableSlots.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">
            No available time slots for this date. Please select another date.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {availableSlots.map((slot) => {
            const isSelected =
              selectedTimeSlot?.start === slot.start &&
              selectedTimeSlot?.end === slot.end;

            return (
              <button
                key={slot.start}
                onClick={() => onSelect({ start: slot.start, end: slot.end })}
                className={`p-3 rounded-lg border-2 text-center transition-colors ${
                  isSelected
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <div className="font-medium text-sm">
                  {formatTimeSlot(slot.start, slot.end)}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
