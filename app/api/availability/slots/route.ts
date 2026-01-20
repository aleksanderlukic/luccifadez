import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateTimeSlots } from "@/lib/utils/booking";
import { Database } from "@/lib/supabase/database.types";

type Service = Database["public"]["Tables"]["services"]["Row"];
type Availability = Database["public"]["Tables"]["availability"]["Row"];
type Booking = Database["public"]["Tables"]["bookings"]["Row"];

// Check if in demo mode
const isDemoMode = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !url || url.includes("placeholder");
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const barberId = searchParams.get("barberId");
    const serviceId = searchParams.get("serviceId");
    const date = searchParams.get("date");

    if (!barberId || !serviceId || !date) {
      return NextResponse.json(
        { error: "barberId, serviceId, and date are required" },
        { status: 400 },
      );
    }

    // Demo mode - return mock time slots
    if (isDemoMode()) {
      const slots = generateTimeSlots(date, "09:00", "18:00", 45, []);
      return NextResponse.json({ slots });
    }

    const supabase = await createClient();

    // Get service to know duration
    const { data: service } = await supabase
      .from("services")
      .select("duration_minutes")
      .eq("id", serviceId)
      .single();

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const typedService = service as Service;

    // Get availability for this date
    console.log("Fetching availability for:", { barberId, date });

    const { data: availability, error: availError } = await supabase
      .from("availability")
      .select("*")
      .eq("barber_id", barberId)
      .eq("date", date);

    console.log("Availability query result:", { availability, availError });

    if (!availability || availability.length === 0) {
      console.log("No availability found for this date");
      return NextResponse.json({ slots: [] });
    }

    const typedAvailability = availability as Availability[];

    // Get existing bookings for this date
    const startOfDay = `${date}T00:00:00Z`;
    const endOfDay = `${date}T23:59:59Z`;

    const { data: bookings } = await supabase
      .from("bookings")
      .select("starts_at, ends_at")
      .eq("barber_id", barberId)
      .neq("status", "cancelled")
      .gte("starts_at", startOfDay)
      .lte("starts_at", endOfDay);

    const typedBookings = (bookings || []) as Booking[];

    console.log("Generating slots for availability:", typedAvailability);
    console.log("Service duration:", typedService.duration_minutes, "minutes");
    console.log("Existing bookings:", typedBookings.length);

    // Generate slots from all availability ranges
    let allSlots: any[] = [];

    for (const avail of typedAvailability) {
      console.log(
        `Generating slots from ${avail.start_time} to ${avail.end_time}`,
      );

      const slots = generateTimeSlots(
        date,
        avail.start_time,
        avail.end_time,
        typedService.duration_minutes,
        typedBookings,
      );

      console.log(`Generated ${slots.length} slots for this time range`);
      console.log("Sample slots:", slots.slice(0, 3));

      allSlots = [...allSlots, ...slots];
    }

    console.log("Total slots generated:", allSlots.length);

    // Sort by start time
    allSlots.sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
    );

    return NextResponse.json({ slots: allSlots });
  } catch (error) {
    console.error("Error fetching time slots:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
