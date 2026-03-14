import type { Metadata } from 'next'
import React from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'AquaAI — Marine Ecosystem Intelligence',
  description: 'AI-powered marine species and coral health analysis using Amazon Nova',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        <div
          className="min-h-screen relative"
          style={{
            background: 'linear-gradient(160deg, #000d1a 0%, #001a2e 40%, #00111f 70%, #000a14 100%)',
          }}
        >
          {/* Fixed deep sea background image with heavy dark overlay */}
          <div
            className="fixed inset-0 -z-10 opacity-20"
            style={{
              backgroundImage: "url('https://png.pngtree.com/thumb_back/fh260/background/20251124/pngtree-sunlit-coral-reef-teeming-with-fish-in-turquoise-waters-image_20574020.webp')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundAttachment: 'fixed',
              filter: 'saturate(0.4) brightness(0.3)',
            }}
          />

          <div className="relative z-10 min-h-screen">
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}