"use client";

import { memo, useEffect, useRef, useState, type CSSProperties, type Ref } from "react";
import { getLinkIcon, POSTER_WIDTH, type PosterDocument } from "@/lib/poster";
import { cn } from "@/lib/utils";

export const PosterCanvas = memo(function PosterCanvas({
  document,
  posterRef,
}: {
  document: PosterDocument;
  posterRef?: Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={posterRef}
      data-testid="poster"
      className="poster"
      style={{ width: POSTER_WIDTH }}
      aria-label={`Axolotl Launcher ${document.version} 更新日志海报`}
    >
      <div className="poster-halftone" aria-hidden="true" />
      <header className="poster-header">
        <img src="/template/header-watermark.svg" alt="" className="poster-header-watermark" width={568} height={167} />
        <img src="/template/brand.svg" alt="Axolotl Launcher" className="poster-brand" width={568} height={101} />
        <div className="poster-banner-row">
          <div className="poster-banner">
            <div className={cn("poster-version", document.version.length > 8 && "poster-version-long")}>{document.version}</div>
            <div className="poster-banner-copy">
              <h2>{document.title}</h2>
              <p>{document.subtitle}</p>
              <span className="poster-channel">{document.channel}</span>
            </div>
          </div>
          <div className="poster-website"><span>启动器下载</span><strong>{document.website}</strong></div>
        </div>
      </header>

      <div className="poster-sections">
        {document.sections.map((section, index) => {
          const imageLeft = section.imagePosition === "left" || (section.imagePosition === "auto" && index % 2 === 1);
          return (
            <section className="poster-section" key={section.id}>
              <span className="poster-category">{section.category}</span>
              <div
                className={cn("poster-feature", imageLeft && "poster-feature-reversed", !section.image && "poster-feature-text")}
                data-poster-section={section.id}
              >
                <div className="poster-feature-copy">
                  <div>
                    {section.eyebrow && <p className="poster-eyebrow">{section.eyebrow}</p>}
                    {section.title && <h3 className="poster-feature-title">{section.title}</h3>}
                    {section.description && <p className="poster-description">{section.description}</p>}
                  </div>
                  {document.showWatermark && <img src="/template/watermark.svg" className="poster-watermark" alt="" width={130} height={48} />}
                </div>
                {section.image && (
                  <div className="poster-feature-media">
                    <img
                      src={section.image}
                      alt={section.title || section.eyebrow || "更新配图"}
                      width={1240}
                      height={693}
                      style={{ objectFit: section.imageFit }}
                      decoding="sync"
                    />
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {document.showFooter && (
        <footer className="poster-footer">
          <img src="/template/footer-watermark.svg" alt="" className="poster-footer-watermark" width={568} height={333} />
          <h3>{document.footerTitle}</h3>
          <div className="poster-footer-columns">
            <dl className="poster-links">
              {document.links.map((link) => {
                const icon = getLinkIcon(link);
                return (
                  <div key={link.id} className="poster-link">
                    <dt>{link.label}{link.label ? ":" : ""}</dt>
                    <dd>
                      {icon.src && <img src={icon.src} alt="" className="poster-link-icon" width={16} height={16} />}
                      <span className="poster-link-value">{link.value}</span>
                    </dd>
                  </div>
                );
              })}
            </dl>
            <p className="poster-disclaimer">{document.disclaimer}</p>
          </div>
        </footer>
      )}
    </div>
  );
});

export function ScaledPoster({
  document,
  className,
  posterRef,
  onHeightChange,
  maxWidth = POSTER_WIDTH,
}: {
  document: PosterDocument;
  className?: string;
  posterRef?: Ref<HTMLDivElement>;
  onHeightChange?: (height: number) => void;
  maxWidth?: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 1854 });

  useEffect(() => {
    const outer = container.current;
    const content = inner.current;
    if (!outer || !content) return;
    const observer = new ResizeObserver(() => {
      const width = Math.min(outer.clientWidth, maxWidth);
      const height = content.scrollHeight;
      setSize((previous) => previous.width === width && previous.height === height ? previous : { width, height });
      onHeightChange?.(height);
    });
    observer.observe(outer);
    observer.observe(content);
    return () => observer.disconnect();
  }, [maxWidth, onHeightChange]);

  const scale = size.width / POSTER_WIDTH;
  return (
    <div ref={container} className={cn("w-full min-w-0", className)}>
      <div className="mx-auto" style={{ width: size.width || "100%", height: size.height * scale }}>
        <div ref={inner} style={{
          width: POSTER_WIDTH,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          visibility: size.width ? "visible" : "hidden",
        } as CSSProperties}>
          <PosterCanvas document={document} posterRef={posterRef} />
        </div>
      </div>
    </div>
  );
}
