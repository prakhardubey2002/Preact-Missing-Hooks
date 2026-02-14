/**
 * Re-exports Preact hooks as "react" for tests so useLLMMetadata (which imports from "react")
 * uses the same renderer as the Preact test components.
 */
export { useEffect, useRef } from "preact/hooks";
