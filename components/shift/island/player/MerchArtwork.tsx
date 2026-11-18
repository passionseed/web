import Image from "next/image";

import styles from "./player.module.css";

/** The adjacent product name labels the artwork, so it is decorative here. */
export function MerchArtwork({ src }: { src: string }) {
  return (
    <div className={styles.merchArtwork}>
      <Image src={src} alt="" width={1536} height={1024} sizes="(max-width: 600px) 90vw, 480px" />
    </div>
  );
}
