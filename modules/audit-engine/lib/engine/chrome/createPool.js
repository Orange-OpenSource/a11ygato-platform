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

var _ = require('lodash');

var poolFactory         = require('./poolFactory');
var getSettings         = require('../../core/settings').get;
var Utils               = require('../../common/Utils');
var defaultPoolSettings = require('./defaultPoolSettings');

/////////////////

module.exports = createPool;

//////////////////

function createPool() {

    var settings = getSettings();

    var poolSettings = _.defaultsDeep({
        chrome:{
            host:settings.chrome.host,
            port:settings.chrome.port
        },
        max:settings.concurrentInstances,
        idleTimeoutMillis:settings.idleTimeoutMillis
    }, defaultPoolSettings);

    console.log('Creating chrome pool with settings:', Utils.stringify(poolSettings));

    // Create a pool of chrome instances
    var pool = poolFactory(poolSettings);

    console.log('Chrome pool created');

    return pool;
}
