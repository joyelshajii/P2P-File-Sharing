// Cryptographic utilities using native Web Crypto API (SHA-256)

/**
 * Computes the SHA-256 hash of an ArrayBuffer or Uint8Array.
 * Returns a 64-character lowercase hex string.
 */
export async function computeSHA256(data: ArrayBuffer | Uint8Array): Promise<string> {
  // If data is Uint8Array, pass its buffer or slice
  let buffer: ArrayBuffer;
  if (data instanceof Uint8Array) {
    // Check if buffer slice is needed
    if (data.byteOffset === 0 && data.byteLength === data.buffer.byteLength) {
      buffer = data.buffer as ArrayBuffer;
    } else {
      buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
    }
  } else {
    buffer = data;
  }

  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Truncates a SHA-256 hash for compact terminal display (e.g. "a3f5...9b2c")
 */
export function formatShortHash(hash: string, chars = 8): string {
  if (!hash || hash.length <= chars * 2) return hash;
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
}

/**
 * Formats byte counts into human-readable strings (B, KiB, MiB, GiB)
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Formats transfer speeds into human-readable strings (e.g. "1.45 MiB/s")
 */
export function formatSpeed(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec)}/s`;
}

/**
 * Formats seconds into MM:SS or HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return '--:--';
  const s = Math.round(seconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${hrs}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
