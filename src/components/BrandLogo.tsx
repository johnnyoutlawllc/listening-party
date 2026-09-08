"use client";

import Image from "next/image";

export function BrandLogo({
  showTagline = true,
  size = 44,
}: {
  showTagline?: boolean;
  size?: number;
}) {
  return (
    <span className="brand-lockup">
      <span className="brand-mark" style={{ width: size, height: size }}>
        <Image
          src="/logo-mark.png"
          alt=""
          width={size}
          height={size}
          priority
          className="brand-mark-img"
        />
      </span>
      <span className="brand-copy">
        <span className="brand-wordmark">
          listening<span className="brand-light">party</span>
          <span className="brand-period">.stream</span>
        </span>
        {showTagline && <span className="brand-tagline">JOIN THE LISTENING PARTY</span>}
      </span>
    </span>
  );
}

export function BrandMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-mark.png"
      alt=""
      width={size}
      height={size}
      className={`brand-mark-img ${className}`}
    />
  );
}
