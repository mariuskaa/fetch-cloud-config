import { load, Configuration } from '../client';
import data from '../__fixtures__/data.json';
import nested from '../__fixtures__/nested.json';
import placeholders from '../__fixtures__/placeholders.json';
import fetchMock from 'jest-fetch-mock';

beforeEach(() => {
  fetchMock.resetMocks();
});

test('Calls url with label, profile and app name', async () => {
  fetchMock.mockResponse(JSON.stringify(data));
  const baseConfig: Configuration = {
    profiles: [],
    host: 'http://localhost:8888',
    name: 'appname',
  };

  await load({ ...baseConfig, profiles: ['dev'] });
  expect(fetchMock).toHaveBeenCalledWith('http://localhost:8888/appname/dev');

  await load({
    ...baseConfig,
    profiles: ['dev', 'extra'],
    label: 'sample-label',
  });
  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:8888/appname/dev,extra/sample-label'
  );
});

test('Properties are overridden by specificity', async () => {
  fetchMock.mockResponseOnce(JSON.stringify(data));
  const config: Configuration = {
    host: '',
    profiles: ['dev'],
  };
  type Result = { name: string; overridden: number };
  const result = await load<Result>(config);
  expect(result.properties).toEqual({
    name: 'sample data',
    overridden: 2,
  });
});

test('Construct nested object', async () => {
  fetchMock.mockResponseOnce(JSON.stringify(nested));
  const config: Configuration = { host: '', profiles: ['dev'] };
  type Result = {
    app: {
      name: string;
      overridden: number;
      list: string[];
      mapdata: Record<string, string>;
    };
  };
  const result = await load<Result>(config);
  expect(result.properties).toEqual({
    app: {
      name: 'sample data',
      overridden: 2,
      list: ['0', undefined, '2'],
      mapdata: {
        one: 'one',
        two: 'two',
        three: 'three',
      },
    },
  });
});

test('Construct flat object', async () => {
  fetchMock.mockResponseOnce(JSON.stringify(nested));
  const config: Configuration = {
    host: '',
    profiles: ['dev'],
    flatten: true,
  };
  type Result = {
    app: {
      name: string;
      overridden: number;
      list: string[];
      mapdata: Record<string, string>;
    };
  };
  const result = await load<Result>(config);
  expect(result.properties).toEqual({
    'app.name': 'sample data',
    'app.overridden': 2,
    'app.list[0]': '0',
    'app.list[2]': '2',
    'app.mapdata.one': 'one',
    'app.mapdata.two': 'two',
    'app.mapdata.three': 'three',
  });
});

describe('placeholder resolver', () => {
  fetchMock.mockResponse(JSON.stringify(placeholders));
  const config = { host: 'localhost', name: 'application', profiles: ['dev'] };
  type Properties = { placeholder?: string; fallback: string };

  it('should insert environment variable', async () => {
    const properties = await load<Properties>({
      ...config,
      environment: { ENV_PLACEHOLDER: 'test' },
    }).then((r) => r.properties);
    expect(properties.placeholder).toBe('test');
  });

  it('should support missing variable fallback', async () => {
    const properties = await load<Properties>(config).then((r) => r.properties);
    expect(properties.fallback).toBe('fallback');
    expect(properties.placeholder).toBe(undefined);
  });

  it('should populate placeholders with fallback', async () => {
    const properties = await load<Properties>({
      ...config,
      environment: { ENV_FALLBACK: 'override' },
    }).then((r) => r.properties);
    expect(properties.fallback).toBe('override');
  });
});
