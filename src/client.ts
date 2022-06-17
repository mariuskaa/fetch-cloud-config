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

function resolveVariables(
  properties: Record<string, ValueType>,
  environment: Record<string, ValueType>
): Record<string, ValueType> {
  return Object.entries(properties)
    .map(([key, value]) => {
      if (typeof value === 'string')
        return { key, value: expandTemplateText(value, environment) };
      else return { key, value };
    })
    .reduce((merged, { key, value }) => ({ ...merged, [key]: value }), {});
}

/**
 * Expand all string templates found in a string, using a provided environment to resolve variables
 * ex: expandTemplateText('hello ${TEXT}', { TEXT: 'world'}) resolves to 'hello world'
 *
 * Also supports fallback values, in case the value is not found in the provided environment
 * ex: expandTemplateText('hello ${TEXT:bob}', { }) resolves to 'hello bob'
 */
function expandTemplateText(
  text: string,
  environment: Record<string, ValueType>
) {
  const match = text.match(/(?<=\${)[\w:]+(?=})/g);
  if (match) {
    const updated = match.reduce(
      (total, expression) =>
        total.replace(
          `\${${expression}}`,
          expandTemplateExpression(expression, environment)
        ),
      text
    );
    return transformType(updated);
  } else return text;
}

/**
 * Transform string to number, boolean or undefined as applicable
 */
function transformType(text: string): ValueType {
  if (text === '') return undefined;
  else if (text === 'true') return true;
  else if (text === 'false') return false;
  else if (!isNaN(Number(text))) return Number(text);
  else return text;
}

function expandTemplateExpression(
  expression: string,
  environment: Record<string, ValueType>
): string {
  const [variable, fallback] = expression.split(':');
  if (variable in environment) return <string>environment[variable];
  else if (fallback) return fallback;
  else return '';
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
  environment = {},
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
  const expanded = resolveVariables({ ...parsed }, environment);
  return {
    raw,
    flat: expanded,
    properties: nest<T>(expanded),
  };
}
