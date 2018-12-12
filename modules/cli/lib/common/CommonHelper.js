/*
    @license
    @a11ygato/cli
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

const chalk = require('chalk');
const VError = require('verror');
const path = require('path');


// Array of functions that will be invoked if an uncaught exception is triggered.
const handlers = new Set();

function invokeAllHandlers(){
    const promises = [];
    for(const handler of handlers) {
        promises.push(handler());
    }
    return Promise.all(promises);
}

class CommonHelper {

    static terminate(err) {
        if(!err) return process.exit(0);
        CommonHelper.logErr(err);
        const exitCode = err instanceof VError ? VError.info(err).exitCode || 1 : 1;
        process.exit(exitCode);
    }

    static logErr(err){
        console.log();
        process.env.VERBOSE
            ? console.error(chalk.red(VError.fullStack(err) || err))
            : console.error(chalk.red(err.message || err));
        console.log();
    }

    static registerUncaughtExceptionHandler(fn){
        handlers.add(fn);
    }

    static removeUncaughtExceptionHandler(fn){
        handlers.delete(fn);
    }

    static setup() {

        global.bin      = {};
        global.bin.root = path.join(path.dirname(path.dirname(__dirname)), 'node_modules', '.bin');
        global.bin.pm2  = path.join(global.bin.root, 'pm2');
        console.log('Using pm2 binary:', global.bin.pm2);

        // Error handler that receive CTRL-C sequence
        process.once('SIGINT', async () => {
            console.log('Received SIGINT');
            await invokeAllHandlers();
            exit();
        });

        // Global error handler
        // https://nodejs.org/api/process.html#process_event_uncaughtexception
        process.on('uncaughtException', async (err) => {
            console.error('Uncaught exception:', err);
            await invokeAllHandlers();
            exit(err);
        });

        // Global error handler
        // https://nodejs.org/api/process.html#process_event_unhandledrejection
        process.on('unhandledRejection', async (err) => {
            console.error('Unhandled exception in promise:', err);
            await invokeAllHandlers();
            exit(err);
        });

    }

    static stringify(obj) {
        return JSON.stringify(obj, null, '    ');
    }
}

global.exit = CommonHelper.terminate;

module.exports = CommonHelper;
