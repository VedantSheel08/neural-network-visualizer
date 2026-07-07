import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";

const description =
  "vedant sheel trained a neural network and put it in your browser. draw a digit, watch the actual math happen, and poke at every weight yourself.";

export const metadata: Metadata = {
  title: "vedant sheel · neural network",
  description,
  authors: [{ name: "Vedant Sheel" }],
  openGraph: {
    title: "vedant sheel · neural network",
    description,
    siteName: "vedant sheel",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "vedant sheel · neural network",
    description,
  },
};

// runs before paint so a stored theme choice never flashes the wrong mode
const themeInit = `(function(){try{var t=localStorage.getItem("fp-theme");var d=t?t==="dark":true;document.documentElement.classList.toggle("dark",d);}catch(e){document.documentElement.classList.add("dark");}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
