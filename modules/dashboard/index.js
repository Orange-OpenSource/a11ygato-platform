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
var chalk = require('chalk');

process.once('SIGINT', function() {
    console.log('Received SIGINT');
    process.exit(1);
});

// Global error handler
// https://nodejs.org/api/process.html#process_event_uncaughtexception
process.on('uncaughtException', function(err) {
    console.error('Uncaught exception:', err);
    process.exit(1);
});

// Global error handler
// https://nodejs.org/api/process.html#process_event_unhandledrejection
process.on('unhandledRejection', function(err) {
    console.error('Unhandled exception in promise:', err);
    process.exit(2);
});

var config = require('./config/' + (process.env.NODE_ENV || 'default'));
console.log('Using config:', config);

var app = require('./app');
app.init(config, function(err) {

    if(err){
        console.error(chalk.red('Error starting the dashboard:'), err.message || err);
        process.exit(1);
    }

    app.ws().alive.check(function (err) {

        if(err){
            console.error(chalk.red('webservice is not available:'), err.message || err);
            process.exit(1);
        }

        console.log('');
        console.log(chalk.underline.magenta('The dashboard started'));
        console.log(chalk.grey('ENV: %s'), process.env.NODE_ENV || 'default');

        // Notify pm2 to consider our app "online".
        // Only children processes may invoke process.send().
        process.send && process.send('ready');
    });

});
