import Link from "next/link";
import Image from "next/image";
import { Wordmark } from "@/components/brand/Wordmark";

/* Order matches the page: Fields leads because it is the first question a
   visitor asks. */
const NAV_LINKS = [
  { href: "#pathlab-fields", label: "สาย" },
  { href: "#pathlab-portfolio", label: "Port" },
  { href: "#pathlab-journey", label: "Journey" },
  { href: "#pathlab-price", label: "Price" },
  { href: "#pathlab-contact", label: "ติดต่อ" },
] as const;

/**
 * Cream-page top bar: logo home link + in-page anchors. Pathlab hides the
 * global dark MainNav, so this is the way back to / and around the page.
 */
export function PathlabNav() {
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

      <nav className="pathlab-nav__links" aria-label="Pathlab">
        {NAV_LINKS.map((link) => (
          <a key={link.href} href={link.href} className="pathlab-nav__link">
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
