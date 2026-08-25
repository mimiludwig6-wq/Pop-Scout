import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pop Scout — Emerging Artist Tracker",
  description:
    "A working watchlist of emerging pop artists, filtered down to acts still small enough to sign.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,400;0,500;0,600;0,700;0,900;1,500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <header className="topbar">
          <a className="wordmark" href="#top">
            P O P&nbsp;&nbsp;S C O U T
          </a>
          <nav className="topnav">
            <a href="#filters">Filters</a>
            <a href="#results">Roster</a>
            <a href="#methodology">Methodology</a>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
