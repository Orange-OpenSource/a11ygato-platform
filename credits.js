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

const util  = require('util');
const fs    = require('fs');
const meow  = require('meow');
const Listr = require('listr');
const path  = require('path');
const chalk = require('chalk');
var checker = require('license-checker');

const cli = meow(`
    Usage
      $ ./credits.js
 
    Options
      -h  Show help
 
    Examples
      $ ./credits.js
`, {
    description:'Generate CREDITS.md for each module',
    flags:{
        help:{
            type:'boolean',
            alias:'h'
        }
    }
});

if(cli.flags.help) return cli.showHelp(0);

const writeFile = util.promisify(fs.writeFile);

const checkLicences = util.promisify(checker.init);

const tasks = new Listr([
    {
        title:'a11ygato-platform',
        task:() => generateCredits()
    },
    {
        title:'@a11ygato/audit-engine',
        task:() => generateCredits(path.join('modules', 'audit-engine'))
    },
    {
        title:'@a11ygato/cli',
        task:() => generateCredits(path.join('modules', 'cli'))
    },
    {
        title: '@a11ygato/dashboard',
        task: () => generateCredits(path.join('modules', 'dashboard'))
    },
    {
        title:'@a11ygato/webservice',
        task:() => generateCredits(path.join('modules', 'webservice'))
    }
]);

tasks.run().catch(err => {
    console.log();
    console.error(chalk.red(err && err.message || err));
});

/////////////////

async function generateCredits(folder = '.') {
    const dependencies = await checkLicences({ start:folder });
    const keys         = Object.keys(dependencies);
    let buffer         = `# Credits (${keys.length})\n\n`;
    let currentLicense = '';
    keys.map(key => {
        const dep = dependencies[key];
        dep.key   = key;
        return dep;
    }).sort((a, b) => {
        if(a.licenses < b.licenses){
            return -1;
        }
        if(a.licenses > b.licenses){
            return 1;
        }
        if(a.licenses === b.licenses){
            if(a.publisher < b.publisher){
                return -1;
            }
            if(a.publisher > b.publisher){
                return 1;
            }
        }
        return 0;
    }).forEach(dep => {
        if(dep.licenses !== currentLicense) buffer += `## ${dep.licenses}\n\n`;
        currentLicense = dep.licenses;
        // console.log('dep:', dep);
        buffer += '- ';
        if(dep.repository){
            buffer += `[${dep.key}](${dep.repository})`;
        } else{
            buffer += `${dep.key}`;
        }
        if(dep.publisher){
            if(dep.email){
                buffer += ` from [${dep.publisher}](mailto:${dep.email})`;
            } else{
                buffer += ` from ${dep.publisher}`;
            }
        }
        // if(dep.licenses){
        //     buffer += ` (${dep.licenses})`;
        // }
        buffer += '\n';
    });
    return writeFile(path.join(folder, 'CREDITS.md'), buffer, 'utf8');
}
