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

const Joi       = require('joi');
const fs        = require('fs');
const { merge } = require('lodash');

const { defaultSettings:defaultEngineConfiguration } = require('@a11ygato/audit-engine');

//////////////////////////

const customJoi = extendJoi();

// JSON schema used to validate configuration files.
const schema = Joi.object().keys({
    database:Joi.string().required().label('Mongo database path'),
    host:Joi.string().hostname().allow(null).empty('').label('Webservice host').default('127.0.0.1', 'Default webservice hostname'),
    port:Joi.number().integer().min(1).label('Webservice port').default(344, 'Default webservice port'),
    auth:Joi.object().required().keys({
        publicKey:customJoi.string().existingFile().required().label('Public key used for JWT authentication'),
        privateKey:customJoi.string().existingFile().required().label('Private key used for JWT authentication')
    }),
    engine:Joi.object().keys({
        publicFolder:customJoi.string().existingFolder().allow(null).empty('').description('Folder where page screenshot and source code is saved during audit'),
        axeScript:customJoi.string().existingFile().allow(null).empty('').label('Axe script path on disk').description('Axe script location on disk. The `axe-core` package will be searched in `node_modules` if not provided.'),
        includeRawAxeResults:Joi.boolean().description('Should the engine include axe raw results? Default: false.'),
        screenshotFilename:Joi.string().allow(null).empty('').description('Filename used for screenshots during a page analysis. Default: page.png'),
        sourceFilename:Joi.string().allow(null).empty('').description('Filename used for source code during a page analysis. Default: source.html'),
        concurrentInstances:Joi.number().description('Number of concurrent instances. Default 15.'),
        proxy:customJoi.string().host().allow(null).empty('').description('Proxy used to connect the internet')
    }),
    tls:Joi.object().required().keys({
        privateKey:customJoi.string().existingFile().required().label('TLS private key used for HTTPS'),
        certificate:customJoi.string().existingFile().required().label('TLS certificate used for HTTPS')
    })
});

// Create new validations for String values.
function extendJoi() {
    return Joi.extend({
        base:Joi.string(),
        name:'string',
        language:{
            existingFolder:': folder doesn\'t exist or is not a folder',
            existingFile:': script file doesn\'t exist or is not a file',
            invalidHost:': invalid host ; expected `hostname:port`',
            invalidPort:'port should be a number less than 65535'
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
                name:'host',
                validate:function(params, value, state, options) {
                    if(!/^[a-zA-Z0-9.\-_]+:[0-9]{1,5}$/.test(value)){
                        return this.createError('string.invalidHost', { v:value }, state, options);
                    }
                    try{
                        const port = parseInt(value.split(':')[1]);
                        if(port <= 0 || port > 65535){
                            return this.createError('string.invalidPort', { v:value }, state, options);
                        }
                    }
                    catch(err){
                        return this.createError('string.invalidPort', { v:value }, state, options);
                    }
                    return value; // Everything is OK
                }
            }
        ]
    });
}

/////////////////////

class Configuration {

    constructor(conf) {
        // Conf provided in file.
        this.rawConf = conf;
    }

    validate() {
        // Validate provided conf upon schema and generate final configuration.
        let conf = Joi.attempt(this.rawConf, schema);
        // Save conf as properties of this class.
        merge(this, { engine:defaultEngineConfiguration }, conf);
        process.env.VERBOSE && console.log('CONFIG:', JSON.stringify(this, null, '    '));
        return conf;
    }
}

module.exports = Configuration;
