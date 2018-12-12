
# Overview

```bash 
a11ygato audit <url|script> <options>
```

## Arguments

There is only one mandatory argument which is either the URL to audit or a file path to a script.

```bash
a11ygato audit https://www.orange.fr
a11ygato audit ./script.js
```

The binary returns 0 if audit goes to the end whatever the score or a positive integer when failing. 
When using the `max-kpi` option, you can force it to exit with a error code when score is above a threshold.

## Options

#### -d, --depth <depth>

Define how many levels of crawling may be done. Indeed, when a URL is audited, if `depth` is > 0 and/or `limit` > 1, 
the engine will parse the source in search of new URL from the same domain and add them to the audit.

Default: `0` (provided URL only).

#### -l, --limit <limit>

Maximum number of URL that may be audited independently of the depth.

Default: `1`.

#### -c, --concurrency <concurrency>

Maximum number of URL audited in parallel.

Default: `1`.

#### -t, --timeout <timeout>

Timeout (in ms) used in several places notably when running axe tests.

Default: `60000` (1min).

Be aware that some very large site might solicit axe for several minutes before getting the results back.

#### -f, --format <format>

Output format. Default behavior will only log results in console. Possible values: `console`, `junit`, `json`.

Default: `console`.

#### -o, --output <output>

Location were report is saved (absolute or relative path). To be used in conjunction with `-f`. Ignore if the format is `console`.

Default: `./audit-report.xml`

#### -b, --public-folder <publicFolder>

Absolute or relative path to the folder that will store screen captures and source codes.

Default: `./public`

#### -a, --axe-script

Define the path to axe core javascript file. 

Default: searched in a local `node_modules` folder.

#### -y, --proxy <proxy>

Complete url to use in order to reach the audited site. Used by engines (phantom, chrome).

#### -k, --max-kpi <kpi>

Integer threshold above which the process exit with an error code. Useful for CI environment. 
It means that if your audit score is more than <kpi>, you want to exit in error.
Reminder: the lower, the better.

#### -u, --url-filter <regex>

Regular expression content (without // or flags) that allows you to bypass the default crawling algorithm and decide precisely which urls are
selected by the crawler.

## Examples

Generate a JUnit report for `https://twitter.com` audition by crawling a maximum of 5 URLs with a concurrency of 5 using
a local proxy:

```bash
a11ygato audit https://twitter.com -f junit -d 10 -c 5 -l 5 -y http://127.0.0.1:8888
```

Generate a JUnit report for `https://www.orange.fr/portail` by crawling at most 10 urls and using the following regular expression
`^https?:\/\/(.*\.)?orange\.[a-z]{2,3}($|\/)` to select which urls are kept by the crawler:

```bash
a11ygato audit https://www.orange.fr/portail -l 10 -f junit -u "^https?:\/\/(.*\.)?orange\.[a-z]{2,3}($|\/)"
```
