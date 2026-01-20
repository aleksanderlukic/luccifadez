"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Upload,
  Trash2,
  Image as ImageIcon,
  Star,
} from "lucide-react";

interface GalleryImage {
  id: string;
  image_url: string;
  created_at: string;
}

export default function DashboardGalleryPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [barberId, setBarberId] = useState("");
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [logoUrl, setLogoUrl] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [uploadMethod, setUploadMethod] = useState<"url" | "file">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: barber } = await (supabase.from("barbers") as any)
        .select("id, logo_url")
        .eq("user_id", user.id)
        .single();

      if (!barber) throw new Error("No barber profile found");

      setBarberId(barber.id);
      setLogoUrl(barber.logo_url || "");
      await loadImages(barber.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadImages(id: string) {
    const { data, error } = await (supabase.from("gallery_images") as any)
      .select("*")
      .eq("barber_id", id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    setImages(data || []);
  }

  async function handleSetLogo(url: string) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await (supabase.from("barbers") as any)
        .update({ logo_url: url })
        .eq("id", barberId);

      if (error) throw error;
      setLogoUrl(url);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleRemoveLogo() {
    try {
      const { error } = await (supabase.from("barbers") as any)
        .update({ logo_url: null })
        .eq("id", barberId);

      if (error) throw error;
      setLogoUrl("");
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleAddImage(e: React.FormEvent) {
    e.preventDefault();
    setUploading(true);
    setError("");

    try {
      let finalImageUrl = imageUrl;

      // If uploading a file, upload it to Supabase Storage first
      if (uploadMethod === "file" && selectedFile) {
        console.log("Starting file upload...", {
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          fileType: selectedFile.type,
        });

        const fileExt = selectedFile.name.split(".").pop();
        const fileName = `${barberId}/${Date.now()}.${fileExt}`;

        console.log("Uploading to Storage:", fileName);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("gallery-images")
          .upload(fileName, selectedFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          // If bucket doesn't exist, show helpful error
          if (
            uploadError.message.includes("not found") ||
            uploadError.message.includes("Bucket")
          ) {
            throw new Error(
              "Storage bucket not configured. Please create a PUBLIC 'gallery-images' bucket in Supabase Storage: https://supabase.com/dashboard/project/rltahfuykkiietwudvkg/storage/buckets",
            );
          }
          throw uploadError;
        }

        console.log("Upload successful:", uploadData);

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage
          .from("gallery-images")
          .getPublicUrl(uploadData.path);

        console.log("Public URL:", publicUrl);
        finalImageUrl = publicUrl;
      } else if (uploadMethod === "url" && !imageUrl) {
        throw new Error("Please enter an image URL");
      }

      if (!finalImageUrl) {
        throw new Error("No image URL provided");
      }

      console.log("Saving to database:", finalImageUrl);
      console.log("Barber ID:", barberId);

      // Save to database
      const { data: insertData, error: dbError } = await (
        supabase.from("gallery_images") as any
      ).insert({
        barber_id: barberId,
        image_url: finalImageUrl,
      });

      if (dbError) {
        console.error("Database error:", dbError);
        console.error("Full error details:", JSON.stringify(dbError, null, 2));
        throw new Error(
          `Database error: ${dbError.message || JSON.stringify(dbError)}`,
        );
      }

      console.log("Insert data:", insertData);

      console.log("Image saved successfully!");

      // Reset form
      setImageUrl("");
      setSelectedFile(null);
      await loadImages(barberId);
    } catch (err: any) {
      console.error("Error adding image:", err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this image?")) return;

    try {
      const { error } = await (supabase.from("gallery_images") as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
      await loadImages(barberId);
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Gallery</h1>

        {error && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Logo Section */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Shop Logo
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Your logo will be displayed on your public profile page
          </p>

          {logoUrl ? (
            <div className="flex items-start gap-6">
              <div className="relative w-40 h-40 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                <img
                  src={logoUrl}
                  alt="Shop logo"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23ddd' width='200' height='200'/%3E%3Ctext fill='%23999' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ENo image%3C/text%3E%3C/svg%3E";
                  }}
                />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Current logo
                </p>
                <Button
                  variant="outline"
                  onClick={handleRemoveLogo}
                  className="text-red-600"
                >
                  Remove Logo
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
              <ImageIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                No logo set yet
              </p>
              <p className="text-sm text-gray-500">
                Add images to your gallery below, then click "Set as Logo" on
                any image
              </p>
            </div>
          )}
        </div>

        {/* Add Image Form */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4">Add New Image</h2>

          {/* Upload Method Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setUploadMethod("file")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                uploadMethod === "file"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              Upload File
            </button>
            <button
              type="button"
              onClick={() => setUploadMethod("url")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                uploadMethod === "url"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              Use URL
            </button>
          </div>

          <form onSubmit={handleAddImage} className="space-y-4">
            {uploadMethod === "file" ? (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Select Image File
                </label>
                <input
                  key={selectedFile?.name || "file-input"}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedFile(file);
                    }
                  }}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600"
                  required={uploadMethod === "file"}
                  disabled={uploading}
                />
                {selectedFile && (
                  <p className="text-xs text-gray-500 mt-1">
                    Selected: {selectedFile.name} (
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Image URL
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600 dark:bg-gray-700 dark:border-gray-600"
                  placeholder="https://example.com/image.jpg"
                  required={uploadMethod === "url"}
                  disabled={uploading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the URL of an image hosted online (e.g., Imgur, your
                  website, etc.)
                </p>
              </div>
            )}

            <Button type="submit" disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5 mr-2" />
                  Add Image
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Gallery Grid */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Your Gallery</h2>
          {images.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <ImageIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No images yet. Add your first portfolio image above!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {images
                .filter((image) => image.image_url !== logoUrl)
                .map((image) => (
                  <div
                    key={image.id}
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden group"
                  >
                    <div className="relative aspect-square">
                      <img
                        src={image.image_url}
                        alt="Gallery image"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23ddd' width='400' height='400'/%3E%3Ctext fill='%23999' x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='20'%3EImage not found%3C/text%3E%3C/svg%3E";
                        }}
                      />
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        {logoUrl !== image.image_url && (
                          <button
                            onClick={() => handleSetLogo(image.image_url)}
                            className="p-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                            title="Set as logo"
                          >
                            <Star className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(image.id)}
                          className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {logoUrl === image.image_url && (
                        <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          Logo
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
