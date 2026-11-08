/**
 * Safely scales and compresses camera/upload images before transmitting to AI analysis.
 * Reduces 5MB-15MB smartphone photos to ~150KB-300KB while preserving leaf disease symptoms,
 * lesion patterns, and pesticide label typography.
 */
export async function optimizeImageForAnalysis(
  input: File | string,
  maxDimension: number = 1280,
  quality: number = 0.85
): Promise<{
  base64: string;
  mimeType: string;
  originalBytes: number;
  optimizedBytes: number;
}> {
  return new Promise((resolve, reject) => {
    let originalBytes = 0;
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;

      // Calculate constrained dimensions preserving aspect ratio
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Fallback to original if canvas context unavailable
        resolve({
          base64: typeof input === 'string' ? input : '',
          mimeType: 'image/jpeg',
          originalBytes,
          optimizedBytes: originalBytes,
        });
        return;
      }

      // Draw with smooth bi-linear interpolation
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const mimeType = 'image/jpeg';
      const optimizedBase64 = canvas.toDataURL(mimeType, quality);
      const optimizedBytes = Math.round((optimizedBase64.length * 3) / 4);

      resolve({
        base64: optimizedBase64,
        mimeType,
        originalBytes,
        optimizedBytes,
      });
    };

    img.onerror = (err) => {
      reject(new Error('Failed to load image for optimization: ' + err));
    };

    if (typeof input === 'string') {
      originalBytes = Math.round((input.length * 3) / 4);
      img.src = input;
    } else {
      originalBytes = input.size;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          img.src = reader.result;
        } else {
          reject(new Error('FileReader returned non-string result'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(input);
    }
  });
}

