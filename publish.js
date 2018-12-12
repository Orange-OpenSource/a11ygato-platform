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

const meow  = require('meow');
const Listr = require('listr');
const execa = require('execa');
const chalk = require('chalk');

const path = require('path');
const fs = require('fs');
const util = require('util');

const cli = meow(`
    Usage
      $ ./publish.js <version>
 
    Options
      -h  Show help
      --no-ae Skip audit-engine
      --no-cli Skip the CLI
 
    Examples
      $ ./publish.js
`, {
    description:'Publish the CLI and the audit engine on NPM',
    flags:{
        help:{
            type:'boolean',
            alias:'h'
        },
        ae:{
            type:'boolean',
            default:true
        },
        cli:{
            type:'boolean',
            default:true
        },
    }
});

if(cli.flags.help) return cli.showHelp(0);

const writeFile = util.promisify(fs.writeFile);

const tasks = new Listr([
    {
        title:'Check logged in user',
        task:async () => {
            let result;
            try {
                result = await execa.shell('npm whoami');
            }
            catch(err){
                throwErr();
            }
            if(result.stdout !== 'a11ygato-user') throwErr();
            ////////////////////
            function throwErr(){
                throw new Error('Please log in into npm as a11ygato-user first');
            }
        }
    },
    {
        title:'Publish @a11ygato/audit-engine',
        skip:() => !cli.flags.ae,
        task:() => {
            return execa.shell('npm publish --access=public', {cwd: 'modules/audit-engine'});
        }
    },
    {
        title:'Publish @a11ygato/cli',
        skip:() => !cli.flags.cli,
        task:() => {
            return new Listr([
                {
                    title:'Set audit-engine dependency in package.json',
                    task:(ctx) => {
                        const cliPkgFile = ctx.cliPkgFile = '.' + path.sep + path.join('modules', 'cli', 'package.json');
                        const cliPkg = ctx.cliPkg = require(cliPkgFile);
                        cliPkg.dependencies['@a11ygato/audit-engine'] = '*';
                        return saveFile(cliPkgFile, cliPkg);
                    }
                },
                {
                    title:'Publish @a11ygato/cli',
                    task: () => {
                        return execa.shell('npm publish --access=public', {cwd: path.join('modules', 'cli')});
                    }
                },
                {
                    title:'Restore package.json',
                    task:(ctx) => {
                        ctx.cliPkg.dependencies['@a11ygato/audit-engine'] = '../audit-engine';
                        return saveFile(ctx.cliPkgFile, ctx.cliPkg);
                    }
                },
            ]);
        }
    }
]);

tasks.run().catch(err => {
    console.log();
    console.error(chalk.red(err && err.message || err));
});


////////////////////////////////////////////////////////////////////////////


function saveFile(file, content) {
    return writeFile(file, JSON.stringify(content, null, '    '), 'utf8');
}
