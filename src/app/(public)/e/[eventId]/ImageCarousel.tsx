"use client";

import { useRef, useEffect, useState, useCallback } from "react";

export default function ImageCarousel({ images, title }: { images: string[]; title: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToIndex = useCallback((index: number) => {
    const container = scrollRef.current;
    if (!container) return;
    const child = container.children[index] as HTMLElement | undefined;
    if (child) {
      container.scrollTo({ left: child.offsetLeft, behavior: "smooth" });
    }
  }, []);

  // Auto-play: advance every 4 seconds
  useEffect(() => {
    if (images.length <= 1) return;
    autoPlayRef.current = setInterval(() => {
      setCurrent((prev) => {
        const next = (prev + 1) % images.length;
        scrollToIndex(next);
        return next;
      });
    }, 4000);
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [images.length, scrollToIndex]);

  // Sync current index on manual scroll
  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) return;
    const scrollLeft = container.scrollLeft;
    const width = container.offsetWidth;
    const index = Math.round(scrollLeft / width);
    setCurrent(index);
    // Reset auto-play on manual interaction
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(() => {
      setCurrent((prev) => {
        const next = (prev + 1) % images.length;
        scrollToIndex(next);
        return next;
      });
    }, 4000);
  };

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {images.map((url, i) => (
          <div
            key={i}
            className="w-full flex-shrink-0 snap-center bg-gray-100 flex justify-center"
          >
            <img
              src={url}
              alt={`${title} ${i + 1}`}
              className="w-full h-auto max-h-[80vh]"
              style={{ objectFit: "contain" }}
            />
          </div>
        ))}
      </div>
      {/* Dots indicator */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                scrollToIndex(i);
                setCurrent(i);
              }}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === current ? "bg-white" : "bg-white/50"
              }`}
              aria-label={`画像 ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
