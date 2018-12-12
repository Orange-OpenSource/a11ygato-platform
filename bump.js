#!/usr/bin/env node

/*
    @license
    @a11ygato/platform
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

'use strict';

const meow = require('meow');
const Listr = require('listr');
const path = require('path');
const fs = require('fs');
const util = require('util');
const chalk = require('chalk');

const cli = meow(`
    Usage
      $ ./bump.js <version>
 
    Options
      -h  Show help
 
    Examples
      $ ./bump.js 0.1.0
`, {
    description:'Bump all package.json and package-lock.json files',
    flags: {
        help: {
            type: 'boolean',
            alias: 'h'
        }
    }
});

if(cli.flags.help) return cli.showHelp(0);

const newVersion = cli.input[0];
if(!newVersion) return cli.showHelp(1);

const writeFile = util.promisify(fs.writeFile);

const tasks = new Listr([
    {
        title:'a11ygato-platform',
        task: () => updateModule('.')
    },
    {
        title:'@a11ygato/audit-engine',
        task: () => updateModule(path.join('modules', 'audit-engine'))
    },
    {
        title:'@a11ygato/cli',
        task: () => updateModule(path.join('modules', 'cli'))
    },
    {
        title:'@a11ygato/dashboard',
        task: () => updateModule(path.join('modules', 'dashboard'))
    },
    {
        title:'@a11ygato/webservice',
        task: () => updateModule(path.join('modules', 'webservice'))
    },
]);

tasks.run().catch(err => {
    console.log();
    console.error(chalk.red(err && err.message || err));
});


////////////////////////////////////////////////////////////////////////////

function updateModule(folder) {
    const pkg = '.' + path.sep + path.join(folder, 'package.json');
    const pkgLock = '.' + path.sep + path.join(folder, 'package-lock.json');
    const promises = [];
    [pkg, pkgLock].forEach(file => {
        const content = require(file);
        content.version = newVersion;
        promises.push(writeFile(file, JSON.stringify(content, null, '    '), 'utf8'));
    });
    return Promise.all(promises);
}
