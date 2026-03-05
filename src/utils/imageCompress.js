/**
 * Compresse une image pour réduire sa taille (éviter le dépassement du quota localStorage).
 * Redimensionne à maxWidth x maxHeight et convertit en JPEG pour réduire le poids.
 * @param {File|string} fileOrDataUrl - Fichier ou data URL
 * @param {Object} opts - { maxWidth, maxHeight, quality }
 * @returns {Promise<string>} Data URL compressée (JPEG)
 */
export function compressImageForStorage(fileOrDataUrl, opts = {}) {
  const { maxWidth = 800, maxHeight = 800, quality = 0.75, maxKb = 150 } = opts;

  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';

    const onLoad = () => {
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > maxWidth || h > maxHeight) {
        const ratio = Math.min(maxWidth / w, maxHeight / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      let q = quality;
      while (((dataUrl.length * 3) / 4 / 1024) > maxKb && q > 0.4) {
        q = Math.max(0.4, q - 0.1);
        dataUrl = canvas.toDataURL('image/jpeg', q);
      }
      resolve(dataUrl);
    };

    img.onerror = () => reject(new Error('Impossible de charger l\'image'));

    if (typeof fileOrDataUrl === 'string') {
      img.src = fileOrDataUrl;
      img.onload = onLoad;
    } else if (fileOrDataUrl instanceof File) {
      const reader = new FileReader();
      reader.onload = () => {
        img.src = reader.result;
        img.onload = onLoad;
      };
      reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
      reader.readAsDataURL(fileOrDataUrl);
    } else {
      reject(new Error('Format non supporté'));
    }
  });
}
