"use client";
import { useEffect, useRef, useState } from "react";
import BarberPhoto from "./barber-photo";
import { PHOTO_LIMIT } from "@/lib/photos";
export default function PhotoEditor({
  name,
  src,
  file,
  onFile,
  onRemove,
  disabled,
  onChecking,
}: {
  name: string;
  src?: string | null;
  file: File | null;
  onFile: (f: File | null) => void;
  onRemove: () => void;
  disabled: boolean;
  onChecking: (v: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );
  return (
    <div className="photo-editor">
      <BarberPhoto name={name} src={preview || src} />
      <div className="photo-editor-controls">
        <label htmlFor="barber-photo-file" className="field-label">
          Foto do profissional <span className="optional-label">opcional</span>
        </label>
        <p id="photo-help">
          Aparece no site e no agendamento. Use um retrato com o rosto
          centralizado, em JPG, PNG ou WebP, até 5 MB.
        </p>
        <button
          type="button"
          className="action photo-pick"
          disabled={disabled || checking}
          onClick={() => input.current?.click()}
        >
          {file || src ? "Trocar foto" : "Escolher foto"}
        </button>
        <input
          className="photo-file-input"
          tabIndex={-1}
          id="barber-photo-file"
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-describedby="photo-help"
          disabled={disabled || checking}
          onChange={async (e) => {
            const chosen = e.target.files?.[0];
            e.target.value = "";
            if (!chosen) return;
            setError("");
            if (
              !["image/jpeg", "image/png", "image/webp"].includes(
                chosen.type,
              ) ||
              chosen.size > PHOTO_LIMIT ||
              !chosen.size
            ) {
              setError("Escolha uma imagem JPG, PNG ou WebP de até 5 MB.");
              return;
            }
            const seq = ++request.current;
            setChecking(true);
            onChecking(true);
            const url = URL.createObjectURL(chosen);
            try {
              const image = new Image();
              image.src = url;
              await image.decode();
              if (seq === request.current) onFile(chosen);
            } catch {
              if (seq === request.current)
                setError(
                  "Não conseguimos abrir essa imagem. Escolha outro arquivo.",
                );
            } finally {
              URL.revokeObjectURL(url);
              if (seq === request.current) {
                setChecking(false);
                onChecking(false);
              }
            }
          }}
        />
        {checking && <p role="status">Conferindo imagem…</p>}
        {file && (
          <p className="photo-file-name">
            {file.name} · A foto será publicada ao salvar.
          </p>
        )}
        {(file || src) && (
          <button
            type="button"
            className="mini-button"
            disabled={disabled || checking}
            onClick={() => {
              setError("");
              onRemove();
            }}
          >
            Remover foto
          </button>
        )}
        {error && (
          <p className="photo-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
