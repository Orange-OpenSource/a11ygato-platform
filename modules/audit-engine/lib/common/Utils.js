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

const _ = require('lodash');

class Utils {

    // Stringify an object with nice formatting.
    static stringify(data) {
        return JSON.stringify(data, replacer, '    ');

        function replacer(key, value) {
            // Filtering out properties
            if(typeof value === 'function'){
                const name = value.name || key;
                return '[Function: ' + name + ']';
            }
            return value;
        }
    }

    static convertAxeResults(results) {

        let errorsCount      = 0;
        let passCount        = 0;
        let convertedResults = [];

        results && results.violations && results.violations.forEach(function(violation) {
            violation.nodes && violation.nodes.forEach(function(node) {
                errorsCount++;
                convertedResults.push({
                    code:violation.id,
                    type:'error',
                    impact: violation.impact,
                    message:violation.description,
                    selector:node.target,
                    helpUrl:violation.helpUrl
                });
            });
        });

        results && results.passes && results.passes.forEach(function(pass) {
            passCount += pass.nodes && pass.nodes.length || 0;
        });

        return {
            count:{
                total:passCount + errorsCount,
                pass:passCount,
                error:errorsCount,
                warning:0,
                notice:0
            },
            results:convertedResults
        };
    }

    static sanitize(url) {
        if(!url) return;
        return url.replace(/[\s/]*$/g, '');
    }

    static uniqueTimestamp() {
        return process.hrtime().reduce(function(memo, value) {
            return memo + value;
        });
    }

}


module.exports = Utils;
