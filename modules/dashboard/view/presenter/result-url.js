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
var url = require('url');

var app = require('../../app');

module.exports = presentResultUrl;

/////////////////////////

function presentResultUrl(result, uid) {

    var resultUrl = result.urls[uid];
    if (!resultUrl) return false;

    var extract = {};

    // Split out message types
    var merged = resultUrl.results;
    var groupedByType = _.groupBy(merged, 'type');
    ['error', 'warning', 'notice'].forEach(function (type) {
        var pluralType = type + 's';
        var results = groupedByType[type] || [];
        var groupedByCode = _.groupBy(results, 'code');
        extract[pluralType] = _.keys(groupedByCode).map(function (group) {
            var firstMessage = groupedByCode[group][0];
            firstMessage.count = groupedByCode[group].length;
            return firstMessage;
        });
    });

    extract.count = {
        error:_.reduce(_.map(extract.errors, function (result) {
            return result.count;
        }), function (memo, num) {
            return memo + num;
        }, 0),
        warning:_.reduce(_.map(extract.warnings, function (result) {
            return result.count;
        }), function (memo, num) {
            return memo + num;
        }, 0),
        notice:_.reduce(_.map(extract.notices, function (result) {
            return result.count;
        }), function (memo, num) {
            return memo + num;
        }, 0)
    };

    // Add additional info
    extract.original = resultUrl.original;
    var parsedUrl = url.parse(resultUrl.image);
    if (parsedUrl.protocol) {
        // It means this url is not a relative url, thus this field has a legacy value
        extract.hrefPng = url.resolve(app.config.webServiceUrl, parsedUrl.path);
    } else {
        extract.hrefPng = app.config.webServiceUrl + 'fileserver/' + resultUrl.image;
    }
    // Parse date
    extract.date = new Date(result.date);
    // Enhance the ignored rules
    extract.numElements = resultUrl.numElements;
    extract.kpi = resultUrl.kpi;
    extract.exception = resultUrl.exception;

    return extract;
}
