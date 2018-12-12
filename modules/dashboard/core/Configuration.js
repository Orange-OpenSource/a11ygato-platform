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

const Joi = require('joi');
const fs  = require('fs');

//////////////////////////

const customJoi = extendJoi();

// JSON schema used to validate configuration files.
const schema = Joi.object().keys({
    port:Joi.number().integer().min(1).label('Dashboard HTTP port').default(80, 'Default HTTP port'),
    analytics:Joi.string().allow(null).empty('').label('Google Analytics account ID'),
    webservice:Joi.object().keys({
        host:Joi.string().hostname().allow(null).empty('').label('Webservice host').default('127.0.0.1', 'Default webservice hostname'),
        port:Joi.number().integer().min(1).label('Webservice port').default(3000, 'Default webservice port')
    }),
    auth:Joi.object().required().keys({
        publicKey:customJoi.string().existingFile().required().label('Public key used for JWT authentication')
    }),
    tls:Joi.object().required().keys({
        port:Joi.number().integer().min(1).label('Dashboard HTTPS port').default(443, 'Default HTTPS port'),
        nat:Joi.number().integer().min(1).label('Dashboard HTTPS port'),
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
            existingFile:': script file doesn\'t exist or is not a file'
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
            }
        ]
    });
}

/////////////////////

class Configuration {

    constructor(conf) {
        this.rawConf = conf;
    }

    validate() {
        // Validate provided conf upon schema and generate final configuration.
        const conf = Joi.attempt(this.rawConf, schema);
        // Save conf as properties of this class.
        Object.assign(this, conf);
        process.env.VERBOSE && console.log('CONFIG:', JSON.stringify(this, null, '    '));
        return conf;
    }
}

module.exports = Configuration;
