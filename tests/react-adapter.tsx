/**
 * Adapter so the same test files can run with React: provides Preact-like exports.
 * Used when running tests with the "react" Vitest project (alias preact → this file).
 */
import * as React from "react";

export const h = React.createElement;
export const cloneElement = React.cloneElement;
export const isValidElement = React.isValidElement;
export type ComponentChildren = React.ReactNode;
export type RefObject<T> = React.RefObject<T>;
export type VNode = React.ReactElement;
