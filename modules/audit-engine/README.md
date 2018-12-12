# @a11ygato/audit-engine

## Overview

This project is the engine responsible to audit a URL, a tree of URLs or a puppeteer script in a browser container.

Behind the scene, we are using axe-core to analyze pages. But we don't exclude the possibility to add other accessibility engines in the future. 

There is one browser container: Chrome Headless. There was also Phantom (Webkit) before, but it has been abandonned.

This is the node API. There is a CLI named `@a11ygato/cli`.

Axe is configured with these accessibility norms: 

- WCAG2A 
- WCAG2AA

These rules are also deactivated:

- bypass
- video-caption
- audio-caption
- object-alt
- video-description

The browser container is installed and instantiated by this module automatically as a dependency.

## Installation

```bash
npm i -S @a11ygato/audit-engine
```

## Initialize the engine 

You must first initialize once and for all the audit engine package:

```js
const auditEngine = require('@a11ygato/audit-engine');
const settings = {...};
await auditEngine.init(settings);
```

### Trigger an audit or a scenario 

After that, you can trigger how many audits or scenarii you want.

An audit always have a root URL. You may enable crawling to find new URLs.

```js
const auditEngine = require('@a11ygato/audit-engine');
const task = {url: 'https://...', depth, limit, ...};
const audit =  auditEngine.createAudit(task);
const report = await audit.run();
```

Another way to analyze pages is to create a scenario. A scenario regroup one or more audits via scripting. A script is simply javascript code using the Puppeteer API with a few specificities.

```js
const auditEngine = require('@a11ygato/audit-engine');
const task = {scenario: '...'};
const scenario = auditEngine.createScenario(task)
const report = await scenario.run();
```

You may `catch` errors with a `try/catch` statement but you will only receive uncaught errors. An audit or a scenario always complete and store eventually in the `exception` field the cause of failure if needed.

### API

<!-- toc -->

