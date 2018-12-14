
# a11ygato

a11ygato is a suite of tools to help audit web site accessibility. A score (KPI) is computed per audit. This project is a fork of [pa11y].

## Requirements

- Node 8+
- Npm 6+
- MongoDB 3

## Getting started

### Launching the dashboard

1. Git clone this repo 
2. Install dependencies: `npm install`
3. Build all modules: `npm run build`
4. Start a mongo instance in another terminal: `mongod --dbpath data`
    - An empty data folder is created so you can have your database locally while developing or testing 
    - for development, you will probably be good to go with each project default configuration file but you might want to configure them in dashboard and webservice `config` folder. Read the documentation of each project to better understand what you can configure. 
5. Start the dashboard: `npm start`
6. Open it in a modern browser: `https://127.0.0.1:8443`.

The dashboard is a tool for decision makers that allows the monitoring accross time of sites accessibility score:
  - Features:
    - score computing
    - scheduling
    - crawling with optional concurrency (max 5 urls)
    - puppeteer scripts execution
    - url filtering to audit part of a domain
    - screenshots
  - Historically, it is composed of two node servers:
    - `dashboard` is an express node server that serves html pages (this is the frontend)
    - `webservice` is an hapi node server that serves json data (this is the backend)
    
![dashboard](./modules/dashboard/overview.png)

#### Encryption

The dashboard uses a couple of private keys to handle the HTTPS protocol and JWT authentication.
Default ones have been generated for development inside the `security` folder. 
For HTTPS, the certificate declare a `pally` hostname for development. 
You might want to add a local alias for `127.0.0.1` in your OS hosts file to avoid a warning from your browser the first time.

For instance for unix systems, it is `/etc/hosts`:

```
…
127.0.0.1	localhost
127.0.0.1       pally
…
```

You can then open `https://pally:8443` instead of `https://127.0.0.1:8443`.

**WARNING: these auto-generated keys are for development only! For production, you should create your own ones!**

[More information](./Encryption.md)

#### Database

You need a mongo instance. You can configure its address in the webservice's profile file (`config` folder).

#### using a custom profile

You can add new profiles by creating new files in `modules/webservice/config` and `modules/dashboard/config`.
You must use the same name in both.

You can then choose which profile to start/restart/delete either:
- by modifying `.npmrc` at the root
- by overriding `.npmrc` config at the command line

```bash
npm run start|restart|delete [--env=<profile name without extension>]
``` 

Example:

```bash
npm run start --env=integration
``` 

### Installing the CLI

```bash
npm i -g @a11ygato/cli
```

`cli` is a tiny wrapper around the `audit-engine` that allows to start an audit (url or script) from the command line and generate a report in return.
Can be used also for continuous integration.

For development, you might want to just use `npm link` inside `modules/cli`. 

See the [CLI documentation](./modules/cli/README.md) for more.

### Installing the audit engine

```bash
npm i -S @a11ygato/audit-engine
```

`audit-engine` is a node API that execute un audit from a url, a tree of urls or a puppeteer script.

See the [API documentation](./modules/audit-engine/README.md) for more.

## Contributing

See [CONTRIBUTING](./CONTRIBUTING.md).



[pa11y]: https://github.com/pa11y/pa11y
