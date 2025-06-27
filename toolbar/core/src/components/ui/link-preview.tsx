'use client';

// Bringing in the essentials: Radix for the hover card, qss for URL params, React, and our utility function.
import * as RdxHoverCard from '@radix-ui/react-hover-card';
import { encode } from 'qss';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '../../utils';

// A little helper hook to figure out the image source, whether it's static or needs fetching from Microlink.
function usePreviewSource(
  url: string,
  width: number,
  height: number,
  quality: number, // Microlink might ignore this for screenshots, but it's here if needed.
  isStatic: boolean,
  staticImageSrc?: string,
) {
  return useMemo(() => {
    if (isStatic) {
      return staticImageSrc || ''; // Just use the provided static image.
    }
    // Build the Microlink URL if we need a dynamic screenshot.
    const params = encode({
      url,
      screenshot: true,
      meta: false,
      embed: 'screenshot.url',
      colorScheme: 'dark', // Looks good in dark mode.
      'viewport.isMobile': true,
      'viewport.deviceScaleFactor': 1,
      'viewport.width': width * 2.5, // Grabbing a higher-res image than displayed for zooming.
      'viewport.height': height * 2.5,
    });
    return `https://api.microlink.io/?${params}`;
  }, [isStatic, staticImageSrc, url, width, height, quality]); // Recalculate only if these change.
}

// This hook handles the hover card's open state and the mouse-following effect for the card itself.
function useHoverState(followMouse: boolean, followAxis: 'x' | 'y' | 'both') {
  const [isPeeking, setPeeking] = useState(false); // Is the card currently visible?
  const [smoothX, setSmoothX] = useState(0); // Smoothed mouse position
  const [smoothY, setSmoothY] = useState(0); // Smoothed mouse position
  const targetXRef = useRef(0); // Target mouse position
  const targetYRef = useRef(0); // Target mouse position
  const animationFrameRef = useRef<number>();

  // Smooth interpolation function
  const smoothFollow = useCallback(() => {
    const lerp = (start: number, end: number, factor: number) =>
      start + (end - start) * factor;
    const lerpFactor = 0.1; // Adjust this for smoothness (0.05 = very smooth, 0.2 = more responsive)

    setSmoothX((current) => lerp(current, targetXRef.current, lerpFactor));
    setSmoothY((current) => lerp(current, targetYRef.current, lerpFactor));

    animationFrameRef.current = requestAnimationFrame(smoothFollow);
  }, []);

  // Start smooth animation when peeking
  useEffect(() => {
    if (isPeeking && followMouse) {
      smoothFollow();
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPeeking, followMouse, smoothFollow]);

  // Tracks the mouse pointer only when the follow effect is enabled.
  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!followMouse) return;
      const target = event.currentTarget;
      const targetRect = target.getBoundingClientRect();

      if (followAxis === 'x' || followAxis === 'both') {
        // Calculate horizontal offset from the center of the trigger element.
        const eventOffsetX = event.clientX - targetRect.left;
        const offsetFromCenterX = (eventOffsetX - targetRect.width / 2) * 0.3; // Multiplier softens the follow effect.
        targetXRef.current = offsetFromCenterX;
      }

      if (followAxis === 'y' || followAxis === 'both') {
        // Calculate vertical offset from the center of the trigger element.
        const eventOffsetY = event.clientY - targetRect.top;
        const offsetFromCenterY = (eventOffsetY - targetRect.height / 2) * 0.3; // Multiplier softens the follow effect.
        targetYRef.current = offsetFromCenterY;
      }
    },
    [followMouse, followAxis], // Effect dependencies.
  );

  // Updates our state when Radix tells us the hover card opened or closed.
  const handleOpenChange = useCallback((open: boolean) => {
    setPeeking(open);
    if (!open) {
      targetXRef.current = 0; // Reset the target position when the card closes.
      targetYRef.current = 0; // Reset the target position when the card closes.
      setSmoothX(0); // Reset the smooth position when the card closes.
      setSmoothY(0); // Reset the smooth position when the card closes.
    }
  }, []); // Effect dependency.

  return {
    isPeeking,
    handleOpenChange,
    handlePointerMove,
    followX: smoothX,
    followY: smoothY,
  };
}