- [auditEngine.init(options)](#init)
- [auditEngine.getSettings()](#getSettings)
- [auditEngine.createAudit(task)](#createAudit)
- [auditEngine.createScenario(task)](#createScenario)
- [auditEngine.shutdown()](#shutdown)
- [class: Audit](#class-audit)
- [class: Scenario](#class-scenario)
- [Report](#class-report)
- [URLResult](#urlresult)
- [Violation](#violation)

#### auditEngine.init(settings)

Modify settings for the whole engine.

- `settings` <[Object]>
  * `publicFolder` <[String]> Absolute or relative path to the folder that will store screen captures and source codes. Default: `./public`.
  * `axeScript` <[String]> Absolute or relative path to the javascript axe file. If not provided, the `axe-core` package will be searched in `node_modules`.
  * `includeRawAxeResults` <[boolean]> Whether raw results returned by axe should be included too? Default: false.
  * `screenshotFilename` <[String]> Basename for the captured screenshot. Default: `page.png`.
  * `sourceFilename` <[String]> Basename for the captured source code. Default: `source.html`.
  * `concurrentInstances` <[Number]> Max number of concurrent browser instances. Default: `15`.
  The maximum concurrent jobs for one audit being 5, we can have between 3 (each task having 5 concurrents jobs) and 15 tasks (each task having one concurrent job) in parallel.
  * `proxy` <[String]> Proxy address. Default: `null`.
- returns <[Promise]>

The engine manage a pool of connections per browser container. 
Today, only Chrome is left, but before there was also Phantom. 
There is a limit to the maximum number of connections you can have at the same time. 
Even if you launch 20 audits with a concurrency of 5, when the max is reached, you will have to wait for a free connection. 
This is obviously automatic but still good to know. It may explains why an audit take much more time than usual.

#### auditEngine.getSettings(settings)

Get engine settings.

- returns <[Object]>.

#### auditEngine.createAudit(task)

- `task` <[Object]>
  * `url` <[String]> Only mandatory argument. Root URL to audit from which we may start crawling.
  * `limit` <[Number]> Maximum number of URL that may be audited independently of the depth. Default: 1. Max: 200.
  * `depth` <number> Define how many levels of crawling may be done. When a URL is audited, if `depth` is > 0 and/or
  `limit` > 1, the engine will parse the source in search of new URL from the same domain and add them (protocol, hostname and port must match). Default: 5.
  * `concurrency` <[Number]> Maximum number of URL audited in parallel. Default: 5. Max: 5.
  * `timeout` <[Number]> Timeout (in ms) used in several places notably when running axe tests. 
  Be aware that some very large site might solicit axe for several minutes before getting the results back. Default: 90000. 
  * `urlFilter` <[String]> Regular expression content (without // or flags) that allows you to bypass the default crawling algorithm and decide precisely which urls are selected by the crawler.
- returns <[Audit]>

#### auditEngine.createScenario(task)

- `task` <[Object]>
  * `scenario` <[String]> A puppeteer script. Mandatory argument.
- returns <[Scenario]>

A scenario is javascript code (ES6) using the [Puppeteer API](puppeteer-api).

You can use the modern `async/await` keywords if you want and you DON'T need any IIEFor async wrapper function to start using it right away.

Whatever code style you like, your should always return a `Promise` as your last expression:

```js
return new Promise((resolve, reject) => {
    // Do something
    resolve(); // or reject()
});

// OR

return audit(...).then(() => {
    return audit(...);
}).then(() => {
    return audit(...);
});

// OR

await audit(...);
await audit(...);

// OR

return Promise.all(audit(...), audit(...), audit(...));
```

##### Examples

###### A simple example with BASIC authentication

```js
/************************************************************************************/
// BASIC AUTH
/************************************************************************************/

const username = 'foo';
const password = 'bar';

const url = `https://httpbin.org/basic-auth/${username}/${password}`;

await page.goto(url);
await page.authenticate({ username, password });

// Trigger an audit using the current state (current page url).
await audit(page);


// This is another way to set HTTP headers but be aware they will be preserved between navigations.
// const headers = new Map();
// headers.set(
//     'Authorization',
//     `Basic ${new Buffer(`${username}:${password}`).toString('base64')}`
// );
// await page.setExtraHTTPHeaders(headers);
```

###### A more advanced example

```js
/************************************************************************************/
// FORM AUTH
/************************************************************************************/

const login = 'foo';
const password = 'bar';
const timeout = 90000;

await page.goto('http://www.orange.fr/portail');

// Click the customer space button
await page.waitForSelector('.espace-client-left', { visible: true, timeout });
await page.click('.espace-client-left');

// Click the identification button
await page.waitForSelector('#sc-identification .ec_button5', { visible: true, timeout });
await page.click('#sc-identification .ec_button5');

// Set username and password
await page.waitForSelector('#default_f_credential', { visible: true, timeout });
await page.$eval('#default_f_credential', el => el.value = '');
await page.focus('#default_f_credential');
await page.type(login);
await page.waitForSelector('#default_f_password', { visible: true, timeout });
await page.focus('#default_f_password');
await page.type(password);

// Submit form
await page.click('#AuthentForm input[type=submit].sc_button_content_2.submit');
await page.waitForNavigation({ timeout });

// Audit current page and another one (crawl).
await audit(page, { limit: 2, depth: 1 });

// Audit another site entirely with the same connection.
// URLs will be audited sequentially because there is only one connection.
await audit(page, { url: 'http://www.orange.es', limit:5 });

// Audit another site without reusing the same connection (will use a shared pool of connections).
// A maximum of 5 URLs can be audited in parallel.
await audit({ url: 'https://twitter.com', concurrency: 5, limit: 3, depth: 2 });
```

##### Globals

###### page:Page

`page` is an instance of the Puppeteer `Page` class. You can use it normally even though some methods are frozen for obvious security reasons.
You can see `page` as a tab in Chrome.

###### audit([page], task)

- `page` <[Page]> Optional Puppeteer Page instance.
- `task` <[Object]> Task configuration:
    - `url` <[String]> URL to audit
    - `limit` <[Number]> Maximum number of URL that will be audited. Default `1`.
    - `depth` <[Number]> Maximum depth when crawling (searching new urls). Default `5`.
    - `concurrency` <[Number]> Maximum number of URL audited in parallel (between 1 and 5). Default `5`.
    - `timeout` <[Number]> Timeout used during an audit for specific tasks like loading the page, executing axe tests, etc. Default `180000`.
    - `urlFilter` <[String]> Regular expression content (without // or flags) that allows you to bypass the default crawling algorithm and decide precisely which urls are selected by the crawler.

When `page` is omitted, you must provide at least this minimalist task configuration: `{ url:'https://...' }`.
Transmitting only the current `page` is equivalent to transmitting a minimalist task configuration with only a URL (the current one).

##### Accessible modules

There is not much you can require. Here is the current whitelist:

- `q`
- `url`
- `async`
- `lodash`
- `util`

You have access to classic ES6 globals plus node `Buffer` class.

#### auditEngine.shutdown()

- returns <[Promise]>

I encourage you to close properly the engine on shutdown. For instance:

```js
process.once('SIGINT', function () {
    console.log('Received SIGINT');
    return gracefulShutdown(0);
});

////////

function gracefulShutdown(exitCode) {
    // Destroying pools.
    return auditEngine.shutdown().then(function() {
        console.log('Pools drained');
        process.exit(exitCode);
    });
}
```

#### class: Audit

- `run` <[function]> Start auditing. Each url in error is tried two more times before being marked in error.
    * returns <[Promise]<[Report]>>

#### class: Scenario

- `run` <[function]> Start auditing
    * returns <[Promise]<[Report]>>

#### Report

An audit or a scenario return a report with the following structure (which is essentially legacy).

- `count` <[Object]>
  * `total` <[Number]> Aggregated number of tests
  * `pass` <[Number]> Aggregated number of successes
  * `error` <[Number]> Aggregated number of errors
  * `warning` <[Number]> Aggregated number of warnings
  * `notice` <[Number]> Aggregated number of notices
- `numElements` <[Number]> Aggregated number of HTML elements in all audited pages
- `urls` <[Array<[URLResult]>]> List of url results (one per url audited). Contains axe results.
- `root` <[String]> First URL that triggered the audit

#### URLResult

A URLResult contains axe results for one URL.

- `count` <[Object]>
  * `total` <[Number]> Aggregated number of tests
  * `pass` <[Number]> Aggregated number of successes
  * `error` <[Number]> Aggregated number of errors
  * `warning` <[Number]> Aggregated number of warnings
  * `notice` <[Number]> Aggregated number of notices
- `numElements` <[Number]> Number of HTML elements in the page.
- `results` <[Array<[Violation]>]> List of violations (yes it contains only violations).
- `local` <[String]> Relative filepath to source code from public folder root. Default: `''`.
- `image` <[String]> Relative filepath to screen capture from public folder root. Default: `''`.
- `exception` <[String]> Error message if this url failed during audition.

#### Violation

A violation represent an axe error on a specific node.

- `code` <[String]> Error label.
- `type` <[String]>. Fixed to `error`.
- `message` <[String]> Error message.
- `selector` <[Array<[String]>]> List of HTML node elements. 



[Array]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array "Array"
[boolean]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type "Boolean"
[Buffer]: https://nodejs.org/api/buffer.html#buffer_class_buffer "Buffer"
[function]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function "Function"
[Number]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type "Number"
[Object]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object "Object"
[Promise]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise "Promise"
[String]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type "String"
[Error]: https://nodejs.org/api/errors.html#errors_class_error "Error"
[iterator]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols "Iterator"
[Audit]: #class-audit "Audit"
[Scenario]: #class-scenario "Scenario"
[Report]: #report "Report"
[URLResult]: #urlresult "URLResult"
[Page]: https://github.com/GoogleChrome/puppeteer/blob/v0.11.0/docs/api.md#class-page "Page"
[puppeteer-api]: https://github.com/GoogleChrome/puppeteer/blob/v0.11.0/docs/api.md "Puppeteer"
[Promise]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise "Promise"
