#!/usr/bin/env node

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

'use strict';

const fs   = require('fs');
const util = require('util');

const Joi     = require('joi');
const chalk   = require('chalk');
const _       = require('lodash');
const program = require('commander');

const Runner       = require('../lib/runner/Runner');
const CommonHelper = require('../lib/common/CommonHelper');
const Err          = require('../lib/common/Err');


// Safety net
CommonHelper.setup();

const customJoi = extendJoi();

// JSON schemas used to validate CLI options
const urlSchema = Joi.object().keys({
    url:Joi.string().required().empty('').uri().label('url'),
    depth:Joi.number().integer().min(0).allow(null).empty('').label('depth'),
    concurrency:Joi.number().integer().min(1).max(5).allow(null).empty('').label('concurrency'),
    limit:Joi.number().integer().min(1).max(200).allow(null).empty('').label('limit'),
    timeout:Joi.number().integer().min(0).allow(null).empty('').label('timeout'),
    urlFilter:customJoi.string().validRegex().allow(null).empty('').label('url-filter')
});

const scenarioSchema = Joi.object().keys({
    scenario:Joi.string().required().empty('').label('scenario')
});

const settingsSchema = Joi.object().keys({
    axeScript:customJoi.string().existingFile().allow(null).empty('').label('axe-script'),
    publicFolder:Joi.string().allow(null).empty('').label('public-folder'),
    proxy:Joi.string().allow(null).empty('').label('proxy'),
    output:Joi.string().uri({ allowRelative:true }).allow(null).empty('').label('output'),
    format:Joi.string().valid('junit', 'console', 'json').default('console').allow(null).empty('').label('format')
});

const ciSchema = Joi.object().keys({
    maxKpi:Joi.number().integer().min(0).allow(null).empty('').label('maxKpi')
});

// Describe a CLI contract and parse inputs from prompt according to this contract.
program
    .option('-V, --verbose', 'Verbose output')
    .option('-d, --depth <depth>', 'Maximum depth when crawling the page searching for new links')
    .option('-l, --limit <limit>', 'Maximum number of links audited')
    .option('-c, --concurrency <concurrency>', 'Maximum number of links audited in parallel')
    .option('-t, --timeout <timeout>', 'Timeout used in several places notably when running axe tests')
    .option('-y, --proxy <proxy>', 'Proxy to be used by engines')
    .option('-f, --format <format>', 'Report format. Default behavior will only log results.')
    .option('-o, --output <output>', 'Output path where report is saved.')
    .option('-a, --axe-script <axeScript>', 'Path to axe script file')
    .option('-b, --public-folder <publicFolder>', 'Path to public folder storing screen captures and source code')
    .option('-k, --max-kpi <kpi>', 'Maximum KPI to validate audit')
    .option('-u, --url-filter <regex>', 'Regular expression that define which urls are kept by the crawler')
    .parse(process.argv);


let verbose = false;

// At least used in the audit-engine module for chrome debugging.
if(program.verbose){
    verbose = process.env.VERBOSE = true;
    console.log('args:', program.args);
}

(async () => {

    let task, settings;

    try{
        // Check there is a main arg (which is mandatory)
        const uri = program.args && program.args.length && program.args[0];
        if(!uri) exit(Err.invalidArgument('main arg should be either a page url or an existing scenario file'));

        // Check settings parameters
        settings = _.pick(program, 'axeScript', 'publicFolder', 'proxy', 'format', 'output');
        if(verbose) console.log('Input settings:', settings);
        settings                      = validate(settings, settingsSchema);
        settings.includeRawAxeResults = true;

        // Determine audit type (url or scenario).
        if(isURL(uri)){
            program.url = uri;
        }
        else{
            const scenario = await getScenario(uri);
            if(scenario)
                program.scenario = scenario;
            else
                exit(Err.invalidArgument('main arg should be either a page url or an existing scenario file'));
        }

        // Check task parameters
        if(program.url){
            task = _.pick(program, 'url', 'depth', 'limit', 'concurrency', 'timeout', 'urlFilter');
            if(verbose) console.log('Input task:', task);
            task = validate(task, urlSchema);
        }
        else if(program.scenario){
            task = _.pick(program, 'scenario');
            if(verbose) console.log('Input task:', task);
            task = validate(task, scenarioSchema);
        }
    }
    catch(err){
        exit(err);
    }

    let report, error;
    const runner   = new Runner(task, settings);
    const shutdown = runner.shutdown.bind(runner);

    try{
        CommonHelper.registerUncaughtExceptionHandler(shutdown);
        report = await runner.run();
        if(_.some(report.urls, 'exception') || report.exception){
            console.log(chalk.yellow('Audit completed with errors:', util.inspect(report, { depth:2 })));
        } else{
            console.log('Audit completed:', util.inspect(report, { depth:2 }));
        }
    }
    catch(err){
        if(process.env.VERBOSE) console.trace(err);
        error = err;
    }
    finally{
        CommonHelper.removeUncaughtExceptionHandler(shutdown);
        await shutdown();

        // Check maxKpi if setted
        if(program.maxKpi){
            const ci     = _.pick(program, 'maxKpi');
            const maxKpi = validate(ci, ciSchema).maxKpi;
            console.log('Maximum KPI setted to:', maxKpi);
            const kpi = Math.floor((report.count.error / report.numElements) * 1000);
            console.log('Actual KPI is:', kpi);
            if(kpi > maxKpi) error = new Error(`With a KPI of ${kpi}, this audit has too much errors`);
        }
    }

    exit(error);

})();


////////////

function isURL(uri) {
    try{
        return validate(uri, Joi.string().required().empty('').uri().label('url'));
    }
    catch(err){
        if(verbose) console.log('Main arg is not a URL');
        return false;
    }
}

async function getScenario(uri) {
    try{
        const readFile = util.promisify(fs.readFile);
        return readFile(uri, 'utf8');
    }
    catch(err){
        if(verbose) console.error('Main arg is not an existing scenario file:', err);
        return false;
    }
}

// Create a new validation for String values.
function extendJoi() {
    return Joi.extend({
        base:Joi.string(),
        name:'string',
        language:{
            existingFolder:': folder doesn\'t exist or is not a folder',
            existingFile:': script file doesn\'t exist or is not a file',
            validRegex:'needs to be a valid regular expression'
        },
        rules:[
            {
                name:'existingFolder',
                validate:function(params, value, state, options) {
                    if(!fs.existsSync(value)){
                        return this.createError('string.existingFolder', { v:value }, state, options);
                    }
                    if(!fs.statSync(value).isDirectory()){
                        return this.createError('string.existingFile', { v:value }, state, options);
                    }
                    return value; // Everything is OK
                }
            },
            {
                name:'existingFile',
                validate:function(params, value, state, options) {
                    if(!fs.existsSync(value)){
                        return this.createError('string.existingFile', { v:value }, state, options);
                    }
                    if(!fs.statSync(value).isFile()){
                        return this.createError('string.existingFile', { v:value }, state, options);
                    }
                    return value; // Everything is OK
                }
            },
            {
                name:'validRegex',
                validate:function(params, value, state, options) {
                    try{
                        new RegExp(value);
                    } catch(ex){
                        return this.createError('string.validRegex', { v:value }, state, options);
                    }
                    return value;
                }
            }
        ]
    });
}

// Alias for clarity.
function validate(value, schema) {
    return Joi.attempt(value, schema);
}

