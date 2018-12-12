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

const _           = require('lodash');
const poolFactory = require('phantom-pool').default;

const Utils               = require('../../common/Utils');
const getSettings         = require('../../core/settings').get;
const defaultPoolSettings = require('./defaultPoolSettings');

//////////////////

// Define a createPool function onto module.exports
module.exports = createPool;

//////////////////

async function createPool() {

    // Get app settings
    const settings = getSettings();

    const phantomOptions = [
        '--ignore-ssl-errors=true',
        '--ssl-protocol=tlsv1',
        '--web-security=true'
    ];

    if (settings.proxy) phantomOptions.push('--proxy=' + settings.proxy);

    // Create pool settings
    const poolSettings = _.defaultsDeep({
        max:settings.concurrentInstances,
        idleTimeoutMillis:settings.idleTimeoutMillis,
        phantomArgs:[
            phantomOptions, { logLevel:settings.phantom.logLevel }
        ]
    }, defaultPoolSettings);

    console.log('Creating phantom pool with settings:', Utils.stringify(poolSettings));

    // Create a pool of phantom instances
    const pool = poolFactory(poolSettings);

    // Enhance the pool with a shutdown method
    pool.shutdown = function(){ return pool.drain(); };

    console.log('Phantom pool created');

    return pool;
}
