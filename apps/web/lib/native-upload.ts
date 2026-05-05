/**
 * Native iOS photo/camera access via Capacitor.
 * Dynamically imported so it never runs during SSR and
 * doesn't affect the web bundle if Capacitor isn't present.
 */

/** True only inside the Capacitor iOS/Android shell. */
export async function isNativePlatform(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Open the native iOS camera / photo-library picker and return
 * the selected image as a File ready for FormData upload.
 *
 * Returns null if the user cancels.
 * Throws for genuine errors (e.g. permission denied).
 */
export async function pickPhotoNative(): Promise<File | null> {
  const { Camera, CameraResultType, CameraSource } = await import(
    "@capacitor/camera"
  );

  const photo = await Camera.getPhoto({
    quality:       90,
    allowEditing:  false,
    resultType:    CameraResultType.Base64,
    // Prompt shows native iOS action sheet: Camera · Photo Library
    source:        CameraSource.Prompt,
  });

  if (!photo.base64String) return null;

  const mimeType = photo.format === "png" ? "image/png" : "image/jpeg";
  const ext      = photo.format ?? "jpg";
  const fileName = `receipt-${Date.now()}.${ext}`;

  const bytes = Uint8Array.from(atob(photo.base64String), (c) =>
    c.charCodeAt(0)
  );
  return new File([bytes], fileName, { type: mimeType });
}
