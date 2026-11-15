"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { loadEvidencePhotos, removeEvidencePhoto, type QuestPhotos as QuestPhotoSet } from "@/app/shift/island/evidence-actions";
import { MAX_PHOTOS } from "@/lib/shift-island/photos";

import { COMMON, PHOTOS } from "../copy";
import island from "../island.module.css";
import { HintIcon } from "../QuestSections";
import { PhotoPicker } from "./PhotoPicker";
import styles from "./photos.module.css";
import { uploadPhotos, type PickedPhoto } from "./upload";

type Load = { state: "loading" } | { state: "error" } | { state: "ready"; set: QuestPhotoSet | null };

/**
 * รูปที่แนบ on a quest page: the photos of the quest's latest submission, for
 * whoever the database lets see them (short-lived links, never paths). While
 * a mentor has not looked yet, the submitter can take one back or add more
 * (up to three), which is also how a photo that failed during the send gets
 * another try. Shows nothing when there is nothing to show.
 */
export function QuestPhotos({ instanceId, own }: { instanceId: string; own: boolean }) {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [picked, setPicked] = useState<PickedPhoto[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reload = useCallback(async () => {
    const result = await loadEvidencePhotos({ instanceId }).catch(() => null);
    setLoad(result?.ok ? { state: "ready", set: result.data } : { state: "error" });
  }, [instanceId]);

  useEffect(() => {
    let live = true;
    loadEvidencePhotos({ instanceId })
      .then((result) => {
        if (live) setLoad(result.ok ? { state: "ready", set: result.data } : { state: "error" });
      })
      .catch(() => {
        if (live) setLoad({ state: "error" });
      });
    return () => {
      live = false;
    };
  }, [instanceId]);

  if (load.state === "loading") {
    return (
      <p className={island.hint} aria-live="polite">
        {PHOTOS.loading}
      </p>
    );
  }
  if (load.state === "error") return <p className={island.hint}>{PHOTOS.loadFailed}</p>;
  const set = load.set;
  const editable = own && set?.status === "pending";
  if (!set || (set.photos.length === 0 && !editable)) return null;
  const room = Math.max(0, MAX_PHOTOS - set.photos.length);

  function remove(photoId: string) {
    startTransition(async () => {
      const result = await removeEvidencePhoto({ photoId });
      if (!result.ok) toast.error(result.error || COMMON.failed);
      await reload();
    });
  }

  function sendMore() {
    if (!set || picked.length === 0) return;
    const submissionId = set.submissionId;
    const batch = picked;
    startTransition(async () => {
      setProgress(PHOTOS.uploading(0, batch.length));
      const outcome = await uploadPhotos(submissionId, batch, (done) => setProgress(PHOTOS.uploading(done, batch.length)));
      setProgress(null);
      if (outcome.failed > 0) toast.error(outcome.error || COMMON.failed);
      setPicked([]);
      await reload();
    });
  }

  return (
    <section className={styles.strip} aria-label={PHOTOS.heading}>
      <h3 className={styles.heading}>
        <HintIcon name="camera" size={20} />
        <span>{PHOTOS.heading}</span>
      </h3>
      {set.photos.length > 0 ? (
        <ul className={styles.grid}>
          {set.photos.map((photo, index) => (
            <li key={photo.id} className={styles.thumb}>
              <a className={styles.thumbLink} href={photo.url} target="_blank" rel="noopener noreferrer" aria-label={PHOTOS.open(index + 1)}>
                {/* Signed, short-lived links from a private bucket: no image optimizer in between. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={PHOTOS.alt(index + 1)} width={photo.width} height={photo.height} loading="lazy" />
              </a>
              {editable ? (
                <button
                  type="button"
                  className={styles.remove}
                  onClick={() => remove(photo.id)}
                  disabled={pending}
                  aria-label={PHOTOS.remove(index + 1)}
                >
                  ×
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {editable ? <p className={island.hint}>{PHOTOS.waiting}</p> : null}
      {editable && room > 0 ? (
        <>
          <PhotoPicker photos={picked} onChange={setPicked} max={room} disabled={pending} label={PHOTOS.addMore} />
          {picked.length > 0 ? (
            <button type="button" className={island.quietButton} onClick={sendMore} disabled={pending} aria-busy={pending}>
              {pending ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : <HintIcon name="send" size={16} />}
              <span>{progress ?? PHOTOS.addMore}</span>
            </button>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
