const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const MAX_COTE = 2400
const SEUIL = 1.5 * 1024 * 1024
const LIMITE = 5 * 1024 * 1024

const versBlob = (canvas, qualite) =>
  new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', qualite))

// Allège l'image si besoin (photos de téléphone) avant l'envoi
export async function reduireImage(fichier) {
  if (!fichier) throw new Error('Choisis une image.')
  if (!TYPES[fichier.type])
    throw new Error('Format non accepté : utilise une image JPG, PNG ou WebP.')

  let bitmap
  try {
    bitmap = await createImageBitmap(fichier)
  } catch {
    throw new Error('Impossible de lire cette image.')
  }

  const echelle = Math.min(1, MAX_COTE / Math.max(bitmap.width, bitmap.height))
  if (echelle === 1 && fichier.size <= SEUIL) {
    bitmap.close?.()
    return { blob: fichier, ext: TYPES[fichier.type], type: fichier.type }
  }

  const largeur = Math.round(bitmap.width * echelle)
  const hauteur = Math.round(bitmap.height * echelle)
  const canvas = document.createElement('canvas')
  canvas.width = largeur
  canvas.height = hauteur
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, largeur, hauteur)
  ctx.drawImage(bitmap, 0, 0, largeur, hauteur)
  bitmap.close?.()

  let qualite = 0.9
  let blob = await versBlob(canvas, qualite)
  while (blob && blob.size > LIMITE && qualite > 0.5) {
    qualite -= 0.1
    blob = await versBlob(canvas, qualite)
  }
  if (!blob || blob.size > LIMITE) throw new Error('Image trop lourde, même après allègement.')
  return { blob, ext: 'jpg', type: 'image/jpeg' }
}