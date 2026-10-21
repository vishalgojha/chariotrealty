"use client";

import { useState, useEffect, useRef } from "react";
import { CloseIcon, ChevronLeftIcon, ChevronRightIcon } from "./icons";

type MediaItem = { url: string; type: "image" | "video" };

export function Gallery({ media, name }: { media: MediaItem[]; name: string }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadedUrls, setLoadedUrls] = useState<Set<string>>(() => new Set());
  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set());
  const touchStartRef = useRef<number | null>(null);

  const total = media.length;
  const current = media[currentIndex];
  const currentLoaded = Boolean(current && loadedUrls.has(current.url));
  const currentFailed = Boolean(current && failedUrls.has(current.url));

  useEffect(() => {
    let cancelled = false;
    media.forEach((item) => {
      const image = new window.Image();
      image.onload = () => {
        if (!cancelled) setLoadedUrls((urls) => new Set(urls).add(item.url));
      };
      image.onerror = () => {
        if (!cancelled) setFailedUrls((urls) => new Set(urls).add(item.url));
      };
      image.src = item.url;
    });
    return () => { cancelled = true; };
  }, [media]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!lightboxOpen) return;
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowLeft") setCurrentIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setCurrentIndex((i) => Math.min(total - 1, i + 1));
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxOpen, total]);

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    document.body.style.overflow = "unset";
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartRef.current;
    if (delta < -40) setCurrentIndex((i) => Math.min(total - 1, i + 1));
    if (delta > 40) setCurrentIndex((i) => Math.max(0, i - 1));
    touchStartRef.current = null;
  };

  if (!media.length) return null;

  return (
    <>
      <div className="gallery-main">
        {media.length === 1 ? (
          <div
            className={`gallery-main-slide ${currentLoaded ? "is-loaded" : "is-loading"}`}
            onClick={() => openLightbox(0)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && openLightbox(0)}
          >
            <img src={media[0].url} alt={name} className="gallery-img" onLoad={() => setLoadedUrls((urls) => new Set(urls).add(media[0].url))} onError={() => setFailedUrls((urls) => new Set(urls).add(media[0].url))} />
          </div>
        ) : (
          <div className={`gallery-main-slide ${currentLoaded ? "is-loaded" : "is-loading"}`}>
            {currentFailed ? <div className="gallery-image-error">Photo unavailable</div> : <img src={current?.url || ""} alt={name} className="gallery-img" onLoad={() => current && setLoadedUrls((urls) => new Set(urls).add(current.url))} onError={() => current && setFailedUrls((urls) => new Set(urls).add(current.url))} />}
            <button className="gallery-lightbox-trigger" onClick={() => openLightbox(currentIndex)}>
              <div className="gallery-counter">{`${currentIndex + 1}/${total}`}</div>
            </button>
            {media.length > 1 && (
              <>
                <button className="gallery-nav gallery-prev" onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}>
                  <ChevronLeftIcon size={24} />
                </button>
                <button className="gallery-nav gallery-next" onClick={() => setCurrentIndex((i) => Math.min(total - 1, i + 1))}>
                  <ChevronRightIcon size={24} />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="gallery-thumbnails">
        {media.map((item, index) => (
          <button
            key={item.url}
            type="button"
            className={`gallery-thumb ${index === currentIndex ? "active" : ""}`}
            onClick={() => setCurrentIndex(index)}
            aria-label={`Photo ${index + 1} of ${total}`}
          >
            <img src={item.url} alt={`Photo ${index + 1}`} className="gallery-thumb-img" loading="lazy" />
          </button>
        ))}
      </div>

      {lightboxOpen && (
        <div className="gallery-lightbox-overlay" onClick={closeLightbox} role="dialog" aria-label={`Lightbox: ${name}`}>
          <div className="gallery-lightbox" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <button className="gallery-lightbox-close" onClick={closeLightbox} aria-label="Close">
              <CloseIcon size={20} />
            </button>
            {current?.type === "video" ? (
              <video key={current.url} src={current.url} muted loop autoPlay controls />
            ) : (
              <img src={current?.url || ""} alt={name} className="gallery-lightbox-img" />
            )}
            {total > 1 && (
              <>
                <button className="gallery-lightbox-nav gallery-prev" onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}>
                  <ChevronLeftIcon size={28} />
                </button>
                <button className="gallery-lightbox-nav gallery-next" onClick={() => setCurrentIndex((i) => Math.min(total - 1, i + 1))}>
                  <ChevronRightIcon size={28} />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
