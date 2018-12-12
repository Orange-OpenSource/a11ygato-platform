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

const puppeteer = require('puppeteer');

const poolFactory         = require('./poolFactory');
const getSettings         = require('../../core/settings').get;
const Utils               = require('../../common/Utils');
const defaultPoolSettings = require('./defaultPoolSettings');

/////////////////

module.exports = createPool;

//////////////////

async function createPool() {

    // Get app settings
    const settings = getSettings();

    // Create pool settings
    const poolSettings = Object.assign({}, defaultPoolSettings, { max:settings.concurrentInstances });

    console.log('Creating chrome pool with settings:', Utils.stringify(poolSettings));

    // TODO Until we stop using root as a production user, we need to deactivate the sandbox security in chrome.
    // THis is bad for obvious reasons. I can't do anything until we change the current production platform.
    const args = ['--no-sandbox', '--disable-setuid-sandbox'];
    settings.proxy && args.push(`--proxy-server=${settings.proxy}`);
    // If you set the environment variable VERBOSE to true, chrome will reuse this process stdout/stderr streams.
    const browser = await puppeteer.launch({ args, dumpio:(!!process.env.VERBOSE), ignoreHTTPSErrors:true });
    console.log('Chromium endpoint:', browser.wsEndpoint());

    // Create a pool of chrome pages
    const pool = poolFactory(browser, poolSettings);

    // Enhance the pool with a shutdown method
    pool.shutdown = function() {
        return pool.drain();
        // return browser.close();
    };

    console.log('Chrome pool created');

    return pool;
}
