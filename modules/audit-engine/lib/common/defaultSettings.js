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

var LogLevelEnum = require('../engine/phantom/LogLevelEnum');

module.exports = {
    // Absolute or relative path to the folder that will store screen captures and source codes.
    publicFolder:'./public',
    // Absolute or relative path to the javascript axe file. If not provided, the `axe-core` package will be searched in `node_modules`.
    axeScript:null,
    // Whether raw results returned by axe should be included too ?
    includeRawAxeResults:false,
    // Basename for the captured screenshot.
    screenshotFilename:'page.png',
    // Basename for the captured source code.
    sourceFilename:'source.html',
    // Max number of concurrent browser instances
    concurrentInstances:5,
    proxy:null,
    chrome:{
        // Chrome is the only choice now !
        enabled:true
    },
    phantom:{
        enabled:false,
        // Phantom default log level
        logLevel:LogLevelEnum.INFO
    }
};
