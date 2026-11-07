import "./globals.css";
import Link from "next/link";
import { Space_Grotesk, Inter } from "next/font/google";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });

export const metadata = {
  title: "AYneetpyq+ | NEET Practice, Reimagined",
  description: "Timed NEET practice tests with XP, streaks, +4/−1 marking and subject-wise analytics.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <div className="aurora" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <div className="gridbg" aria-hidden="true" />

        <header className="nav">
          <Link href="/" className="brandlink">
            <span className="logo">AY</span>
            <span className="brand">neetpyq<em>+</em></span>
          </Link>
          <nav className="links">
            <Link href="/#tests">Tests</Link>
            <Link href="/#dashboard">Progress</Link>
            <Link href="/#features" className="navcta">Features</Link>
          </nav>
        </header>

        <main className="wrap">{children}</main>

        <footer className="foot">
          <span className="brand">AYneetpyq<em>+</em></span>
          <span className="muted small">Practice smart. Score higher.</span>
        </footer>
      </body>
    </html>
  );
}
