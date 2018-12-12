/*
    @license
    @a11ygato/webservice
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
    This file is part of pa11y-webservice.

    pa11y-webservice is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    pa11y-webservice is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with pa11y-webservice.  If not, see <http://www.gnu.org/licenses/>.
*/

'use strict';

const fs   = require('fs');
const util = require('util');

const Q           = require('q');
const Hapi        = require('hapi');
const async       = require('async');
const VError      = require('verror');
const MongoClient = require('mongodb').MongoClient;

const auditEngine   = require('@a11ygato/audit-engine');
const Configuration = require('./common/Configuration');


const app = {
    init,
    shutdown
};

module.exports = app;


///////////////////////


function shutdown(exitCode) {
    console.warn('*************************************************************');
    console.warn('KILLING SERVER...');
    // Destroying pools.
    return auditEngine.shutdown().then(function() {
        console.log('Pools drained');
        console.warn('*************************************************************');
        // return pool.clear();
        process.exit(exitCode);
    });
}

// Initialise the application
function init(rawConfig, callback) {

    // Better debugging with Q
    Q.longStackSupport = true;

    const config = new Configuration(rawConfig);

    try{
        config.validate();
    }
    catch(err){
        return callback(new VError(err, 'Configuration file is invalid'));
    }

    // Define and exports global object app. Override previous export a few line above !!!
    app.database = null;
    app.model    = {};
    app.config   = config;

    const httpsOptions = {
        key:fs.readFileSync(config.tls.privateKey),
        cert:fs.readFileSync(config.tls.certificate)
    };

    // Define server network configuration
    const server = app.server = new Hapi.Server();
    server.connection({ host:config.host, port:config.port, labels:['https'], tls:httpsOptions });

    // Log verbosely internal events of type ERROR in order to understand what is happening behind the scene.
    process.env.VERBOSE && server.on('request-internal', function(request, event, tags) {
        if(tags.error){
            console.error(`
            == LOG OF INTERNAL EVENTS OF TYPE ERROR FOR DEBUGGING: ==
            
            Event tags:  ${Object.keys(tags)}
            
            Event timestamp: ${event.timestamp}
            
            Event data: ${util.inspect(event.data)}
            
            == END OF LOG ==
            `);
        }
    });

    // Execute in sequence asynchronous functions. If one fails, the sequence is interrupted and the callback is invoked
    // with the corresponding error.
    async.series([
        guardAgainstUncaughtException(enableHapiLogging),
        guardAgainstUncaughtException(enableStaticFileServer),
        guardAgainstUncaughtException(enableJWTAuthentication),
        guardAgainstUncaughtException(initDatabaseLink),
        guardAgainstUncaughtException(initResultsCollection),
        guardAgainstUncaughtException(initTasksCollection),
        guardAgainstUncaughtException(initUsersCollection),
        guardAgainstUncaughtException(startScheduler),
        guardAgainstUncaughtException(startServer),
        guardAgainstUncaughtException(configureAuditEngine)
    ], function(err) {
        callback(err);
    });

    ///////////////////

    // Register a console logger for Hapi events
    function enableHapiLogging(next) {
        const options = {
            ops:{
                interval:1000
            },
            reporters:{
                myConsoleReporter:[{
                    module:'good-squeeze',
                    name:'Squeeze',
                    args:[{
                        log:'*',
                        response:'*',
                        start:'*',
                        stop:'*',
                        request:'*',
                        'request-internal':'*',
                        'request-error':'*',
                        tail:'*',
                        route:'*'
                    }]
                }, {
                    module:'good-console'
                }, 'stdout']
            }
        };
        server.register({ register:require('good'), options:options }, next);
    }

    // Register a static file server for Hapi
    function enableStaticFileServer(next) {
        server.register(require('inert'), next);
    }

    // Register a JWT middleware that handles authentication
    function enableJWTAuthentication(next) {

        server.register(require('hapi-auth-jwt2'), function(err) {
            if(err){
                console.error(err);
                return next(err);
            }
            console.log('public key:', config.auth.publicKey);
            fs.readFile(config.auth.publicKey, function(err, publicKey) {
                if(err) return next(err);
                console.log('Using public key to verify JWT tokens:', publicKey);
                const strategyOptions = {
                    key:publicKey,          // Never Share your secret key
                    verifyFunc:validate,    // validate function defined above
                    verifyOptions:{ algorithms:['RS256'] } // pick a strong algorithm
                };
                // Create a strategy named `jwt` that uses the scheme `jwt` exposed by `hapi-auth-jwt2`.
                // The `true` parameter will enable authentication and thus protect all routes.
                server.auth.strategy('jwt', 'jwt', true, strategyOptions);
                next();
            });
        });

        //////////////

        function validate(decoded, request, done) {
            // Do your checks to see if the person is real
            app.model.auth.findUser(decoded.email, function(err, user) {
                return done(err, user != null);
            });
        }
    }

    // Connect to mongodb server
    function initDatabaseLink(next) {
        MongoClient.connect(config.database, function(err, db) {
            if(err) return next(err);
            console.log('Mongo connected');
            app.db = db;
            next();
        });
    }

    // Load the results collection from db
    function initResultsCollection(next) {
        require('./model/result')(app, function(err, resultModel) {
            if(err) return next(err);
            app.model.result = resultModel;
            next();
        });
    }

    // Load the tasks collection from db
    function initTasksCollection(next) {
        require('./model/task')(app, function(err, taskModel) {
            if(err) return next(err);
            app.model.task = taskModel;
            next();
        });
    }

    // Load the tasks collection from db
    function initUsersCollection(next) {
        require('./model/auth')(app, function(err, authModel) {
            if(err) return next(err);
            app.model.auth = authModel;
            next();
        });
    }

    // Start a cron job for pa11y tasks.
    function startScheduler(next) {
        if(!config.dbOnly && process.env.NODE_ENV !== 'test'){
            const scheduler = require('./schedule/scheduler');
            scheduler.init(app, next);
        } else{
            next();
        }
    }

    // Load routes and start server
    function startServer(next) {
        if(!config.dbOnly){
            // Define a route for static content from the publicFolder directory
            server.route({
                method:'GET',
                path:'/fileserver/{param*}',
                handler:{
                    directory:{
                        path:config.engine.publicFolder,
                        listing:true
                    }
                }
            });
            // Define collection routes like creating a new task
            require('./route/tasks')(app);
            // Define individual routes like running a task or deleting it
            require('./route/task')(app);
            // Define authentication routes.
            require('./route/auth')(app);
            // Start HAPI server
            server.start(next);
        } else{
            next();
        }
    }

    // Create pools of instances for Chrome and Phantom.
    async function configureAuditEngine(next) {
        try{
            await auditEngine.init(config.engine);
        }
        catch(err){
            return next(err);
        }
        next();
    }

    function guardAgainstUncaughtException(fn) {
        return function(next) {
            try{
                fn(next);
            }
            catch(ex){
                next(ex);
            }
        };
    }
}
