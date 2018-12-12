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
const genericPool = require('generic-pool');

////////////

module.exports = poolFactory;

////////////

// For all pool options, see https://github.com/coopernurse/node-pool#createpool
function poolFactory(browser, settings) {

    // Factory used by generic pool to create and destroy instances.
    const factory = {
        create:function () {
            return browser.newPage();
        },
        destroy:function (page) {
            console.log('Closing chrome page');
            return page.close();
        },
        validate:function (page) {
            return page.useCount < settings.maxUses;
        }
    };

    // Create a pool of chrome pages (tabs).
    const pool = genericPool.createPool(factory, settings);

    // Overwrite pool's acquire method to increment a counter per resource every time it is reused.
    const acquire  = pool.acquire.bind(pool);
    pool.acquire = function () {
        return acquire().then(function (page) {
            page.useCount += 1;
            return page;
        });
    };

    // Main method used by callers to:
    // - acquire an instance from the pool
    // - do something with it (fn)
    // - release instance once done
    pool.use = function (fn) {
        let instance;
        return pool.acquire()
            .then(function (page) {
                instance = page;
                return instance;
            })
            .then(fn)
            .then(
                function (result) {
                    pool.release(instance);
                    return result;
                },
                function (err) {
                    pool.release(instance);
                    throw err;
                }
            );
    };

    return pool;

}
