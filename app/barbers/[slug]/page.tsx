import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import { MapPin, Scissors, Clock, DollarSign, Home } from "lucide-react";
import { formatPrice } from "@/lib/utils/booking";
import { BookingWidget } from "@/components/booking/booking-widget";
import { NotificationSubscribeForm } from "@/components/notifications/subscribe-form";
import {
  MOCK_BARBER,
  MOCK_SERVICES,
  MOCK_GALLERY,
  isDemoMode,
} from "@/lib/mock-data";

import { Database } from "@/lib/supabase/database.types";

type Barber = Database["public"]["Tables"]["barbers"]["Row"];
type Service = Database["public"]["Tables"]["services"]["Row"];
type GalleryImage = Database["public"]["Tables"]["gallery_images"]["Row"];

type BarberWithDetails = Barber & {
  services: Service[];
  gallery: GalleryImage[];
};

interface BarberProfilePageProps {
  params: Promise<{ slug: string }>;
}

async function getBarber(slug: string): Promise<BarberWithDetails | null> {
  // Check if we're in demo mode
  if (isDemoMode() && slug === "luccifadez") {
    return {
      ...MOCK_BARBER,
      services: MOCK_SERVICES as Service[],
      gallery: MOCK_GALLERY as GalleryImage[],
    } as BarberWithDetails;
  }

  const supabase = await createClient();

  const { data: barber } = await supabase
    .from("barbers")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!barber) return null;

  const typedBarber = barber as Barber;

  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("barber_id", typedBarber.id)
    .eq("active", true)
    .order("price");

  const { data: gallery } = await supabase
    .from("gallery_images")
    .select("*")
    .eq("barber_id", typedBarber.id)
    .order("display_order");

  return {
    ...typedBarber,
    services: (services || []) as Service[],
    gallery: (gallery || []) as GalleryImage[],
  };
}

export default async function BarberProfilePage({
  params,
}: BarberProfilePageProps) {
  const { slug } = await params;
  const barber = await getBarber(slug);

  if (!barber) {
    notFound();
  }

  const isDemo = isDemoMode();

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-6xl mx-auto">
        {/* Demo Mode Banner */}
        {isDemo && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-8">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🎨</span>
              <div className="flex-1">
                <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-1">
                  Demo Mode Active
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                  You're viewing demo data. Connect a Supabase database to
                  enable real bookings and customize your content.
                </p>
                <a
                  href="/setup"
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 underline"
                >
                  🚀 Start Setup Guide
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="flex flex-col md:flex-row gap-8 mb-12">
          {/* Logo */}
          <div className="w-full md:w-64 h-64 relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
            {barber.logo_url ? (
              <Image
                src={barber.logo_url}
                alt={barber.shop_name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Scissors className="h-24 w-24 text-gray-400" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-4">{barber.shop_name}</h1>

            {(barber.city || barber.address) && (
              <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400 mb-4">
                <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <span>
                  {barber.city && barber.address
                    ? `${barber.address}, ${barber.city}`
                    : barber.city || barber.address}
                </span>
              </div>
            )}

            {barber.travel_enabled && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-4">
                <Home className="h-5 w-5" />
                <span className="font-medium">Home visits available</span>
              </div>
            )}

            <NotificationSubscribeForm barberId={barber.id} />
          </div>
        </div>

        {/* Services Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Services</h2>
          {barber.services.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">
              No services available.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {barber.services.map((service) => (
                <div
                  key={service.id}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4"
                >
                  <h3 className="font-bold text-lg mb-2">{service.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{service.duration_minutes} min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-medium">
                        {formatPrice(service.price)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Extra Section */}
        {barber.extra_section_enabled && barber.extra_section_title && (
          <div className="mb-12">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
              {barber.extra_section_image_url && (
                <div className="relative w-full h-64 mb-4 rounded-lg overflow-hidden">
                  <Image
                    src={barber.extra_section_image_url}
                    alt={barber.extra_section_title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <h2 className="text-2xl font-bold mb-4">
                {barber.extra_section_title}
              </h2>
              {barber.extra_section_text && (
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {barber.extra_section_text}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Gallery */}
        {barber.gallery.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Gallery</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {barber.gallery
                .filter((image) => image.image_url !== barber.logo_url)
                .map((image) => (
                  <div
                    key={image.id}
                    className="relative aspect-square rounded-lg overflow-hidden"
                  >
                    <Image
                      src={image.image_url}
                      alt="Gallery"
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Booking Widget */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Book an Appointment</h2>
          <BookingWidget
            barberId={barber.id}
            services={barber.services}
            travelEnabled={barber.travel_enabled}
          />
        </div>
      </div>
    </div>
  );
}
