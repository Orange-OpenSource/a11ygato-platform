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

const path    = require('path');
const _       = require('lodash');
const mkdirp  = require('mkdirp');
const shortid = require('shortid');
const util    = require('util');

const Utils  = require('../../common/Utils');
const Logger = require('../../common/Logger');


class Job {

    constructor(audit, url, depth = 0, run = 1) {

        if(!audit) throw new Error('Missing mandatory parameter: `audit`');
        if(!url) throw new Error('Missing mandatory parameter: `url`');

        this.audit = audit;

        // Generated
        this.id = shortid.generate();

        this.url   = url;
        this.depth = depth;
        this.run   = run;

        // Used for logging.
        this.logger = new Logger(`${audit.logger.prefix}J/${this.id} ‣ `);

        // Setted later dynamically at runtime when the job is executed
        this.timestamp          = null;
        this.resourcesDirectory = null;
        this.result             = null;
    }

    registerException(err) {
        this.result.exception = (err && err.message) || err;
    }

    createTimestamp() {
        this.timestamp = Utils.uniqueTimestamp() + '';
    }

    createResourcesDirectory() {
        this.resourcesDirectory = path.join(this.audit.settings.publicFolder, this.timestamp);
        mkdirp.sync(this.resourcesDirectory);
        this.logger.info('Resources directory is:', this.resourcesDirectory);
    }

    initResult() {
        // Result hash that we will fill in after each step during audit
        this.result       = Job.createResultStub(this.url);
        // Relative file names from public folder root. Will be used in urls, thus I'm not using `path.join`.
        this.result.local = this.timestamp + '/' + this.audit.settings.sourceFilename;
        this.result.image = this.timestamp + '/' + this.audit.settings.screenshotFilename;
    }

    [util.inspect.custom]() {
        return _.clone(_.pick(this, 'id', 'logger', 'url', 'depth', 'run', 'timestamp', 'resourcesDirectory', 'result', 'audit'));
    }

    get [Symbol.toStringTag]() {
        return 'Job';
    }

    static createResultStub(urlToAudit) {
        return {
            original:urlToAudit,
            count:{
                total:0,
                error:0,
                warning:0,
                notice:0
            },
            results:[],
            numElements:0
            // local: ... // Will be set later,
            // image: ... // Will be set later,
        };
    }
}

module.exports = Job;