// Defining what properties our HoverPeek component accepts.
type HoverPeekProps = {
  children: React.ReactNode; // What the user actually hovers over (e.g., a link).
  url: string; // The URL for the preview image or the link destination.
  className?: string; // Optional styling for the trigger element.
  peekWidth?: number; // How wide the preview card should be.
  peekHeight?: number; // How tall the preview card should be.
  imageQuality?: number; // Image quality parameter (mainly for potential non-Microlink use).
  enableMouseFollow?: boolean; // Should the card subtly follow the mouse?
  followAxis?: 'x' | 'y' | 'both'; // Which axis should the card follow the mouse on?
  enableLensEffect?: boolean; // Should the magnifying lens appear on hover?
  lensZoomFactor?: number; // How much should the lens magnify?
  lensSize?: number; // How big should the lens circle be?
  side?: 'top' | 'bottom' | 'left' | 'right'; // Which side to position the tooltip
} & ( // This part ensures you provide 'imageSrc' if 'isStatic' is true.
  | { isStatic: true; imageSrc: string }
  | { isStatic?: false; imageSrc?: never }
);

// --- Here's the main component: HoverPeek ---
// It wraps children with a hover trigger that shows a preview card, optionally with a lens effect.
export const HoverPeek = ({
  children,
  url,
  className,
  peekWidth = 200,
  peekHeight = 125,
  imageQuality = 50,
  isStatic = false,
  imageSrc = '',
  enableMouseFollow = true,
  followAxis = 'both',
  enableLensEffect = true, // Lens is on by default.
  lensZoomFactor = 1.75, // A nice default zoom level.
  lensSize = 100, // Default lens diameter in pixels.
  side = 'top', // Default side for the tooltip
}: HoverPeekProps) => {
  // State to track if the preview image failed to load.
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  // Get the actual image URL using our custom hook.
  const finalImageSrc = usePreviewSource(
    url,
    peekWidth,
    peekHeight,
    imageQuality,
    isStatic,
    imageSrc,
  );
  // Get card visibility state and mouse follow handlers from our other hook.
  const { isPeeking, handleOpenChange, handlePointerMove, followX, followY } =
    useHoverState(enableMouseFollow, followAxis);

  // State specifically for the lens effect.
  const [isHoveringLens, setIsHoveringLens] = useState(false); // Is the mouse currently over the preview image area?
  const [lensMousePosition, setLensMousePosition] = useState({ x: 0, y: 0 }); // Mouse coords relative to the image.

  // Little cleanup effects: Reset error if source changes, and reset everything if card closes.
  useEffect(() => {
    setImageLoadFailed(false);
  }, [finalImageSrc]);
  useEffect(() => {
    if (!isPeeking) {
      setImageLoadFailed(false);
      setIsHoveringLens(false); // Important to reset lens state when card hides.
    }
  }, [isPeeking]);

  // Handlers for mouse events *within* the preview image area to control the lens.
  const handleLensMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!enableLensEffect) return; // Only track if lens is enabled.
    const rect = e.currentTarget.getBoundingClientRect();
    // Calculate mouse position relative to the top-left of the image container (the <a> tag).
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setLensMousePosition({ x, y });
  };
  const handleLensMouseEnter = () => {
    if (enableLensEffect) setIsHoveringLens(true);
  };
  const handleLensMouseLeave = () => {
    if (enableLensEffect) setIsHoveringLens(false);
  };

  // Prepare the trigger element. We use React.cloneElement to pass down props (like className and mouse handlers)
  // correctly, especially when the child might already have its own className.
  const triggerChild = React.isValidElement(children) ? (
    React.cloneElement(children as React.ReactElement<any>, {
      className: cn((children.props as any).className, className), // Merge classes nicely.
      onPointerMove: handlePointerMove, // Attach the card's follow handler.
    })
  ) : (
    <span className={className} onPointerMove={handlePointerMove}>
      {children}
    </span>
  ); // Fallback if children isn't a valid element.

  return (
    // The main Radix Hover Card component.
    <RdxHoverCard.Root
      openDelay={75} // How long to wait before showing the card.
      closeDelay={150} // How long to wait before hiding after mouse leaves.
      onOpenChange={handleOpenChange} // Connects Radix state to our hook.
    >
      {/* The element the user actually hovers over. 'asChild' merges props onto our prepared triggerChild. */}
      <RdxHoverCard.Trigger asChild>{triggerChild}</RdxHoverCard.Trigger>

      {/* Portal ensures the card floats above other content correctly. */}
      <RdxHoverCard.Portal>
        {/* The content container for the card. */}
        <RdxHoverCard.Content
          // We need perspective for the 3D rotation effect to look right. Origin set to center for the flip.
          className="z-[10000] [--radix-hover-card-content-transform-origin:center_center] [perspective:800px]"
          side={side} // Position card above the trigger.
          align="center" // Align center horizontally.
          sideOffset={12} // A little gap between trigger and card.
          // This is a bit tricky: if the lens is on, we disable pointer events on the *wrapper*
          // so that hover events are only detected on the link/image inside it for the lens effect.
          style={{
            pointerEvents: enableLensEffect ? 'none' : 'auto',
            opacity: 1,
          }}
        >
          {/* No animations - just show/hide based on isPeeking */}
          {isPeeking && (
            // Simple div for the card (handles mouse follow only, no animations).
            <div
              style={{
                transform: `translate(${enableMouseFollow && (followAxis === 'x' || followAxis === 'both') ? followX : 0}px, ${enableMouseFollow && (followAxis === 'y' || followAxis === 'both') ? followY : 0}px)`,
                pointerEvents: 'auto',
                // Ensure the preview is fully opaque regardless of external styles
                opacity: 1,
              }}
            >
              {/* The link wrapping the preview image. It also acts as the lens trigger area. */}
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  position: 'relative',
                  display: 'block',
                  overflow: 'hidden',
                  borderRadius: '0.5rem', // rounded-lg
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb', // border-gray-200
                  boxShadow:
                    '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', // shadow-lg
                  width: peekWidth,
                  height: peekHeight,
                  transition: 'box-shadow 0.15s ease-in-out',
                  opacity: 1, // Force full opacity
                }}
                // Attach lens handlers here.
                onMouseEnter={handleLensMouseEnter}
                onMouseLeave={handleLensMouseLeave}
                onMouseMove={handleLensMouseMove}
              >
                {/* Display either the loaded image or a fallback if loading failed. */}
                {imageLoadFailed ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#f3f4f6',
                      color: '#6b7280',
                      fontSize: '0.75rem',
                      width: peekWidth,
                      height: peekHeight,
                    }}
                  >
                    Preview unavailable
                  </div>
                ) : (
                  // The base preview image.
                  <img
                    src={finalImageSrc}
                    alt={`Link preview for ${url}`}
                    onError={() => setImageLoadFailed(true)}
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '0.5rem', // rounded-lg
                      display: 'block',
                    }}
                  />
                )}

                {/* --- Magnifying Lens Layer --- */}
                {/* This only appears if the lens is enabled, the user is hovering over the link, and the image hasn't failed. */}
                {enableLensEffect && isHoveringLens && !imageLoadFailed && (
                  // The lens container itself.
                  <div
                    style={{
                      position: 'absolute',
                      inset: '0',
                      pointerEvents: 'none',
                      overflow: 'hidden',
                      borderRadius: '0.5rem', // rounded-lg
                      // This is the magic: Use a radial gradient as a mask to create the circular lens shape.
                      maskImage: `radial-gradient(circle ${lensSize / 2}px at ${lensMousePosition.x}px ${lensMousePosition.y}px, black ${lensSize / 2}px, transparent ${lensSize / 2}px)`,
                      WebkitMaskImage: `radial-gradient(circle ${lensSize / 2}px at ${lensMousePosition.x}px ${lensMousePosition.y}px, black ${lensSize / 2}px, transparent ${lensSize / 2}px)`,
                    }}
                  >
                    {/* Inside the masked area, this div holds the scaled-up image. */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: '0',
                        transform: `scale(${lensZoomFactor})`,
                        transformOrigin: `${lensMousePosition.x}px ${lensMousePosition.y}px`,
                      }}
                    >
                      {/* The magnified image itself - needs the same source and dimensions as the base image. */}
                      <img
                        src={finalImageSrc}
                        alt=""
                        aria-hidden="true"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: '0.5rem', // rounded-lg
                          display: 'block',
                          backgroundColor: '#f9fafb',
                        }}
                      />
                    </div>
                  </div>
                )}
              </a>
            </div>
          )}
        </RdxHoverCard.Content>
      </RdxHoverCard.Portal>
    </RdxHoverCard.Root>
  );
};
