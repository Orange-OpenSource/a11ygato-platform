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

const VError = require('verror');
const _      = require('lodash');


class AppError extends VError {
    // https://github.com/joyent/node-verror#constructors
    constructor(options, ...sprintfArgs) {
        super(options, ...sprintfArgs);
    }
}

class UrlAlreadyAuditedError extends AppError {
    constructor(options, ...sprintfArgs) {
        sprintfArgs = sprintfArgs || [];
        if(!sprintfArgs.length){
            const url = _.get(options, 'info.url');
            if(!url) throw new Error('Missing \'options.info.url\' argument');
            sprintfArgs.push('url %s already audited');
            sprintfArgs.push(url);
        }
        Object.assign(options, { name:'UrlAlreadyAuditedError', strict:true });
        super(options, ...sprintfArgs);
    }
}

class CancelledAuditError extends AppError {
    constructor(options, ...sprintfArgs) {
        sprintfArgs = sprintfArgs || [];
        if(!sprintfArgs.length) sprintfArgs.push('audit cancelled');
        Object.assign(options, { name:'CancelledAuditError', strict:true });
        super(options, ...sprintfArgs);
    }
}

class InvalidRedirectionError extends AppError {
    constructor(options, ...sprintfArgs) {
        sprintfArgs = sprintfArgs || [];
        if(!sprintfArgs.length){
            const sourceUrl = _.get(options, 'info.sourceUrl');
            const url = _.get(options, 'info.url');
            if(!sourceUrl) throw new Error('Missing \'options.info.sourceUrl\' argument');
            if(!url) throw new Error('Missing \'options.info.url\' argument');
            sprintfArgs.push(`You have been redirected from %s to %s. 
            For security and integrity reasons, we prefer to abort cause protocol and hostname don't match.
            You are free to edit your task and use the redirected url instead, if that's what you want.`);
            sprintfArgs.push(sourceUrl);
            sprintfArgs.push(url);
        }
        Object.assign(options, { name:'InvalidRedirectionError', strict:true });
        super(options, ...sprintfArgs);
    }
}


module.exports = {
    UrlAlreadyAuditedError,
    CancelledAuditError,
    InvalidRedirectionError
};
