import * as React from 'react';
import useMemo from 'rc-util/lib/hooks/useMemo';
import shallowEqual from 'shallowequal';
import CacheEntity from './Cache';

export const ATTR_TOKEN = 'data-token-hash';
export const ATTR_MARK = 'data-css-hash';
export const ATTR_DEV_CACHE_PATH = 'data-dev-cache-path';

// Mark css-in-js instance in style element
export const CSS_IN_JS_INSTANCE = '__cssinjs_instance__';
export const CSS_IN_JS_INSTANCE_ID = Math.random().toString(12).slice(2);

export function createCache() {
  if (typeof document !== 'undefined' && document.head && document.body) {
    const styles = document.body.querySelectorAll(`style[${ATTR_MARK}]`) || [];
    const { firstChild } = document.head;

    Array.from(styles).forEach((style) => {
      (style as any)[CSS_IN_JS_INSTANCE] =
        (style as any)[CSS_IN_JS_INSTANCE] || CSS_IN_JS_INSTANCE_ID;

      // Not force move if no head
      document.head.insertBefore(style, firstChild);
    });

    // Deduplicate of moved styles
    const styleHash: Record<string, boolean> = {};
    Array.from(document.querySelectorAll(`style[${ATTR_MARK}]`)).forEach(
      (style) => {
        const hash = style.getAttribute(ATTR_MARK)!;
        if (styleHash[hash]) {
          if ((style as any)[CSS_IN_JS_INSTANCE] === CSS_IN_JS_INSTANCE_ID) {
            style.parentNode?.removeChild(style);
          }
        } else {
          styleHash[hash] = true;
        }
      },
    );
  }

  return new CacheEntity();
}

export type HashPriority = 'low' | 'high';

export interface StyleContextProps {
  autoClear?: boolean;
  /** @private Test only. Not work in production. */
  mock?: 'server' | 'client';
  /**
   * Only set when you need ssr to extract style on you own.
   * If not provided, it will auto create <style /> on the end of Provider in server side.
   */
  cache: CacheEntity;
  /** Tell children that this context is default generated context */
  defaultCache: boolean;
  /** Use `:where` selector to reduce hashId css selector priority */
  hashPriority?: HashPriority;
  /** Tell cssinjs where to inject style in */
  container?: Element | ShadowRoot;
  /** Component wil render inline  `<style />` for fallback in SSR. Not recommend. */
  ssrInline?: boolean;
}

const StyleContext = React.createContext<StyleContextProps>({
  hashPriority: 'low',
  cache: createCache(),
  defaultCache: true,
});

export type StyleProviderProps = Partial<StyleContextProps> & {
  children?: React.ReactNode;
};

export const StyleProvider: React.FC<StyleProviderProps> = (props) => {
  const { children, ...restProps } = props;

  const parentContext = React.useContext(StyleContext);

  const context = useMemo<StyleContextProps>(
    () => {
      const mergedContext: StyleContextProps = {
        ...parentContext,
      };

      (Object.keys(restProps) as (keyof StyleContextProps)[]).forEach((key) => {
        const value = restProps[key];
        if (restProps[key] !== undefined) {
          (mergedContext as any)[key] = value;
        }
      });

      const { cache } = restProps;
      mergedContext.cache = mergedContext.cache || createCache();
      mergedContext.defaultCache = !cache && parentContext.defaultCache;

      return mergedContext;
    },
    [parentContext, restProps],
    (prev, next) =>
      !shallowEqual(prev[0], next[0]) || !shallowEqual(prev[1], next[1]),
  );

  return (
    <StyleContext.Provider value={context}>{children}</StyleContext.Provider>
  );
};

export default StyleContext;
