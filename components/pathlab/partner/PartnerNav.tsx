import Link from "next/link";
import Image from "next/image";
import { PARTNER_NAV_LINKS } from "@/lib/content/pathlab-partner";
import { Wordmark } from "@/components/brand/Wordmark";

/**
 * Cream-page top bar for the EE co-creator pitch: logo home link plus
 * in-page anchors. Same construction as PathlabNav; /pathlab/* routes hide
 * the global MainNav, so this is the way back to / and around the page.
 */
export function PartnerNav() {
  return (
    <header className="pathlab-nav">
      <Link href="/" className="pathlab-nav__brand" aria-label="Passion Seed home">
        <Image
          src="/passionseed-logo.svg"
          alt=""
          width={36}
          height={36}
          priority
          className="pathlab-nav__logo"
        />
        <Wordmark className="pathlab-nav__name" />
      </Link>

      <nav className="pathlab-nav__links" aria-label="Pathlab Partner">
        {PARTNER_NAV_LINKS.map((link) => (
          <a key={link.href} href={link.href} className="pathlab-nav__link">
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
