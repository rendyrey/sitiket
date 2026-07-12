import Image from "next/image";
import type { EventItem } from "@/data/events";

type EventPosterProps = {
  className?: string;
  event: EventItem;
};

export default function EventPoster({ className = "", event }: EventPosterProps) {
  if (event.image) {
    return (
      <div className={`relative overflow-hidden bg-black ${className}`}>
        <Image
          fill
          src={event.image}
          alt={`${event.title} poster`}
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`event-poster poster-${event.theme} ${className}`}
      aria-label={`${event.title} event artwork`}
    >
      <div className="poster-grid" />
      <span className="poster-kicker">SiTIKET presents</span>
      <div className="poster-title">
        {event.title.split(" ").map((word) => <span key={word}>{word}</span>)}
      </div>
      <span className="poster-number">{event.date.slice(0, 2)}</span>
      <span className="poster-city">{event.city} / 2026</span>
    </div>
  );
}
