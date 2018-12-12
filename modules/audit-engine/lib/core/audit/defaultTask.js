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

const EngineEnum = require('../../engine/EngineEnum');

module.exports = {
    // Define how many levels of crawling may be done.
    // Indeed, when a URL is audited, if `depth` is > 0 and/or `limit` > 1, the browserInstance will parse the source in search of new URL from the same domain and add them to the audit.
    depth:5,
    // Timeout (in ms) used in several places notably when running axe tests.
    // Be aware that some very large site might solicit axe for several minutes before getting the results back.
    timeout:180000,
    // Maximum number of URL that may be audited independently of the depth.
    limit:1,
    // Maximum number of URL audited in parallel.
    concurrency:5,
    // Engine to use: either phantom or chrome.
    engine:EngineEnum.CHROME
};
