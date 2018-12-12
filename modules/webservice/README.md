
# @a11ygato/webservice

Provides a set of web services (REST) to the [dashboard](@a11ygato/dashboard). 

## Setup

Requires [Node][node] 8+ and [MongoDB][mongo] to be installed and running.

You may configure a profile in `./config/` folder. Configuration options are:

```javascript
module.exports = {
    // mongo db connection path
    database:'mongodb://127.0.0.1/some-database',
    // tcp host address this server should listen on
    host:'127.0.0.1',
    // tcp port this server should listen on
    port:3000,
    // Path to public RSA keys used to encrypt JWT tokens. 
    auth:{
        privateKey: "path/to/file.key",
        publicKey: "path/to/file.pem"
    },
    // See [@a11ygato/audit-engine](../audit-engine) documentation
    engine:{
        // Where to save screenshots notably
        publicFolder:'../public',
        axeScript:'./node_modules/axe-core/axe.min.js',
        concurrentInstances:5,
        proxy:'127.0.0.1:3128'
    },
    // Path to private and certificate files used for TLS connections (HTTPS).
    tls:{
        privateKey: "path/to/file.key",
        certificate: "path/to/file.crt"
    },
};
```

You may create as many as necessary config files and eventually inherit from `./default.js` to override specific attributes only. 

## Run

For a simple test, you might start this server manually, just prefix the start command with:

```sh
NODE_ENV=my-profile node index.js
```

**Be aware that you will never start this server directly. You should use the upper npm scripts of `a11ygato-platform`**

## Encryption

This server uses several couple of (public/private) keys for JWT authentication and HTTPS. More information in [Encryption](../../Encryption.md).

Then you should configure your config files accordingly:

```javascript
// config/default.js for instance
…
auth:{
    privateKey:'path/to/jwt/pally.key',
    publicKey:'path/to/jwt/pally.pem'
},
tls:{
    privateKey:'path/to/tls/pally.key',
    certificate:'path/to/tls/pally.crt'
}
…
```

## Authentication

All routes except the auth ones (sign-in, sign-up) are protected by a JWT token. 
This token should be provided in the request headers with the form `Bearer <token>`.
Not providing a token or an invalid one will end up in a 401 error response.

## Build

The build phase lint javascript code and that's all:

```bash
npm run lint
```

If you want to watch for changes:

```bash
npm run watch
```

## License

[Copyright 2013 Nature Publishing Group](LICENSE.txt).  
@a11ygato/webservice is licensed under the [GNU General Public License 3.0][gpl].

[gpl]: http://www.gnu.org/licenses/gpl-3.0.html
[mongo]: http://www.mongodb.org/
[node]: http://nodejs.org/
[phantom]: http://phantomjs.org/
[chrome-headless]: https://developers.google.com/web/updates/2017/04/headless-chrome
[@a11ygato/audit-engine]: https://github.com/Orange-OpenSource/a11ygato-platform/tree/master/modules/audit-engine
[@a11ygato/dashboard]: https://github.com/Orange-OpenSource/a11ygato-platform/tree/master/modules/dashboard
