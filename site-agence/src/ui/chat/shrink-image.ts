/**
 * Photos réduites avant l'envoi (2 048 px au plus, JPEG) : un cliché de
 * téléphone de 5 à 12 Mo passe sous la limite de 4 Mo sans perte visible.
 * Les photos HEIC (iPhone) sont converties quand le navigateur sait les lire.
 */
const MAX_SIDE = 2048;
const QUALITY = 0.85;
const SMALL_ENOUGH = 1.2 * 1024 * 1024;
const RESIZABLE = /^image\/(jpeg|png|webp)$/;
const CONVERTIBLE = /^image\/hei[cf]$|\.hei[cf]$/i;

export async function shrinkImage(file: File): Promise<File> {
  const convert = CONVERTIBLE.test(file.type) || CONVERTIBLE.test(file.name);
  if (!convert && (!RESIZABLE.test(file.type) || file.size <= SMALL_ENOUGH)) return file;
  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) return file;
    // Fond blanc : la transparence d'un PNG ne devient pas noire en JPEG.
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
    if (!blob || (!convert && blob.size >= file.size)) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`, { type: "image/jpeg" });
  } catch {
    // Format illisible ici : on envoie l'original, le serveur dira s'il l'accepte.
    return file;
  }
}
