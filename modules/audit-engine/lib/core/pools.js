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

var getSettings       = require('./settings').get;
// var EngineEnum        = require('../engine/EngineEnum');
var createChromePool  = require('../engine/puppeteer/createPool');
// var createPhantomPool = require('../engine/phantom/createPool');

var _chrome, _phantom;

//////////////

// Before there was two pools: one for Phantom and another one for Chrome.
// Code is still there, but phantom can't be used anymore.
// Should be removed in next release.
// We use a pool to control how many tabs are created across all audits.

module.exports = {
    get:get,
    create:create,
    shutdown:shutdown
};

//////////////

// Create phantom and chrome pools
async function create() {
    var settings = getSettings();
    // if (settings.phantom.enabled) _phantom = await createPhantomPool();
    if (settings.chrome.enabled) _chrome = await createChromePool();
}

// Return the requested pool.
function get() {
    // var settings = getSettings();
    // if (engine === EngineEnum.PHANTOM && settings.phantom.enabled) return _phantom;
    return _chrome;
}

function shutdown(){
    return Promise.all([
        _chrome && _chrome.shutdown(),
        _phantom && _phantom.shutdown()
    ]);
}
