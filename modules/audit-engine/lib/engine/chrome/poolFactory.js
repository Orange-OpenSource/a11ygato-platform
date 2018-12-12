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

var _           = require('lodash');
var genericPool = require('generic-pool');
var Chrome      = require('chrome-remote-interface');
var chalk       = require('chalk');

var Utils = require('../../common/Utils');

////////////

module.exports = poolFactory;

////////////

// For all pool options, see https://github.com/coopernurse/node-pool#createpool
function poolFactory(settings) {

    // Factory used by generic pool to create and destroy instances.
    var factory = {
        create:function() {
            /* Print chrome headless version info. */
            Chrome.Version({ host:settings.chrome.host })
                .then(function(info) {
                    console.log('Remote instance version:', Utils.stringify(info));
                })
                .catch(function(err) {
                    console.error(chalk.red('Cannot print remote instance version:', (err && err.message) || err));
                });
            return Chrome.New({ host:settings.chrome.host, port:settings.chrome.port })
                .then(function(instance) {
                    console.log('Chrome tab created');
                    instance.useCount = 0;
                    return instance;
                });
        },
        destroy:function(instance) {
            console.log('Closing chrome tab with id `%s`…', instance.id);
            return Chrome.Close({ host:settings.chrome.host, port:settings.chrome.port, id:instance.id }).then(function() {
                console.log('Chrome tab with id `%s` closed', instance.id);
            });
        },
        validate:function(instance) {
            console.log('Validating browser instance with id `%s`…', instance.id);
            var validator = settings.validator || _validator;
            return validator(instance).then(function(valid) {
                if(!valid){
                    console.log('Custom validator has invalidated browser instance with id `%s`. Instance will be recycled.', instance.id);
                    return valid;
                }
                if(settings.maxUses <= 0){
                    console.log('Browser instance with id `%s` still valid. Instance will be reused.', instance.id);
                    return true;
                }
                if(instance.useCount < settings.maxUses){
                    console.log('Browser instance with id `%s` still valid. Instance will be reused.', instance.id);
                    return true;
                }
                else{
                    console.warn('Max use reached for browser instance with id `%s`. Instance will be recycled.', instance.id);
                    return false;
                }
                console.warn('Impossible case :)');
                return false;
            }).catch(function(err) {
                console.error('Failed to validate browser instance with id `%s`:', instance.id, err);
                return false;
            });
        }
    };

    // Create a generic pool with right factory and settings.
    var pool = genericPool.createPool(factory, settings);

    // Save original acquire function before overwriting it.
    var acquire  = pool.acquire.bind(pool);
    pool.acquire = function() {
        return acquire().then(function(instance) {
            instance.useCount += 1;
            return instance;
        });
    };

    // Main method used by callers to:
    // - acquire an instance from the pool
    // - do something with it (fn)
    // - release instance once done
    pool.use = function(fn) {
        var instance;
        return pool.acquire()
            .then(function(r) {
                instance = r;
                return instance;
            })
            .then(fn)
            .then(
                function(result) {
                    pool.release(instance);
                    return result;
                },
                function(err) {
                    pool.release(instance);
                    throw err;
                }
            );
    };

    return pool;

    //////////////


    // Check the connection is still valid before reusing it by trying to reconnect.
    function _validator(instance) {
        return Chrome.Activate({ host:settings.chrome.host, port:settings.chrome.port, id:instance.id });
    }

}
