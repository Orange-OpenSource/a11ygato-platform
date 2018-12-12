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

const fs         = require('fs');
const path       = require('path');
const _          = require('lodash');
const mkdirp     = require('mkdirp-promise');
const builder    = require('xmlbuilder');

const util   = require('util');
const writeFile = util.promisify(fs.writeFile);

//////////////

module.exports = {
    save:save
};

/////////////

// Generate a JUnit report saved on file system
async function save(report, settings, auditDuration) {

    const doc = {
        // XML root element
        testsuites:{
            '@time':auditDuration,
            '@name':report.root || '',   // The name attribute will hold this audit root URL
            '@tests':report.count.total,
            '@errors':report.count.error
        }
    };

    // Will contains all elements with tag name 'testsuite' under the root element.
    const testsuiteElements = [];

    if (report.urls && report.urls.length) {
        doc.testsuites.testsuite = testsuiteElements;
    }

    _.forEach(report.urls, function (urlResult) {

        // Create a testsuite element (one per URL audited)
        const tsElem = {
            '@hostname':urlResult.original,
            '@tests':urlResult.count.total,
            '@errors':urlResult.count.error
        };

        // Add it to the root element
        testsuiteElements.push(tsElem);

        const passes     = _.get(urlResult, 'raw.axe.passes');
        const violations = _.get(urlResult, 'raw.axe.violations');

        if (passes && passes.length || violations && violations.length) {

            // This testsuite element will have testcase child elements
            const testcaseElements = [];
            tsElem.testcase      = testcaseElements;

            passes && passes.forEach(function (pass) {
                pass.nodes && pass.nodes.forEach(function (node) {
                    let targets = '';
                    node.target && node.target.forEach(function (target) {
                        targets += '\ntarget: ' + target;
                    });

                    // Create a testcase element and add it under the current testsuite element
                    testcaseElements.push({
                        '@name':pass.help,
                        '@classname':pass.id,
                        'system-out':{
                            '#cdata':'\nhtml: ' + node.html + '\n' + targets + '\n\nURL: ' + urlResult.original
                        }
                    });
                });
            });

            violations && violations.forEach(function (violation) {
                violation.nodes && violation.nodes.forEach(function (node) {
                    // Create a testcase element and add it under the current testsuite element
                    testcaseElements.push({
                        '@name':violation.description,
                        '@classname':violation.id,
                        'error':{
                            '@type':violation.impact,
                            '@message':violation.help,
                            '#cdata':'\nSummary: ' + node.failureSummary + '\n\nhtml: ' + node.html + '\n\nURL: ' + urlResult.original
                        },
                        'system-err':{
                            '#cdata':'Help: ' + violation.helpUrl
                        }
                    });
                });
            });
        }

    });

    // Incomplete tests are ignored for now cause there is only two possible states for a JUnit testcase: OK / NOK.

    const outputPath = settings.output || 'audit-junit-report.xml';
    // Option `allowSurrogateChars` allows to insert emojis in the final xml.
    const source     = builder.create(doc, { version:'1.0', encoding:'UTF-8', allowSurrogateChars:true }).end({ pretty:true });
    await mkdirp(path.dirname(outputPath));
    await writeFile(outputPath, source, { flag:'w', encoding:'utf8' });
    console.log('Report generated at %s', outputPath);

    return report;

}
