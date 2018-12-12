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

const fs     = require('fs');
const Joi    = require('joi');
const util   = require('util');
const path   = require('path');
const VError = require('verror');
const _      = require('lodash');

const Utils           = require('../common/Utils');
const defaultSettings = require('../common/defaultSettings');

// Cached settings
let _settings;

const exists = util.promisify(fs.exists);

// JSON schema for basic validation
const schema = Joi.object().keys({
    publicFolder:Joi.string().uri({ allowRelative:true }).empty('').allow(null),
    axeScript:Joi.string().uri({ allowRelative:true }).empty('').allow(null),
    includeRawAxeResults:Joi.boolean(),
    screenshotFilename:Joi.string().uri({ allowRelative:true }).empty('').allow(null),
    sourceFilename:Joi.string().uri({ allowRelative:true }).empty('').allow(null),
    concurrentInstances:Joi.number().positive().min(1).max(100),
    proxy:Joi.string().empty('').allow(null),
    // Keeping dual configuration for now but it will probably go away soon.
    // Chrome is the only choice now !
    chrome:Joi.object().keys({
        enabled:Joi.boolean().default(true)
    }),
    phantom:Joi.object().keys({
        enabled:Joi.boolean().default(false),
        logLevel:Joi.string().valid('debug', 'info', 'warn', 'error').default('info')
    })
}).unknown();

//////////////

module.exports = { get, set };

//////////////

function get() {
    if(_settings == null) throw new Error('Settings have not been initialized');
    return _settings;
}

async function set(settings) {

    settings = _.defaultsDeep({}, settings, defaultSettings);

    // Basic validation
    Joi.assert(settings, schema);

    if(settings.axeScript){
        // if axeScript is provided, let's verify it is accessible,
        try{
            await exists(settings.axeScript);
        }
        catch(err){
            console.warn('Axe script file provided not found. Searching a valid one in node_modules folder…');
            settings.axeScript = await searchAxeScriptFile();
        }
    }
    else{
        console.warn('Axe script not provided. Searching in node_modules folder…');
        settings.axeScript = await searchAxeScriptFile();
    }

    console.info('Using axe script:', settings.axeScript);

    // Settings accepted !
    _settings = settings;
    console.log('Settings:', Utils.stringify(_settings));
    return _settings;

}

// if axeScript is empty, let's try to find it in local node_modules
async function searchAxeScriptFile() {
    try{
        var axeFile = path.resolve(require.resolve('axe-core/axe.min.js'));
    }
    catch(err){
        try{
            axeFile = path.resolve(require.resolve('axe-core/axe.js'));
        }
        catch(err){
            throw new VError(err, 'Axe script not found in node_modules. Did you installed it?');
        }
    }

    return axeFile;
}
