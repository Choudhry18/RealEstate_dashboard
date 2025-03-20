import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Affinius Data Assessment",
  description: "Analytics dashboard for real estate data developed by Choudhry Abdullah",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
      <link href='https://api.mapbox.com/mapbox-gl-js/v3.10.0/mapbox-gl.css' rel='stylesheet' />
      <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <Navbar />
        <main className="flex-grow">
          {children}
        </main>
        <footer className="py-6 text-center text-slate-400 text-sm">
          <p>© {new Date().getFullYear()} Data Assessment submission by Choudhry Abdullah</p>
          <p className="mt-2">
            <a 
              href="https://github.com/Choudhry18/RealEstate_dashboard" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              View Source Code
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}
