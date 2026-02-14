/** @jsx h */
import { h } from "preact";
import { render } from "@testing-library/preact";
import "@testing-library/jest-dom";
import { useLLMMetadata } from "../src/useLLMMetadata";

const SCRIPT_SELECTOR = 'script[data-llm="true"]';

function getLLMScript(): HTMLScriptElement | null {
  return document.querySelector(SCRIPT_SELECTOR);
}

function getLLMPayload(): unknown {
  const script = getLLMScript();
  if (!script?.textContent) return null;
  try {
    return JSON.parse(script.textContent);
  } catch {
    return null;
  }
}

describe("useLLMMetadata", () => {
  beforeEach(() => {
    document.head.querySelectorAll(SCRIPT_SELECTOR).forEach((el) => el.remove());
  });

  it("injects script with type application/llm+json and data-llm=true", () => {
    function TestComponent() {
      useLLMMetadata({ route: "/", mode: "manual", title: "Home" });
      return <div />;
    }
    render(<TestComponent />);
    const script = getLLMScript();
    expect(script).toBeInTheDocument();
    expect(script?.getAttribute("type")).toBe("application/llm+json");
    expect(script?.getAttribute("data-llm")).toBe("true");
  });

  it("manual mode uses title, description, tags from config", () => {
    function TestComponent() {
      useLLMMetadata({
        route: "/blog/ai",
        mode: "manual",
        title: "AI Post",
        description: "A short desc",
        tags: ["a", "b"],
      });
      return <div />;
    }
    render(<TestComponent />);
    const payload = getLLMPayload() as Record<string, unknown>;
    expect(payload).not.toBeNull();
    expect(payload.route).toBe("/blog/ai");
    expect(payload.title).toBe("AI Post");
    expect(payload.description).toBe("A short desc");
    expect(payload.tags).toEqual(["a", "b"]);
    expect(payload.generatedAt).toBeDefined();
  });

  it("removes previous script when route changes", () => {
    function TestComponent({ route }: { route: string }) {
      useLLMMetadata({ route, mode: "manual", title: route });
      return <div />;
    }
    const { rerender } = render(<TestComponent route="/a" />);
    expect(getLLMScript()?.textContent).toContain('"route":"/a"');
    rerender(<TestComponent route="/b" />);
    const script = getLLMScript();
    expect(script).toBeInTheDocument();
    expect(script?.textContent).toContain('"route":"/b"');
    expect(document.querySelectorAll(SCRIPT_SELECTOR).length).toBe(1);
  });

  it("auto-extract mode uses document.title and builds outline from visible h1/h2", () => {
    document.title = "Page Title";
    const main = document.createElement("main");
    const h1 = document.createElement("h1");
    h1.textContent = "Intro";
    const h2 = document.createElement("h2");
    h2.textContent = "Section";
    main.append(h1, h2);
    document.body.appendChild(main);

    function TestComponent() {
      useLLMMetadata({ route: "/doc", mode: "auto-extract" });
      return <div />;
    }
    render(<TestComponent />);
    const payload = getLLMPayload() as Record<string, unknown>;
    expect(payload?.title).toBe("Page Title");
    expect(Array.isArray(payload?.outline)).toBe(true);
    expect((payload?.outline as string[]).includes("Intro")).toBe(true);
    expect((payload?.outline as string[]).includes("Section")).toBe(true);
    main.remove();
  });

  it("cleans up script on unmount", () => {
    function Page() {
      useLLMMetadata({ route: "/x", mode: "manual" });
      return <div>Page</div>;
    }
    const { unmount } = render(<Page />);
    expect(getLLMScript()).toBeInTheDocument();
    unmount();
    expect(getLLMScript()).not.toBeInTheDocument();
  });

  it("default mode is manual when mode is omitted", () => {
    function TestComponent() {
      useLLMMetadata({ route: "/", title: "T" });
      return <div />;
    }
    render(<TestComponent />);
    const payload = getLLMPayload() as Record<string, unknown>;
    expect(payload?.title).toBe("T");
    expect(payload?.outline).toBeUndefined();
  });

  it("accepts null config without throwing and injects minimal payload", () => {
    function TestComponent() {
      useLLMMetadata(null);
      return <div />;
    }
    expect(() => render(<TestComponent />)).not.toThrow();
    const payload = getLLMPayload() as Record<string, unknown>;
    expect(payload?.route).toBe("/");
    expect(payload?.generatedAt).toBeDefined();
  });

  it("includes canonicalUrl, ogType, siteName when provided", () => {
    function TestComponent() {
      useLLMMetadata({
        route: "/page",
        mode: "manual",
        title: "Page",
        canonicalUrl: "https://example.com/page",
        ogType: "article",
        siteName: "My Site",
      });
      return <div />;
    }
    render(<TestComponent />);
    const payload = getLLMPayload() as Record<string, unknown>;
    expect(payload?.canonicalUrl).toBe("https://example.com/page");
    expect(payload?.ogType).toBe("article");
    expect(payload?.siteName).toBe("My Site");
  });
});
