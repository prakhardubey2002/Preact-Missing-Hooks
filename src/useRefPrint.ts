import type { RefObject } from "preact";
import { useCallback, useRef } from "preact/hooks";

const PRINT_CLASS = "use-ref-print-target";
const PRINT_STYLE_ID = "use-ref-print-styles";

const PRINT_CSS = `
@media print {
  body * {
    visibility: hidden;
  }
  .${PRINT_CLASS},
  .${PRINT_CLASS} * {
    visibility: visible;
  }
  .${PRINT_CLASS} {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
  }
}
`;

export interface UseRefPrintOptions {
  /**
   * When true, the print flow is triggered so the user can choose
   * "Save as PDF" in the native print dialog. Uses the same window.print() path.
   */
  downloadAsPdf?: boolean;
  /** Title for the print document (e.g. used when saving as PDF). */
  documentTitle?: string;
}

export interface UseRefPrintReturn {
  /** Triggers native print for the section bound to the ref (opens print dialog; only that section is printed via @media print). */
  print: () => void;
}

/**
 * A Preact hook that binds a ref to a printable section and provides a function
 * to print only that section using the native window.print() and @media print CSS.
 * When print() is called (or user presses Ctrl+P after focusing that section), only
 * the ref section is visible in the print layout. User can then print or save as PDF.
 *
 * @param printRef - Ref to the DOM element (e.g. a div) that should be printed.
 * @param options - Optional: downloadAsPdf hint, documentTitle for the print document.
 * @returns Object with a print() function.
 *
 * @example
 * ```tsx
 * function Report() {
 *   const printRef = useRef<HTMLDivElement>(null);
 *   const { print } = useRefPrint(printRef, { documentTitle: 'Report', downloadAsPdf: true });
 *   return (
 *     <div>
 *       <div ref={printRef}>Content to print or save as PDF</div>
 *       <button onClick={print}>Print / Save as PDF</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useRefPrint(
  printRef: RefObject<HTMLElement | null>,
  options: UseRefPrintOptions = {}
): UseRefPrintReturn {
  const { documentTitle } = options;
  const originalTitleRef = useRef<string>("");

  const print = useCallback(() => {
    const el = printRef.current;
    if (!el || typeof window === "undefined" || !window.print) {
      return;
    }

    // Ensure print-only styles exist (once per document)
    let styleEl = document.getElementById(PRINT_STYLE_ID) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = PRINT_STYLE_ID;
      styleEl.textContent = PRINT_CSS;
      document.head.appendChild(styleEl);
    }

    el.classList.add(PRINT_CLASS);
    if (documentTitle) {
      originalTitleRef.current = document.title;
      document.title = documentTitle;
    }

    const cleanup = () => {
      el.classList.remove(PRINT_CLASS);
      if (documentTitle && originalTitleRef.current !== undefined) {
        document.title = originalTitleRef.current;
      }
    };

    if ("onafterprint" in window) {
      const onAfterPrint = () => {
        cleanup();
        window.removeEventListener("afterprint", onAfterPrint);
      };
      window.addEventListener("afterprint", onAfterPrint);
    }

    window.print();

    // Fallback cleanup if afterprint is not fired (e.g. user cancels)
    setTimeout(cleanup, 1000);
  }, [printRef, documentTitle]);

  return { print };
}
