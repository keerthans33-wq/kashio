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
 * Sentinel error thrown when the user has permanently denied camera or
 * photo library access. The caller should show a Settings redirect message.
 */
export class PermissionDeniedError extends Error {
  constructor() {
    super("PERMISSION_DENIED");
    this.name = "PermissionDeniedError";
  }
}

/**
 * Open the native iOS camera / photo-library picker and return
 * the selected image as a File ready for FormData upload.
 *
 * Returns null if the user cancels — callers do not need to handle that case.
 * Throws PermissionDeniedError if the user has permanently denied access.
 * Throws for any other genuine error.
 */
export async function pickPhotoNative(): Promise<File | null> {
  const { Camera, CameraResultType, CameraSource } = await import(
    "@capacitor/camera"
  );

  let photo;
  try {
    photo = await Camera.getPhoto({
      // 1600px wide keeps file sizes manageable while still being sharp enough
      // to read any receipt text. quality 90 avoids JPEG blocking on fine print.
      width:        1600,
      quality:      90,
      allowEditing: false,
      resultType:   CameraResultType.Base64,
      // Prompt shows native iOS action sheet: Camera · Photo Library
      source:       CameraSource.Prompt,
    });
  } catch (err) {
    const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();

    // User tapped Cancel or dismissed the action sheet — not an error.
    if (
      msg.includes("cancel") ||
      msg.includes("no image") ||
      msg.includes("no photo") ||
      msg.includes("user did not") ||
      msg === ""
    ) {
      return null;
    }

    // iOS tells us the user permanently denied access to camera or photos.
    if (
      msg.includes("denied") ||
      msg.includes("permission") ||
      msg.includes("unauthorized") ||
      msg.includes("not authorized") ||
      msg.includes("access") // "access to camera was denied"
    ) {
      throw new PermissionDeniedError();
    }

    throw err;
  }

  if (!photo.base64String) return null;

  const mimeType = photo.format === "png" ? "image/png" : "image/jpeg";
  const ext      = photo.format ?? "jpg";
  const fileName = `receipt-${Date.now()}.${ext}`;

  const bytes = Uint8Array.from(atob(photo.base64String), (c) =>
    c.charCodeAt(0)
  );
  return new File([bytes], fileName, { type: mimeType });
}
