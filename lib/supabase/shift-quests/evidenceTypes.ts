/** A photo the browser can show (schema 14): a short-lived signed link, never a Storage path. Client-safe. */
export interface EvidencePhotoView {
  id: string;
  url: string;
  width: number;
  height: number;
}
