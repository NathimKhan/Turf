const fallbackImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 700'%3E%3Crect width='1200' height='700' fill='%230f172a'/%3E%3Cpath d='M0 520 330 250l190 170 160-130 520 410H0z' fill='%232563eb'/%3E%3Ccircle cx='920' cy='180' r='90' fill='%2322c55e'/%3E%3Ctext x='70' y='110' fill='white' font-family='Arial,sans-serif' font-size='54' font-weight='700'%3ETURFX VENUE%3C/text%3E%3C/svg%3E";

export function handleImageError(event) {
  const image = event.currentTarget;
  image.onerror = null;
  image.src = fallbackImage;
}
