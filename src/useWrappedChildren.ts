import { ComponentChildren, cloneElement, isValidElement, VNode } from "preact";
import { useMemo } from "preact/hooks";

export type InjectableProps = Record<string, unknown>;

interface PropsWithStyle {
  style?: Record<string, string | number>;
}

/**
 * A Preact hook to wrap children components and inject additional props into them.
 * @param children - The children to wrap and enhance with props.
 * @param injectProps - The props to inject into each child component.
 * @param mergeStrategy - How to handle prop conflicts ('override' | 'preserve'). Defaults to 'preserve'.
 * @returns Enhanced children with injected props.
 */
export function useWrappedChildren(
  children: ComponentChildren,
  injectProps: InjectableProps,
  mergeStrategy: "override" | "preserve" = "preserve"
): ComponentChildren {
  return useMemo(() => {
    if (!children) return children;

    const enhanceChild = (child: ComponentChildren): ComponentChildren => {
      if (!isValidElement(child)) return child;

      const existingProps = (child as VNode).props || {};

      let mergedProps: InjectableProps;

      if (mergeStrategy === "override") {
        // Injected props override existing ones
        mergedProps = { ...existingProps, ...injectProps };
      } else {
        // Existing props are preserved, injected props are added only if not present
        mergedProps = { ...injectProps, ...existingProps };
      }

      // Special handling for style prop to merge style objects properly
      const existingStyle = (existingProps as PropsWithStyle)?.style;
      const injectStyle = (injectProps as PropsWithStyle)?.style;

      if (
        existingStyle &&
        injectStyle &&
        typeof existingStyle === "object" &&
        typeof injectStyle === "object"
      ) {
        if (mergeStrategy === "override") {
          (mergedProps as PropsWithStyle).style = {
            ...existingStyle,
            ...injectStyle,
          };
        } else {
          (mergedProps as PropsWithStyle).style = {
            ...injectStyle,
            ...existingStyle,
          };
        }
      }

      return cloneElement(child, mergedProps);
    };

    if (Array.isArray(children)) {
      return children.map(enhanceChild);
    }

    return enhanceChild(children);
  }, [children, injectProps, mergeStrategy]);
}
