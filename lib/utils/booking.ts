import {
  format,
  parse,
  addMinutes,
  isAfter,
  isBefore,
  parseISO,
  differenceInHours,
} from "date-fns";

export interface TimeSlot {
  start: string; // ISO string
  end: string; // ISO string
  available: boolean;
}

/**
 * Generate time slots from availability range based on service duration
 */
export function generateTimeSlots(
  date: string, // YYYY-MM-DD
  startTime: string, // HH:mm:ss or HH:mm
  endTime: string, // HH:mm:ss or HH:mm
  durationMinutes: number,
  bookedSlots: { starts_at: string; ends_at: string }[] = [],
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  // Remove seconds if present (e.g., "09:00:00" -> "09:00")
  const cleanStartTime = startTime.substring(0, 5);
  const cleanEndTime = endTime.substring(0, 5);

  const dateStr = date;
  let currentTime = parse(
    `${dateStr} ${cleanStartTime}`,
    "yyyy-MM-dd HH:mm",
    new Date(),
  );
  const endDateTime = parse(
    `${dateStr} ${cleanEndTime}`,
    "yyyy-MM-dd HH:mm",
    new Date(),
  );

  while (isBefore(currentTime, endDateTime)) {
    const slotEnd = addMinutes(currentTime, durationMinutes);

    // Don't add slot if it extends beyond availability end time
    if (isAfter(slotEnd, endDateTime)) {
      break;
    }

    const slotStart = currentTime.toISOString();
    const slotEndISO = slotEnd.toISOString();

    // Check if this slot overlaps with any booked slots
    const isBooked = bookedSlots.some((booking) => {
      const bookingStart = parseISO(booking.starts_at);
      const bookingEnd = parseISO(booking.ends_at);
      const currentSlotStart = parseISO(slotStart);
      const currentSlotEnd = parseISO(slotEndISO);

      // Check for any overlap
      return (
        (isAfter(currentSlotStart, bookingStart) &&
          isBefore(currentSlotStart, bookingEnd)) ||
        (isAfter(currentSlotEnd, bookingStart) &&
          isBefore(currentSlotEnd, bookingEnd)) ||
        (isBefore(currentSlotStart, bookingStart) &&
          isAfter(currentSlotEnd, bookingEnd)) ||
        currentSlotStart.getTime() === bookingStart.getTime()
      );
    });

    slots.push({
      start: slotStart,
      end: slotEndISO,
      available: !isBooked,
    });

    currentTime = slotEnd;
  }

  return slots;
}

/**
 * Check if a booking can be cancelled (at least 24 hours before start)
 */
export function canCancelBooking(startsAt: string): boolean {
  const now = new Date();
  const bookingStart = parseISO(startsAt);
  const hoursUntilBooking = differenceInHours(bookingStart, now);

  return hoursUntilBooking >= 24;
}

/**
 * Format time for display
 */
export function formatTimeSlot(start: string, end: string): string {
  return `${format(parseISO(start), "h:mm a")} - ${format(parseISO(end), "h:mm a")}`;
}

/**
 * Format date for display
 */
export function formatDate(date: string): string {
  return format(parseISO(date), "MMMM d, yyyy");
}

/**
 * Format price
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}

/**
 * Generate a random cancellation token
 */
export function generateCancellationToken(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}
