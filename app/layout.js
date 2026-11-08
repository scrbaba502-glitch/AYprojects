
import "./globals.css";
import CinematicIntro from "../components/CinematicIntro";
import Link from "next/link";
import ReplayIntro from "../components/ReplayIntro";
import { Cormorant_Garamond, Inter } from "next/font/google";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata = {
  title: "AYneetPYQ+ | NEET Practice, Reimagined",
  description:
    "A premium NEET preparation platform with previous-year questions, mock tests and progress tracking.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <CinematicIntro />

        <div className="aurora" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>

        <div className="gridbg" aria-hidden="true" />

        <header className="nav">
          <Link href="/" className="brandlink">
            <span className="logo">A²</span>
            <span className="brand">
              AYneetPYQ<em>+</em>
            </span>
          </Link>

          <nav className="links">
            <Link href="/pyq">PYQs</Link>
            <Link href="/#tests">Tests</Link>
            <Link href="/#dashboard">Progress</Link>
            <Link href="/#features" className="navcta">
              Features
            </Link>
          </nav>
        </header>

        <main className="wrap">{children}</main>

        <footer className="foot">
          <span className="brand">
            AYneetPYQ<em>+</em>
          </span>

          <span className="muted small">
            Practice smart. Score higher.
          </span>

          <ReplayIntro />
        </footer>
      </body>
    </html>
  );
}
