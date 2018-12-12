/*
    @license
    @a11ygato/dashboard
    Copyright (C) 2018 Orange

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/*
    @license
    This file is part of pa11y-dashboard.

    pa11y-dashboard is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    pa11y-dashboard is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with pa11y-dashboard.  If not, see <http://www.gnu.org/licenses/>.
*/

'use strict';

const fs = require('fs');
const http = require('http');
const https = require('https');
const async = require('async');
const chalk = require('chalk');
const morgan = require('morgan');
const VError = require('verror');
const express = require('express');
const _ = require('underscore');
const hbs = require('express-hbs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const pkg = require('./package.json');
const EventEmitter = require('events').EventEmitter;
const createClient = require('./core/createClient');

const Configuration = require('./core/Configuration');

////////////////////////////////////////////////////////////////////

const app = new EventEmitter();
app.init = init;

module.exports = app;

//////////////////////////////////

// Initialise the application
function init(rawConfig, callback) {

    const config = new Configuration(rawConfig);

    try {
        config.validate();
    } catch (err) {
        return callback(new VError(err, 'Configuration file is invalid'));
    }

    config.webServiceUrl = 'https://' + config.webservice.host + ':' + config.webservice.port + '/';

    app.config = config;
    app.express = express();

    // This is a wrapper object for web services exposed by the webservice module (HAPI server).
    app.webservice = createClient(config.webServiceUrl);

    // Wrapper function to access `app.webservice` but with the right `Authorization` token read from cookies.
    app.ws = function (req) {
        app.webservice.token = req && req.cookies && req.cookies.token || null;
        return app.webservice;
    };

    // Enable reverse proxy support in Express. This causes the
    // the "X-Forwarded-Proto" header field to be trusted so its
    // value can be used to determine the protocol. See
    // http://expressjs.com/api#app-settings for more details.
    // app.enable('trust proxy');

    // Add a handler to inspect the req.secure flag (see
    // http://expressjs.com/api#req.secure). This allows us
    // to know whether the request was via http or https.
    app.express.use(function (req, res, next) {
        if (req.secure) {
            next();
        } else {
            // HTTP => HTTPS
            // If NAt is setted, there is probably a redirection on host between tls.nat and tls.port.
            const tlsPort = config.tls.nat || config.tls.port;
            res.redirect(`https://${req.headers.host.split(':')[0]}:${tlsPort}${req.url}`);
        }
    });

    // Log requests
    app.express.use(morgan('dev'));

    // Compression middleware
    app.express.use(express.compress());

    // Cookie parser middleware
    app.express.use(cookieParser());

    // Public files
    app.express.use(express.static(__dirname + '/public', {
        maxAge:(process.env.NODE_ENV === 'production' ? 604800000 : 0)
    }));

    // General express config
    app.express.disable('x-powered-by');
    app.express.use(express.bodyParser());

    // View engine
    app.express.set('views', __dirname + '/view');
    app.express.engine('html', hbs.express3({
        extname:'.html',
        contentHelperName:'content',
        layoutsDir:__dirname + '/view/layout',
        partialsDir:__dirname + '/view/partial',
        defaultLayout:__dirname + '/view/layout/default'
    }));
    app.express.set('view engine', 'html');

    // View helpers
    require('./view/helper/date')();
    require('./view/helper/string')();
    require('./view/helper/url')();
    require('./view/helper/condition')();

    // Populate view locals
    app.express.locals({
        lang:'en',
        year:(new Date()).getFullYear(),
        version:pkg.version,
        repo:pkg.homepage,
        bugtracker:pkg.bugs,
        readonly:config.readonly,
        siteMessage:config.siteMessage,
        analyticsAccountId:config.analytics,
        title:'A11YGATO',
        description:`A11YGATO is a suite of tools for accessibility including a web dashboard, a CLI and a node API.
        The engine behind allows you to audit sites either from a root URL (with crawl) or with a Puppeteer script to be more precise.
        You may also schedule audits in time and follow their evolution by supervising their score over a nice chart.`
    });

    // Complete locals at runtime based on request attributes
    app.express.use(function (req, res, next) {

        res.locals.isHomePage = (req.path === '/');
        res.locals.host = req.host;

        var token = req.cookies && req.cookies.token && req.cookies.token.replace('Bearer ', '');
        if (!token) return next();

        fs.readFile(config.auth.publicKey, function (err, publicKeyContent) {
            if (err) return next(err);
            app.config.publicKeyContent = publicKeyContent;
            jwt.verify(token, publicKeyContent, {algorithms:['RS256']}, function (err, payload) {
                if (err) return next(err);
                req.credentials = payload;
                res.locals.isLoggedIn = true;
                res.locals.firstName = payload.firstName;
                res.locals.lastName = payload.lastName;
                res.locals.email = payload.email;
                next();
            });
        });
    });

    // Load routes
    require('./route/index')(app);
    require('./route/auth/sign-in')(app);
    require('./route/auth/sign-up')(app);
    require('./route/auth/logout')(app);
    if (!config.readonly) {
        require('./route/task/new')(app);
        require('./route/task/delete')(app);
        require('./route/task/run')(app);
        require('./route/task/edit')(app);
    }
    require('./route/task/index')(app);
    require('./route/result/index')(app);
    require('./route/result/url')(app);
    require('./route/result/download')(app);
    require('./route/result/delete')(app);

    // If no route was matched, the requested route is unknown to us, thus we return a 404.
    app.express.get('*', function (req, res) {
        res.status(404);
        res.render('404');
    });

    // Error handling
    app.express.use(function (err, req, res, next) { // eslint-disable-line no-unused-vars

        // Handle 401 error from webservice module (HAPI server)
        if (err.statusCode === 401) {
            return res.redirect('/sign-in?to=' + encodeURIComponent(req.originalUrl));
        }

        // Handle bad connection to webservice module (HAPI server)
        if (err.code === 'ECONNREFUSED') {
            err = new Error('Could not connect to the webservice module');
        }

        // Log
        app.emit('route-error', err);

        // Generic process that render a 500 error page.
        if (process.env.NODE_ENV !== 'production') {
            res.locals.error = err;
        }

        const statusCode = err.statusCode || 500;
        res.status(statusCode);
        res.render('' + statusCode);
    });

    // Create HTTP and HTTPS servers
    async.parallel({
        http:function (done) {
            const server = http.createServer(app.express);
            server.listen(config.port, function (err) {
                if (err) return done(err);
                const address = server.address();
                console.log(chalk.grey(`Listening on: http://${address.address}:${address.port}`));
                done(null, server);
            });
        },
        https:function (done) {
            const httpsOptions = {
                key:fs.readFileSync(config.tls.privateKey),
                cert:fs.readFileSync(config.tls.certificate)
            };
            const server = https.createServer(httpsOptions, app.express);
            server.listen(config.tls.port, function (err) {
                if (err) return done(err);
                const address = server.address();
                console.log(chalk.grey(`Listening on: https://${address.address}:${address.port}`));
                done(null, server);
            });
        }
    }, (err, results) => {
        if (err) return callback(err);
        app.server = {};
        app.server.http = results.http;
        app.server.https = results.https;
        callback();
    });

    // Log error with stack trace
    app.on('route-error', err => console.error('Route:', err));

    extendUnderscore();

}

function extendUnderscore() {
    _.mixin({
        deepDefaults:function (obj, defaults) {
            if (obj == null || defaults == null) return obj;
            var keys = _.keys(defaults);
            for (var i = 0, length = keys.length; i < length; i++) {
                var key = keys[i];
                if (obj[key] == null || obj[key] === '') obj[key] = defaults[key];
            }
            return obj;
        }
    });
}
