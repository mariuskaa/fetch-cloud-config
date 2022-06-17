import { set } from 'lodash-es';
import urlJoin from 'url-join';

export interface Configuration {
  host: string;
  name?: string;
  profiles: string[];
  path?: string;
  label?: string;
  environment?: Record<string, ValueType>;
}

export interface SpringCloudConfigResultRaw {
  name: string;
  profiles: string[];
  version: string;
  propertySources: SpringCloudPropertySource[];
}

export interface SpringCloudPropertySource {
  name: string;
  source: Record<string, ValueType>;
}

function containsPrefix(obj: Record<string, never>, prefix?: string) {
  if (!prefix) return false;
  return Object.keys(obj).some((key) => key.startsWith(prefix));
}

type ValueType = string | number | boolean | undefined;

/**
 * Transform an 'application.properties' style Record to a nested object
 * { 'app.test': 'hey', 'app.data[0]': 123, 'app.nested.key': 'value' }
 *    is transformed to
 * { app: { test: 'hey', data: [123], nested: { key: 'value' }}}
 */
function nest<T>(p: Record<string, ValueType>): T {
  let nested = {};
  Object.entries(p).forEach(([key, value]) => {
    nested = set(nested, key, value);
  });
  return nested as T;
}

function parse<T = Record<string, ValueType>>(
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

export async function load<T = unknown>({
  host,
  name = 'application',
  profiles,
  path = '',
  label = '',
}: Configuration): Promise<{
  raw: SpringCloudConfigResultRaw;
  properties: T;
  flat: Record<string, string | boolean | number | unknown>;
}> {
  const url = urlJoin(host, path, name, profiles.join(','), label);
  const raw = (await fetch(url).then((r) =>
    r.json()
  )) as SpringCloudConfigResultRaw;
  const parsed = parse(raw);
  return {
    raw,
    flat: parsed,
    properties: nest<T>(parsed),
  };
}
