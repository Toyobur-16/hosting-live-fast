export function normalizeLogoUrl(raw?: string | null, contentType?: string): string {
  if (!raw || typeof raw !== 'string') return '/site-logo.png';
  const trimmed = raw.trim();
  if (!trimmed) return '/site-logo.png';

  if (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  // Raw base64 string without data URI prefix (e.g., from Firestore site_images)
  let mime = contentType || 'image/png';
  if (trimmed.startsWith('/9j/')) mime = 'image/jpeg';
  else if (trimmed.startsWith('iVBOR')) mime = 'image/png';
  else if (trimmed.startsWith('R0lGOD')) mime = 'image/gif';
  else if (trimmed.startsWith('UklGR')) mime = 'image/webp';
  else if (trimmed.startsWith('PHN2Zy')) mime = 'image/svg+xml';

  return `data:${mime};base64,${trimmed}`;
}

export function optimizeLogoImage(file: File, maxWidth = 850, maxHeight = 300): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('ফাইল রিড করতে সমস্যা হয়েছে'));
    reader.onload = () => {
      const resultStr = reader.result as string;
      if (!resultStr) {
        reject(new Error('খালি ইমেজ ফাইল'));
        return;
      }

      // If SVG, return directly if small enough
      if (file.type === 'image/svg+xml' && resultStr.length < 650000) {
        resolve(resultStr);
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          let width = img.naturalWidth || img.width || 400;
          let height = img.naturalHeight || img.height || 150;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.max(1, Math.round(width * ratio));
            height = Math.max(1, Math.round(height * ratio));
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(resultStr);
            return;
          }

          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Try PNG first to preserve crisp edges & transparency
          let dataUrl = canvas.toDataURL('image/png');
          // Ensure well below Firestore 1MB document limit (~700KB safe threshold)
          if (dataUrl.length > 680000) {
            dataUrl = canvas.toDataURL('image/webp', 0.9);
          }
          if (dataUrl.length > 680000) {
            dataUrl = canvas.toDataURL('image/webp', 0.75);
          }
          resolve(dataUrl);
        } catch {
          resolve(resultStr);
        }
      };
      img.onerror = () => {
        resolve(resultStr);
      };
      img.src = resultStr;
    };
    reader.readAsDataURL(file);
  });
}
