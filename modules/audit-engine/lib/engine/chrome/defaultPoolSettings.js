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

module.exports = {
    // Chrome server address and port
    chrome:{
        host:'localhost',
        port:9222
    },
    max:15,
    // Optional. if you set this, make sure to drain()
    min:0,
    // Specifies how long a resource can stay idle in pool before being removed
    idleTimeoutMillis:60000,
    // Specifies the maximum number of times a resource can be reused before being destroyed. Set to 0 to disable.
    maxUses:10,
    // Validate resource before borrowing; required for `maxUses and `validator`
    testOnBorrow:true,
    // Function to validate an instance prior to use; see https://github.com/coopernurse/node-pool#createpool
    validator:null
};
