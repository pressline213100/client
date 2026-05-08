import type { Metadata } from 'next';
import { SocketProvider } from '@/context/SocketContext';
import { GameProvider } from '@/context/GameContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'Poker World — 多人撲克遊戲平台',
  description: '支援大老二、橋牌、鬥地主、十三支、德州撲克的多人線上撲克遊戲',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@400;600;700;900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <SocketProvider>
          <GameProvider>
            {children}
          </GameProvider>
        </SocketProvider>
      </body>
    </html>
  );
}
