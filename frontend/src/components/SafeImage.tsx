'use client';

import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { API_URL } from '@/lib/api';

interface Props {
  src: string;
  alt: string;
  className?: string;
  fallbackIcon?: boolean;
}

export default function SafeImage({ src, alt, className, fallbackIcon }: Props) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!src || error) {
    return (
      <div className={`flex items-center justify-center bg-[var(--bg-tertiary)] ${className}`}>
        {fallbackIcon ? <ImageOff size={20} className="text-[var(--text-muted)] opacity-40" /> : null}
      </div>
    );
  }

  const proxiedSrc = `${API_URL}/api/image-proxy?url=${encodeURIComponent(src)}`;

  return (
    <>
      {!loaded && (
        <div className={`absolute inset-0 bg-[var(--bg-tertiary)] animate-pulse ${className || ''}`} />
      )}
      <img
        src={proxiedSrc}
        alt={alt}
        className={className}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        style={{ display: loaded ? 'block' : 'none' }}
      />
    </>
  );
}
