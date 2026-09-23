"use client";
import { useState } from "react";
export default function BarberPhoto({
  name,
  src,
  large = false,
}: {
  name: string;
  src?: string | null;
  large?: boolean;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const initials =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0])
      .join("") || "SC";
  return (
    <span className={`barber-photo${large ? " barber-photo-large" : ""}`}>
      {src && failed !== src ? (
        <img
          src={src}
          alt={`Foto de ${name || "profissional"}`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(src)}
        />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </span>
  );
}
