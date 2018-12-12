/*
    @license
    @a11ygato/audit-engine
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

// This class is a very simple logger that is used by Scenario, Audit and Job classes to ensure we can track precisely what happens
// per scenario, audit and job.
class Logger {

    constructor(prefix) {
        this.prefix = prefix;
    }

    // Wrapper for console.log.
    debug() {
        console.log(chalk.grey(`${this.prefix}`), ...arguments);
    }

    // Wrapper for console.log.
    info() {
        console.log(`${this.prefix}`, ...arguments);
    }

    // Wrapper for console.log.
    warn() {
        console.log(chalk.yellow(`${this.prefix}`), ...arguments);
    }

    // Wrapper for console.log.
    error() {
        console.error(chalk.red(`${this.prefix}`), ...arguments);
    }

}


module.exports = Logger;
