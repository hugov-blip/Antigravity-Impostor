const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
const date = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })

export const formatEUR = (n: number | string) => eur.format(Number(n))
export const formatDate = (iso: string) => date.format(new Date(iso))

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

/** Black or white, whichever reads better on the given hex background. */
export function readableOn(hex: string) {
  const v = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(v.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 0.45 ? '#111827' : '#ffffff'
}

export function themeVars(primary: string, secondary: string): React.CSSProperties {
  return {
    '--brand': primary,
    '--brand-2': secondary,
    '--brand-fg': readableOn(primary),
    '--brand-2-fg': readableOn(secondary),
  } as React.CSSProperties
}

/** Downscales an uploaded image to a small data URL so it can be stored with the team. */
export function imageFileToDataUrl(file: File, maxSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Formato de imagen no soportado'))
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/png'))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

export const isValidPin = (pin: string) => /^[0-9]{4,8}$/.test(pin)

export const sessionStore = {
  key: (slug: string) => `multas:session:${slug}`,
  get(slug: string) {
    return sessionStorage.getItem(this.key(slug))
  },
  set(slug: string, token: string) {
    sessionStorage.setItem(this.key(slug), token)
  },
  clear(slug: string) {
    sessionStorage.removeItem(this.key(slug))
  },
}
