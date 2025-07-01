import { Select as SelectBase, type SelectProps } from '@headlessui/react';
import { cn } from '@/utils';
import * as React from 'react';
import { ChevronDown } from 'lucide-react';

export function Select(props: SelectProps) {
  return (
    <SelectBase
      {...props}
      className={cn(
        'h-8 rounded-lg bg-muted/50 backdrop-saturate-150',
        props.className,
      )}
    />
  );
}

export interface SelectPropsNative
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
  dynamicWidth?: boolean;
}

const SelectNative = React.forwardRef<HTMLSelectElement, SelectPropsNative>(
  ({ className, children, dynamicWidth = false, ...props }, ref) => {
    const [width, setWidth] = React.useState<number | undefined>(undefined);
    const measurer = React.useRef<HTMLSpanElement>(null);
    const selectRef = React.useRef<HTMLSelectElement>(null);

    // Get selected text for width measurement
    const getSelectedText = React.useCallback(() => {
      const selectElement = selectRef.current;
      if (!selectElement) return '';

      const selectedOption = selectElement.options[selectElement.selectedIndex];
      return selectedOption ? selectedOption.text : '';
    }, []);

    // Update width based on selected text
    const updateWidth = React.useCallback(() => {
      if (!dynamicWidth || !measurer.current) return;

      const selectedText = getSelectedText();
      if (!selectedText) return;

      // Update measurer text and measure width
      measurer.current.textContent = selectedText;

      // Use setTimeout to ensure the text is updated in DOM before measuring
      setTimeout(() => {
        if (measurer.current && selectRef.current) {
          const rect = measurer.current.getBoundingClientRect();
          // Add some padding for the chevron icon and padding
          const padding = props.multiple ? 24 : 40; // 40px for chevron + padding
          let calculatedWidth = Math.max(rect.width + padding, 100); // minimum width of 120px

          // Check for max-width constraint from CSS classes
          const selectElement = selectRef.current;
          const computedStyle = window.getComputedStyle(selectElement);
          const maxWidth = Number.parseInt(computedStyle.maxWidth);

          if (!isNaN(maxWidth) && maxWidth > 0) {
            calculatedWidth = Math.min(calculatedWidth, maxWidth);
          }

          setWidth(calculatedWidth);
        }
      }, 0);
    }, [dynamicWidth, getSelectedText, props.multiple]);

    // Update width when value changes
    React.useEffect(() => {
      if (dynamicWidth) {
        updateWidth();
      }
    }, [props.value, dynamicWidth, updateWidth]);

    // Update width on mount
    React.useEffect(() => {
      if (dynamicWidth) {
        updateWidth();
      }
    }, [dynamicWidth, updateWidth]);

    return (
      <div className="relative">
        {/* Hidden measuring element */}
        {dynamicWidth && (
          <span
            ref={measurer}
            className={cn(
              '-left-[9999px] pointer-events-none absolute whitespace-nowrap opacity-0',
              'text-sm', // Match select text size
              props.disabled && 'opacity-50',
            )}
            style={{
              font: 'inherit',
              fontSize: 'inherit',
              fontFamily: 'inherit',
              fontWeight: 'inherit',
              letterSpacing: 'inherit',
            }}
            aria-hidden="true"
          />
        )}

        <select
          className={cn(
            'peer inline-flex w-full cursor-pointer appearance-none items-center rounded-lg border border-border bg-background text-foreground text-sm shadow-black/5 shadow-sm transition-shadow focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 has-[option[disabled]:checked]:text-muted-foreground',
            props.multiple
              ? 'py-1 [&>*]:px-3 [&>*]:py-1 [&_option:checked]:bg-accent'
              : 'h-9 ps-3 pe-8',
            className,
          )}
          ref={(element) => {
            selectRef.current = element;
            if (typeof ref === 'function') {
              ref(element);
            } else if (ref) {
              ref.current = element;
            }
          }}
          style={dynamicWidth && width ? { width: `${width}px` } : undefined}
          onChange={(e) => {
            if (props.onChange) {
              props.onChange(e);
            }
            if (dynamicWidth) {
              // Update width after onChange
              setTimeout(updateWidth, 0);
            }
          }}
          {...props}
        >
          {children}
        </select>
        {!props.multiple && (
          <span className="pointer-events-none absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center text-muted-foreground/80 peer-disabled:opacity-50">
            <ChevronDown
              className="h-4 w-4"
              strokeWidth={2}
              aria-hidden="true"
            />
          </span>
        )}
      </div>
    );
  },
);
SelectNative.displayName = 'SelectNative';

export { SelectNative };
