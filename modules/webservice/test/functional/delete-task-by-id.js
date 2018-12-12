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

/* global beforeEach, describe, it */
/* jshint maxlen: 200 */
'use strict';

var assert = require('proclaim');

describe('DELETE /tasks/{id}', function () {

	describe('with valid and existing task ID', function () {

		beforeEach(function (done) {
			var req = {
				method: 'DELETE',
				endpoint: 'tasks/abc000000000000000000001'
			};
			this.navigate(req, done);
		});

		it('should remove the task from the database', function (done) {
			this.app.model.task.getById('abc000000000000000000001', function (err, task) {
				assert.isNull(task);
				done();
			});
		});

		it('should remove all of the task\'s results from the database', function (done) {
			this.app.model.result.getByTaskId('abc000000000000000000001', {}, function (err, results) {
				assert.strictEqual(results.length, 0);
				done();
			});
		});

		it('should send a 204 status', function () {
			assert.strictEqual(this.last.status, 204);
		});

	});

	describe('with valid but non-existent task ID', function () {

		beforeEach(function (done) {
			var req = {
				method: 'DELETE',
				endpoint: 'tasks/abc000000000000000000000'
			};
			this.navigate(req, done);
		});

		it('should send a 404 status', function () {
			assert.strictEqual(this.last.status, 404);
		});

	});

	describe('with invalid task ID', function () {

		beforeEach(function (done) {
			var req = {
				method: 'DELETE',
				endpoint: 'tasks/-abc-'
			};
			this.navigate(req, done);
		});

		it('should send a 404 status', function () {
			assert.strictEqual(this.last.status, 404);
		});

	});

});
