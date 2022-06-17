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
  expect(result.flat).toEqual({
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
  const config = { host: 'localhost', name: 'application', profiles: ['dev'] };
  type Properties = {
    placeholder?: string;
    fallback: string;
    true: boolean;
    false: boolean;
    number: number;
  };

  it('should insert environment variable', async () => {
    fetchMock.mockResponse(JSON.stringify(placeholders));
    const properties = await load<Properties>({
      ...config,
      environment: { ENV_PLACEHOLDER: 'test' },
    }).then((r) => r.properties);
    expect(properties.placeholder).toBe('test');
  });

  it('should support missing variable fallback', async () => {
    fetchMock.mockResponse(JSON.stringify(placeholders));
    const properties = await load<Properties>(config).then((r) => r.properties);
    expect(properties.fallback).toBe('fallback');
    expect(properties.placeholder).toBe(undefined);
  });

  it('should populate placeholders with fallback', async () => {
    fetchMock.mockResponse(JSON.stringify(placeholders));
    const properties = await load<Properties>({
      ...config,
      environment: { ENV_FALLBACK: 'override' },
    }).then((r) => r.properties);
    expect(properties.fallback).toBe('override');
  });

  it('should resolve correct types', async () => {
    fetchMock.mockResponse(JSON.stringify(placeholders));
    const environment = { ENV_TRUE: true, ENV_FALSE: false, ENV_NUMBER: 1 };
    const properties = await load<Properties>({ ...config, environment }).then(
      (r) => r.properties
    );
    expect(properties.false).toEqual(false);
    expect(properties.true).toEqual(true);
    expect(properties.number).toEqual(environment.ENV_NUMBER);
  });
});
