/** @jsx h */
import { h } from "preact";
import { useRef } from "preact/hooks";
import { render, fireEvent } from "@testing-library/preact";
import { useRefPrint } from "../src/useRefPrint";
import { vi } from "vitest";

const PRINT_CLASS = "use-ref-print-target";
const PRINT_STYLE_ID = "use-ref-print-styles";

describe("useRefPrint", () => {
  let mockPrint: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockPrint = vi.fn();
    vi.spyOn(globalThis.window, "print").mockImplementation(mockPrint);
    vi.useFakeTimers();
  });

  afterEach(() => {
    document.getElementById(PRINT_STYLE_ID)?.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns a print function", () => {
    function TestComponent() {
      const ref = useRef<HTMLDivElement>(null);
      const { print } = useRefPrint(ref);
      return (
        <div>
          <div ref={ref}>Content</div>
          <button onClick={print}>Print</button>
        </div>
      );
    }
    const { getByText } = render(<TestComponent />);
    expect(getByText("Print")).toBeDefined();
  });

  it("adds print class and injects @media print styles then calls window.print when print is clicked", () => {
    function TestComponent() {
      const ref = useRef<HTMLDivElement>(null);
      const { print } = useRefPrint(ref);
      return (
        <div>
          <div ref={ref} data-testid="print-area">
            <p>Section to print</p>
          </div>
          <button onClick={print}>Print</button>
        </div>
      );
    }
    const { getByText, getByTestId } = render(<TestComponent />);
    const printArea = getByTestId("print-area");
    expect(printArea).toBeTruthy();

    fireEvent.click(getByText("Print"));

    expect(printArea.classList.contains(PRINT_CLASS)).toBe(true);
    const styleEl = document.getElementById(PRINT_STYLE_ID);
    expect(styleEl).toBeTruthy();
    expect(styleEl?.textContent).toContain("@media print");
    expect(styleEl?.textContent).toContain(PRINT_CLASS);
    expect(mockPrint).toHaveBeenCalled();
  });

  it("does nothing when ref.current is null", () => {
    function TestComponent() {
      const ref = useRef<HTMLDivElement>(null);
      const { print } = useRefPrint(ref);
      return <button onClick={print}>Print</button>;
    }
    const { getByText } = render(<TestComponent />);
    fireEvent.click(getByText("Print"));
    expect(mockPrint).not.toHaveBeenCalled();
    expect(document.getElementById(PRINT_STYLE_ID)).toBeNull();
  });

  it("sets document.title when documentTitle option is provided and restores after print", () => {
    const originalTitle = document.title;
    function TestComponent() {
      const ref = useRef<HTMLDivElement>(null);
      const { print } = useRefPrint(ref, { documentTitle: "My Report" });
      return (
        <div>
          <div ref={ref}>Content</div>
          <button onClick={print}>Print</button>
        </div>
      );
    }
    const { getByText } = render(<TestComponent />);
    fireEvent.click(getByText("Print"));
    expect(document.title).toBe("My Report");
    // Simulate afterprint to trigger cleanup
    window.dispatchEvent(new Event("afterprint"));
    expect(document.title).toBe(originalTitle);
  });

  it("calls window.print when print is invoked", () => {
    function TestComponent() {
      const ref = useRef<HTMLDivElement>(null);
      const { print } = useRefPrint(ref);
      return (
        <div>
          <div ref={ref}>Content</div>
          <button onClick={print}>Print</button>
        </div>
      );
    }
    const { getByText } = render(<TestComponent />);
    fireEvent.click(getByText("Print"));
    expect(mockPrint).toHaveBeenCalled();
  });
});
