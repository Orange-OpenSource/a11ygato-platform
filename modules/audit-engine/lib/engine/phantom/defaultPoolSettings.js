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

var Q            = require('q');

var LogLevelEnum = require('./LogLevelEnum');

var phantomOptions = [
    '--ignore-ssl-errors=true',
    '--ssl-protocol=tlsv1',
    '--web-security=true'
];

////////////////

module.exports = {
    // For all pool options, see https://github.com/coopernurse/node-pool#createpool
    max:15,
    min:0,
    // maximum number of times an individual resource can be reused before being destroyed; set to 0 to disable
    maxUses:10,
    // Function to validate an instance prior to use; see https://github.com/coopernurse/node-pool#createpool
    validator:function (instance) {
        return Q(!instance.killSwitch);
    },
    // Validate resource before borrowing; required for `maxUses and `validator`
    testOnBorrow:true,
    // Specifies how long a resource can stay idle in pool before being removed
    idleTimeoutMillis:60000,
    // Arguments passed to phantomjs-node directly, default is `[]`.
    // For all phantomjs-node options, see https://github.com/amir20/phantomjs-node#phantom-object-api
    phantomArgs:[
        phantomOptions, { logLevel:LogLevelEnum.INFO }
    ]
};
