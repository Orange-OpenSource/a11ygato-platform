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
const chalk = require('chalk');
const execa = require('execa');

const cli = meow(`
    Usage
      $ ./release.js <version>
 
    Options
      -h  Show help
      --no-ci Skip step 'npm ci'
 
    Examples
      $ ./release.js 0.1.0
`, {
    description:'Create a new release (reinstall dependencies, bump all versions, create commit with tag and push)',
    flags:{
        help:{
            type:'boolean',
            alias:'h'
        },
        ci:{
            type:'boolean',
            alias:'ci',
            default:true
        }
    }
});

if(cli.flags.help) return cli.showHelp(0);

const newVersion = cli.input[0];
if(!newVersion) return cli.showHelp(1);

const tasks = new Listr([
    {
        title:'Reinstall dependencies',
        skip:() => !cli.flags.ci,
        task:() => execa.shell('npm ci')
    },
    {
        title:'Bump all versions',
        task:() => execa.shell('./bump.js ' + newVersion)
    },
    {
        title:'Generate credits',
        task:() => execa.shell('./credits.js ')
    },
    {
        title:'Add files to stage',
        task:() => execa.shell('git add --all')
    },
    {
        title:'Commit',
        task:() => execa.shell(`git commit -m "chore: Mark version ${newVersion}"`)
    },
    {
        title:'Create tag',
        task:() => execa.shell(`git tag ${newVersion}`)
    },
    {
        title:'Push',
        task:() => execa.shell('git push && git push --tags')
    }
]);

tasks.run().catch(err => {
    console.log();
    console.error(chalk.red(err && err.message || err));
});

