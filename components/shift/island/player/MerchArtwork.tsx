import Image from "next/image";

import styles from "./player.module.css";

/** The adjacent product name labels the artwork, so it is decorative here. */
export function MerchArtwork({ src, portrait = false, className }: { src: string; portrait?: boolean; className?: string }) {
  return (
    <div className={className ?? `${styles.merchArtwork} ${portrait ? styles.merchArtworkPortrait : ""}`}>
      <Image src={src} alt="" width={portrait ? 1024 : 1536} height={portrait ? 1536 : 1024} sizes={className ? "128px" : "(max-width: 600px) 90vw, 480px"} />
    </div>
  );
}
