import { set, mergeWith } from 'lodash-es';
import urlJoin from 'url-join';

export interface Configuration {
  host: string;
  name?: string;
  profiles: string[];
  path?: string;
  label?: string;
  flatten?: boolean;
}

export interface SpringCloudConfigResultRaw {
  name: string;
  profiles: string[];
  version: string;
  propertySources: SpringCloudPropertySource[];
}

export interface SpringCloudPropertySource {
  name: string;
  source: Record<string, string | number | boolean>;
}

function nestedParse<T>(raw: SpringCloudConfigResultRaw): T {
  return raw.propertySources
    .map(({ source }) => {
      const partial = {};
      Object.entries(source).forEach(([key, value]) =>
        set(partial, key, value)
      );
      return partial;
    })
    .reduce(
      (total, current) =>
        mergeWith(total, current, (original) => {
          if (original instanceof Array) return original;
          else if (original instanceof Object) return undefined;
          else return original;
        }),
      {}
    ) as T;
}

function containsPrefix(obj: Record<string, never>, prefix?: string) {
  if (!prefix) return false;
  return Object.keys(obj).some((key) => key.startsWith(prefix));
}

function flatParse<T = Record<string, string | number | boolean>>(
  raw: SpringCloudConfigResultRaw
): T {
  const expression = /^(?<prefix>.*?)\[(\d+)]/m;
  return raw.propertySources
    .map((p) =>
      Object.entries(p.source).map(([key, value]) => ({ key, value }))
    )
    .reduce((total, set) => {
      const merged = set.reduce((subtotal, { key, value }) => {
        const match = key.match(expression);
        if (match && containsPrefix(total, match.groups?.['prefix'])) {
          return subtotal;
        } else return { ...subtotal, [key]: value };
      }, {});
      return { ...merged, ...total };
    }, {}) as T;
}

export async function load<T>({
  host,
  name = 'application',
  profiles,
  path = '',
  label = '',
  flatten = false,
}: Configuration): Promise<{ raw: SpringCloudConfigResultRaw; properties: T }> {
  const url = urlJoin(host, path, name, profiles.join(','), label);
  const raw = (await fetch(url).then((r) =>
    r.json()
  )) as SpringCloudConfigResultRaw;
  return {
    raw,
    properties: flatten ? flatParse(raw) : nestedParse<T>(raw),
  };
}
