/*
    @license
    @a11ygato/webservice
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

// This file is part of pa11y-webservice.
// 
// pa11y-webservice is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// 
// pa11y-webservice is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with pa11y-webservice.  If not, see <http://www.gnu.org/licenses/>.

'use strict';

var request = require('request');

module.exports = createNavigator;

// Create a navigate function
function createNavigator (baseUrl, store) {
	return function (opts, callback) {

		store.body = null;
		store.request = null;
		store.response = null;
		store.status = null;

		request({
			url: baseUrl + opts.endpoint,
			method: opts.method || 'GET',
			body: opts.body,
			json: true,
			qs: opts.query
		}, function (err, res, body) {
			store.body = body;
			store.request = res.request;
			store.response = res;
			store.status = res.statusCode;
			callback(err);
		});

	};
}
