import Image from "next/image";
import type { EventItem } from "@/data/events";

export default function EventPoster({ event, className = "" }: { event: EventItem; className?: string }) {
  if (event.image) {
    return <div className={`relative overflow-hidden bg-black ${className}`}><Image src={event.image} alt={`${event.title} poster`} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" /></div>;
  }

  const words = event.title.split(" ");
  return (
    <div className={`event-poster poster-${event.theme} ${className}`} aria-label={`${event.title} event artwork`}>
      <div className="poster-grid" />
      <span className="poster-kicker">SiTIKET presents</span>
      <div className="poster-title">{words.map((word) => <span key={word}>{word}</span>)}</div>
      <span className="poster-number">{event.date.slice(0, 2)}</span>
      <span className="poster-city">{event.city} / 2026</span>
    </div>
  );
}
