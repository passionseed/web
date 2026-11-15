"use client";

import { useId, useState, type ChangeEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ACCEPT, MAX_PHOTOS, PhotoPickError } from "@/lib/shift-island/photos";

import { PHOTOS } from "../copy";
import { HintIcon } from "../QuestSections";
import styles from "./photos.module.css";
import { dropPhoto, pickPhoto, type PickedPhoto } from "./upload";

interface PhotoPickerProps {
  photos: PickedPhoto[];
  onChange: (photos: PickedPhoto[]) => void;
  /** How many more the submission can still take (3 minus those already on it). */
  max?: number;
  disabled?: boolean;
  /** Shown above the grid; the written form's own label by default. */
  label?: string;
}

/** The rules first (students meet real people), then up to three thumbnails and the add tile. */
export function PhotoRules() {
  return (
    <div className={styles.rules}>
      <HintIcon name="warn" size={20} />
      <div className={styles.rulesText}>
        <span>{PHOTOS.rulesLead}</span>
        <ul className={styles.ruleList}>
          {PHOTOS.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
        <span>{PHOTOS.crop}</span>
      </div>
    </div>
  );
}

/**
 * Photos for the written form: picked, shrunk in the browser at once (so a
 * phone's 8 MB photo never travels), previewed, and removable before the
 * send. The form uploads them after the written work is saved.
 */
export function PhotoPicker({ photos, onChange, max = MAX_PHOTOS, disabled = false, label = PHOTOS.label }: PhotoPickerProps) {
  const inputId = useId();
  const labelId = useId();
  const [busy, setBusy] = useState(false);
  const room = Math.max(0, max - photos.length);

  async function onPick(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    if (files.length > room) toast.error(PHOTOS.full(max));
    setBusy(true);
    const added: PickedPhoto[] = [];
    for (const file of files.slice(0, room)) {
      try {
        added.push(await pickPhoto(file));
      } catch (error) {
        toast.error(error instanceof PhotoPickError && error.problem === "too_big" ? PHOTOS.tooBig : PHOTOS.unreadable);
      }
    }
    setBusy(false);
    if (added.length) onChange([...photos, ...added]);
  }

  function remove(photo: PickedPhoto) {
    dropPhoto(photo);
    onChange(photos.filter((p) => p.key !== photo.key));
  }

  return (
    <div className={styles.picker} role="group" aria-labelledby={labelId}>
      <p id={labelId} className={styles.heading}>
        <HintIcon name="camera" size={20} />
        <span>{label}</span>
      </p>
      <PhotoRules />
      <ul className={styles.grid}>
        {photos.map((photo, index) => (
          <li key={photo.key} className={styles.thumb}>
            {/* A local preview of the shrunk photo; it is uploaded on send. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.preview} alt={PHOTOS.alt(index + 1)} width={photo.width} height={photo.height} />
            <button
              type="button"
              className={styles.remove}
              onClick={() => remove(photo)}
              disabled={disabled}
              aria-label={PHOTOS.remove(index + 1)}
            >
              ×
            </button>
          </li>
        ))}
        {room > 0 ? (
          <li>
            <label htmlFor={inputId} className={styles.add} data-disabled={disabled || busy ? "true" : undefined}>
              {busy ? (
                <Loader2 className="h-5 w-5 motion-safe:animate-spin" aria-hidden="true" />
              ) : (
                <HintIcon name="camera" size={28} />
              )}
              <span>{busy ? PHOTOS.shrinking : PHOTOS.add}</span>
              <input
                id={inputId}
                className={styles.fileInput}
                type="file"
                accept={ACCEPT}
                multiple
                disabled={disabled || busy}
                onChange={onPick}
              />
            </label>
          </li>
        ) : null}
      </ul>
      <p className={styles.meta}>
        <span className={styles.count}>{PHOTOS.count(photos.length, max)}</span>
      </p>
    </div>
  );
}
