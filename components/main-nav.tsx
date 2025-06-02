import Link from "next/link";
import Image from "next/image";

export function MainNav() {
  return (
    <div className="flex items-center space-x-4 lg:space-x-6">
      <Link href="/" className="flex items-center space-x-2">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/passionseed%20copy-U720vuvkoGUvBE10yQZS4CR9iQqzTX.png"
          alt="Passion Seed Logo"
          width={40}
          height={40}
        />
        <span className="font-bold text-xl">Passion Seed</span>
      </Link>
      <nav className="flex items-center space-x-4 lg:space-x-6">
        <Link
          href="/about"
          className="text-sm font-medium transition-colors hover:text-primary"
        >
          About
        </Link>
        <Link
          href="/workshops"
          className="text-sm font-medium transition-colors hover:text-primary"
        >
          Workshops
        </Link>
        <Link
          href="/communities"
          className="text-sm font-medium transition-colors hover:text-primary"
        >
          Communities
        </Link>
        <Link
          href="/me"
          className="text-sm font-medium transition-colors hover:text-primary"
        >
          My Journey
        </Link>
      </nav>
    </div>
  );
}
