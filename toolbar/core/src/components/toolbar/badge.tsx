import { X } from 'lucide-react';
import React, { useCallback, useState } from 'react';

interface BadgeProps {
  title: string;
  imgSrc?: string;
  icon?: React.ReactElement;
  onDelete?: () => void;
  className?: string;
  onClick?: () => void;
}

export function Badge({
  title,
  imgSrc,
  icon,
  onDelete,
  className = '',
  onClick,
}: BadgeProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const isDeletable = Boolean(onDelete);

  const handleImageError = useCallback(() => {
    setHasImageError(true);
  }, []);

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete?.();
    },
    [onDelete],
  );

  return (
    <div className="relative">
      <button
        className={`inline-flex items-center gap-1 p-1 text-xs bg-background hover:bg-background/80 border-[0.5px] border-muted-foreground/30 rounded-md transition-all group ${className}`}
        onClick={onClick}
      >
        {/* Image/Icon with hover delete icon when deletable */}
        <div className="relative w-4 h-4 rounded flex items-center justify-center flex-shrink-0">
          {/* Main image or icon - always shown */}
          {imgSrc && !hasImageError ? (
            <img
              src={imgSrc}
              alt={title}
              className={`w-full h-full object-cover rounded transition-opacity ${
                isDeletable ? 'group-hover:opacity-0' : ''
              }`}
              onError={handleImageError}
              loading="lazy"
            />
          ) : icon ? (
            <div
              className={`w-full h-full flex items-center justify-center transition-opacity ${
                isDeletable ? 'group-hover:opacity-0' : ''
              }`}
            >
              {React.cloneElement(icon, { className: 'w-3 h-3' })}
            </div>
          ) : (
            <div
              className={`w-full h-full bg-muted-foreground/30 rounded transition-opacity ${
                isDeletable ? 'group-hover:opacity-0' : ''
              }`}
            />
          )}

          {/* Delete X icon - shown only on hover when deletable */}
          {isDeletable && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div
                onClick={handleDelete}
                className="w-full h-full flex items-center justify-center text-foreground/50 hover:text-foreground hover:brightness-110 transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </div>
            </div>
          )}
        </div>

        {/* Title */}
        <span>{title}</span>
      </button>
    </div>
  );
}
