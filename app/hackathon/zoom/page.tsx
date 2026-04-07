'use client';

import { useEffect } from 'react';

export default function ZoomRedirect() {
  useEffect(() => {
    window.location.href = 'https://chula.zoom.us/j/97942452490?pwd=2tnhMgz3rh2baqbxXYItST6M0KegVh.1';
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
      <p>Redirecting to Zoom...</p>
    </div>
  );
}