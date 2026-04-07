'use client';

import { useEffect } from 'react';

export default function GuidebookRedirect() {
  useEffect(() => {
    window.location.href = 'https://f005.backblazeb2.com/file/pseed-dev/hackathon/TNDH+Guidebook.pdf';
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
      <p>Downloading guidebook...</p>
    </div>
  );
}