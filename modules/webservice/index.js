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

const chalk = require('chalk');

const app = require('./app');

// Error handler that receive CTRL-C sequence
process.once('SIGINT', function() {
    console.log('Received SIGINT');
    return app.shutdown(0);
});

// Global error handler
// https://nodejs.org/api/process.html#process_event_uncaughtexception
process.on('uncaughtException', function() {
    // https://github.com/nodejs/help/issues/942
    console.warn('⚠️  Just so you know, [uncaughtException] can be triggered by scenarios cause they share the same error handlers.');
});

// Global error handler
// https://nodejs.org/api/process.html#process_event_unhandledrejection
process.on('unhandledRejection', function() {
    // https://github.com/nodejs/help/issues/942
    console.warn('⚠️  Just so you know, [unhandledRejection] can be triggered by scenarios cause they share the same error handlers.');
});

const config = require('./config/' + (process.env.NODE_ENV || 'default'));
console.log('Using config:', config);

app.init(config, function(err) {

    if(err){
        console.error(chalk.red('Error starting the webservice:'), err.message || err);
        process.exit(1);
    }

    console.log(chalk.underline.cyan('webservice started'));
    console.log(chalk.grey('ENV: %s'), process.env.NODE_ENV  || 'default');
    for(const connection of app.server.connections){
        console.log(chalk.grey(`Listening on: ${connection.info.uri}`));
    }

    // Notify pm2 to consider our app "online".
    // Only children processes may invoke process.send().
    process.send && process.send('ready');
});
