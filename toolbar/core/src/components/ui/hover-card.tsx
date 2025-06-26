import { useState, useRef, useEffect } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import type { ComponentChildren } from 'preact';

interface HoverCardProps {
  children: ComponentChildren;
  content: {
    name: string;
    preview_url?: string;
  };
  disabled?: boolean;
}

export function HoverCard({
  children,
  content,
  disabled = false,
}: HoverCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const cardWidth = 240;
    const cardHeight = 180;

    let x = rect.left + rect.width / 2 - cardWidth / 2;
    let y = rect.top - cardHeight - 8;

    // Adjust if card goes outside viewport
    if (x < 8) x = 8;
    if (x + cardWidth > window.innerWidth - 8) {
      x = window.innerWidth - cardWidth - 8;
    }
    if (y < 8) {
      y = rect.bottom + 8;
    }

    setPosition({ x, y });
  };

  const handleMouseEnter = () => {
    if (disabled) return;
    updatePosition();
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  useEffect(() => {
    if (isVisible) {
      const handleScroll = () => setIsVisible(false);
      const handleResize = () => setIsVisible(false);

      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isVisible]);

  const card = isVisible && content.preview_url && (
    <div
      ref={cardRef}
      className="fixed z-[9999] w-60 rounded-lg border border-gray-200 bg-white shadow-lg"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        pointerEvents: 'none',
      }}
    >
      <div className="relative overflow-hidden rounded-lg">
        <img
          src={content.preview_url}
          alt={`Preview for ${content.name}`}
          className="h-36 w-full object-cover"
          loading="lazy"
        />
        <div className="absolute right-0 bottom-0 left-0 bg-black/75 px-3 py-2 text-sm text-white backdrop-blur-sm">
          {content.name}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ display: 'contents' }}
      >
        {children}
      </div>
      {typeof window !== 'undefined' && createPortal(card, document.body)}
    </>
  );
}
