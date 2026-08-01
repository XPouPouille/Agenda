export function MapPreview({ address }: { address: string }) {
  const query = encodeURIComponent(address);
  const embedSrc = `https://maps.google.com/maps?q=${query}&output=embed`;
  const linkHref = `https://www.google.com/maps/search/?api=1&query=${query}`;

  return (
    <div>
      <iframe
        title={`Carte ${address}`}
        src={embedSrc}
        width="100%"
        height="200"
        style={{ border: 0, borderRadius: 8 }}
        loading="lazy"
      />
      <a href={linkHref} target="_blank" rel="noreferrer">
        Ouvrir dans Google Maps
      </a>
    </div>
  );
}
