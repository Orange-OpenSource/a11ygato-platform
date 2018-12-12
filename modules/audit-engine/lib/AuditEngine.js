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

const Q     = require('q');
const util  = require('util');
const https = require('https');

// Better debugging with Q
Q.longStackSupport = true;

// Set defaults for util.inspect() which is also called by console.log() and util.format().
Object.assign(util.inspect.defaultOptions, { maxArrayLength:5, depth:3 });

const Audit     = require('./core/audit/Audit');
const Scenario  = require('./core/scenario/Scenario');
const _settings = require('./core/settings');
const _pools    = require('./core/pools');


class AuditEngine {

    constructor() {
        this.on = false;

        this.agent = new https.Agent({
            rejectUnauthorized:false
        });

        this.defaultTask = require('./core/audit/defaultTask');
        this.defaultSettings = require('./common/defaultSettings');
    }

    get initialized() {
        return this.on;
    }

    createAudit(task) {
        if(!this.on) throw new Error('Have you tried to initialize this engine first with init()?');
        return new Audit(task);
    }

    createScenario(task) {
        if(!this.on) throw new Error('Have you tried to initialize this engine first with init()?');
        return new Scenario(task);
    }

    getSettings() {
        return _settings.get();
    }

    async init(settings) {
        await _settings.set(settings);
        await _pools.create();
        this.on = true;
        console.info('Engine initialized');

    }

    shutdown() {
        return _pools.shutdown();
    }

}

module.exports = new AuditEngine();


