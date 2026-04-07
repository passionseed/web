'use client';

import { useEffect } from 'react';

export default function DiscordRedirect() {
  useEffect(() => {
    window.location.href = 'https://discord.gg/t3tgYRhzj';
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#03050a',
      color: '#91C4E3',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <p>Redirecting to Discord...</p>
    </div>
  );
}