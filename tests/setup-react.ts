/**
 * Setup for React Vitest project. Ensures tests can detect they run under React.
 */
(globalThis as unknown as { __VITEST_REACT__?: boolean }).__VITEST_REACT__ = true;
