"use client";

import { useEffect, useState } from "react";
import { loadCardSize, saveCardSize, type CardSize } from "@/lib/store";

const SIZES: CardSize[] = ["sm", "md", "lg"];
const LABELS = ["Compact", "Comfortable", "Large"];

export function CardSizeSlider({
  value,
  onChange,
}: {
  value?: CardSize;
  onChange?: (size: CardSize) => void;
}) {
  const [size, setSize] = useState<CardSize>(value || "md");

  useEffect(() => {
    if (value) setSize(value);
    else setSize(loadCardSize());
  }, [value]);

  function apply(next: CardSize) {
    setSize(next);
    saveCardSize(next);
    onChange?.(next);
  }

  const index = Math.max(0, SIZES.indexOf(size));

  return (
    <label className="sj-slider-wrap" title={`Card size: ${LABELS[index]}`}>
      <span className="sr-only">Card size</span>
      <input
        type="range"
        className="sj-size-slider"
        min={0}
        max={2}
        step={1}
        value={index}
        aria-label="Card size"
        onInput={(e) => apply(SIZES[Number((e.target as HTMLInputElement).value)] || "md")}
        onChange={(e) => apply(SIZES[Number(e.target.value)] || "md")}
      />
    </label>
  );
}

export function exploreGridClass(size: CardSize) {
  return `playlist-explore-grid pl-size-${size}`;
}
