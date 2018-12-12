/*
    @license
    @a11ygato/dashboard
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

/*
    @license
    This file is part of pa11y-dashboard.

    pa11y-dashboard is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    pa11y-dashboard is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with pa11y-dashboard.  If not, see <http://www.gnu.org/licenses/>.
*/

'use strict';

var _ = require('underscore');
var uuid = require('uuid');

module.exports = presentResult;

function presentResult (result) {

    // Add additional info
    result.href = `/${result.task}/${result.id}`;
    result.hrefDelete = `/tasks/${result.task}/results/${result.id}/delete`;

    // Parse date
    result.date = new Date(result.date);

    result.urls.forEach(function(urlResult,index){
        if(!urlResult) return;
        urlResult.url = '/' + result.task + '/' + result.id + '/' + index;
        if(urlResult.exception || urlResult.numElements == null || urlResult.numElements === 0){
            urlResult.hasError = true;
        }
        classify(result, urlResult);
    });

    return result;

    /////////////

    function classify(taskResult, urlResult){
        var tests = urlResult.results;
        if(!tests) return;
        tests.forEach(function(test){
            var type = test.type + 's'; // yeah, smart code :(
            if(!taskResult[type]){
                taskResult[type] = [test];
                test.count = 1;
                test.urls = [urlResult];
                test.uuid = uuid.v4();
            }
            else {
                var item = _.findWhere(taskResult[type], {code:test.code, type:test.type});
                if(item) {
                    item.count++;
                    var url = _.findWhere(item.urls, {original:urlResult.original});
                    !url && item.urls.push(urlResult);
                }
                else{
                    taskResult[type].push(test);
                    test.count = 1;
                    test.urls = [urlResult];
                    test.uuid = uuid.v4();
                }
            }
        });
    }
}
