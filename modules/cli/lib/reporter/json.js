/*
    @license
    @a11ygato/cli
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

const fs     = require('fs');
const path   = require('path');
const mkdirp = require('mkdirp-promise');

const util   = require('util');
const writeFile = util.promisify(fs.writeFile);

//////////////

module.exports = {
    save:save
};

/////////////

// Generate a JUnit report saved on file system
async function save(report, settings) {
    const outputPath = settings.output || 'audit-junit-report.json';
    const source     = JSON.stringify(report, null, '    ');
    await mkdirp(path.dirname(outputPath));
    await writeFile(outputPath, source, { flag:'w', encoding:'utf8' });
    console.log('Report generated at %s', outputPath);
    return report;
}
