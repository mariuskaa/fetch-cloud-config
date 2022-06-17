# fetch-cloud-config

Fetch configs from spring-cloud-config servers.

## Installation 
```bash
# using yarn
yarn add fetch-cloud-config

# using npm
npm i fetch-cloud-config
```

## Usage
```javascript
import { load } from 'spring-cloud-config'

load({
    host: 'http//your-config-server.com',
    profiles: ['staging'],
    name: 'your-app-name'
}).then(({properties}) => {
    console.log(properties)
})

```
`fetch-cloud-config` also fully supports typescript. This is demonstrated in the examples below.

## Examples
`load` retrieves and merges property sources as specified in your configuration. 
One can either use the default nested model, opt for a flattened model, or use raw data from the spring-cloud-config server. 
Spring environment-variable placeholders can be resolved by adding an 'environment' configuration.

```yaml
# application.yml
app:
  name: sample-app
  api-url: https://your.app/api
  greeting: hello ${USER}

data:
  - one
  - two
```
```yaml
# application-staging.yml
app:
  api-url: https://staging.your.app/api
```

```typescript
import { load, Configuration } from 'fetch-cloud-config';

const configuration: Configuration = {
    host: 'https://config.server', 
    name: 'application', 
    profiles: ['staging'],
    environment: { USER: 'bob' }
};

type AppConfig = { app: { name: string, 'api-url': string, data: string[]}}

const { properies, flat } = await load<AppConfig>(configuration);
console.log(properties)
// {
//   app: {
//     name: 'sample-app',
//     api-url: 'https://staging.your.app/api'
//     data: ['one', 'two'],
//     greeting: 'hello bob'
//   }
// }
console.log(flat)
// {
//   app.name: 'sample-app'
//   app.api-url: 'https://staging.your.app/api'
//   app.data[0]: 'one'
//   app.data[1]: 'two'
//   app.greeting: 'hello bob'
// }

```
The raw Spring data can also be accessed through the `load` result: 
```javascript
const { raw } = await load(configuration);
```


## In progress
- [x] Flattened configuration
- [ ] Authentication
- [X] Variable expansion (`${SOME_ENV_VAR}`) using a provided context
