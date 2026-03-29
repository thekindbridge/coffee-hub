import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';

type NamedModule<TComponent extends ComponentType<any>, TName extends string> = Record<TName, TComponent>;

export const lazyNamed = <TComponent extends ComponentType<any>, TName extends string>(
  factory: () => Promise<NamedModule<TComponent, TName>>,
  exportName: TName,
): LazyExoticComponent<TComponent> =>
  lazy(async () => {
    const module = await factory();

    return {
      default: module[exportName],
    };
  });
