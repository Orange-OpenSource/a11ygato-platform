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
/* jshint maxlen: 200, maxstatements: 20 */
'use strict';

var assert = require('proclaim');

describe('GET /tasks/{id}/results/{id}', function () {

	describe('with valid and existing task ID', function () {

		describe('with valid and existing result ID', function () {

			describe('with no query', function () {

				beforeEach(function (done) {
					var req = {
						method: 'GET',
						endpoint: 'tasks/abc000000000000000000001/results/def000000000000000000001'
					};
					this.navigate(req, done);
				});

				it('should send a 200 status', function () {
					assert.strictEqual(this.last.status, 200);
				});

				it('should output a JSON representation of the requested result', function (done) {
					var body = this.last.body;
					this.app.model.result.getById('def000000000000000000001', false, function (err, result) {
						assert.isObject(body);
						assert.strictEqual(body.id, 'def000000000000000000001');
						assert.deepEqual(body, result);
						done();
					});
				});

			});

			describe('with full details query', function () {

				beforeEach(function (done) {
					var req = {
						method: 'GET',
						endpoint: 'tasks/abc000000000000000000001/results/def000000000000000000001',
						query: {
							full: true
						}
					};
					this.navigate(req, done);
				});

				it('should send a 200 status', function () {
					assert.strictEqual(this.last.status, 200);
				});

				it('should output a JSON representation of the requested result with full details', function (done) {
					var body = this.last.body;
					this.app.model.result.getById('def000000000000000000001', true, function (err, result) {
						assert.isObject(body);
						assert.strictEqual(body.id, 'def000000000000000000001');
						assert.deepEqual(body, result);
						done();
					});
				});

			});

			describe('with invalid query', function () {

				beforeEach(function (done) {
					var req = {
						method: 'GET',
						endpoint: 'tasks/abc000000000000000000001/results/def000000000000000000001',
						query: {
							foo: 'bar'
						}
					};
					this.navigate(req, done);
				});

				it('should send a 400 status', function () {
					assert.strictEqual(this.last.status, 400);
				});

			});

		});

		describe('with valid but non-existent result ID', function () {

			beforeEach(function (done) {
				var req = {
					method: 'GET',
					endpoint: 'tasks/abc000000000000000000001/results/def000000000000000000000'
				};
				this.navigate(req, done);
			});

			it('should send a 404 status', function () {
				assert.strictEqual(this.last.status, 404);
			});

		});

		describe('with invalid result ID', function () {

			beforeEach(function (done) {
				var req = {
					method: 'GET',
					endpoint: 'tasks/abc000000000000000000001/results/-def-'
				};
				this.navigate(req, done);
			});

			it('should send a 404 status', function () {
				assert.strictEqual(this.last.status, 404);
			});

		});

	});

	describe('with valid and existing but non-matching task ID', function () {

		beforeEach(function (done) {
			var req = {
				method: 'GET',
				endpoint: 'tasks/abc000000000000000000002/results/def000000000000000000001'
			};
			this.navigate(req, done);
		});

		it('should send a 404 status', function () {
			assert.strictEqual(this.last.status, 404);
		});

	});

	describe('with valid but non-existent task ID', function () {

		beforeEach(function (done) {
			var req = {
				method: 'GET',
				endpoint: 'tasks/abc000000000000000000000/results/def000000000000000000001'
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
				method: 'GET',
				endpoint: 'tasks/-abc-/results/def000000000000000000001'
			};
			this.navigate(req, done);
		});

		it('should send a 404 status', function () {
			assert.strictEqual(this.last.status, 404);
		});

	});

});
