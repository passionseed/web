export function generateMockStats(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  
  const normalize = (val: number) => Math.abs((val % 100) / 100);
  
  return {
    danceability: 0.4 + (normalize(hash) * 0.5), // 0.4 - 0.9
    energy: 0.4 + (normalize(hash >> 1) * 0.5),
    valence: 0.3 + (normalize(hash >> 2) * 0.6),
    tempo: 90 + (normalize(hash >> 3) * 60),
  };
}
