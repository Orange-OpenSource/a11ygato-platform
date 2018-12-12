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
    This file is part of Pa11y Webservice Node.js Client.

    Pa11y Webservice Node.js Client is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Pa11y Webservice Node.js Client is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with Pa11y Webservice Node.js Client.  If not, see <http://www.gnu.org/licenses/>.
*/

'use strict';

var request = require('request');

////////////////

module.exports = createClient;

////////////////

// Create a web-service client
// ```js
// // Create client with the base URL of the web-service
// var client = createClient('http://localhost:3000/');
//
// // Create a task
// client.tasks.create({
//     name: 'Nature Home Page',
//     url: 'nature.com',
//     standard: 'WCAG2AA'
// }, function (err, task) {
//     // task  =  object representing the new task, or null if an error occurred
// });
//
// // Get all tasks
// client.tasks.get({}, function (err, tasks) {
//     // tasks  =  array of objects representing tasks, or null if an error occurred
// });
//
// // Get all tasks with last results included for each
// client.tasks.get({
//     lastres: true
// }, function (err, tasks) {
//     // tasks  =  array of objects representing tasks, or null if an error occurred
// });
//
// // Get results for all tasks
// client.tasks.results({}, function (err, results) {
//     // results  =  array of objects representing results, or null if an error occurred
// });
//
// // Get results for all tasks within a date range
// client.tasks.results({
//     from: '2013-01-01',
//     to: '2013-01-31'
// }, function (err, results) {
//     // results  =  array of objects representing results, or null if an error occurred
// });
//
// // Get results for all tasks with full details
// client.tasks.results({
//     full: true
// }, function (err, results) {
//     // results  =  array of objects representing results, or null if an error occurred
// });
//
// // Get a task by ID
// client.task('5231c687bbdf0f94fa000007').get({}, function (err, task) {
//     // task  =  object representing the requested task, or null if an error occurred
// });
//
// // Get a task by ID with last results included
// client.task('5231c687bbdf0f94fa000007').get({
//     lastres: true
// }, function (err, task) {
//     // task  =  object representing the requested task, or null if an error occurred
// });
//
// // Edit a task by ID
// client.task('5231c687bbdf0f94fa000007').edit({
//     name: 'New name'
// }, function (err, task) {
//     // task  =  object representing the newly updated task, or null if an error occurred
// });
//
// // Delete a task by ID
// client.task('5231c687bbdf0f94fa000007').remove(function (err) {
//     // err  =  null if task was deleted, or an Error object if something went wrong
// });
//
// // Run a task by ID
// client.task('5231c687bbdf0f94fa000007').run(function (err) {
//     // err  =  null if task is running, or an Error object if something went wrong
// });
//
// // Get results for a task
// client.task('5231c687bbdf0f94fa000007').results({}, function (err, results) {
//     // results  =  array of objects representing results, or null if an error occurred
// });
//
// // Get results for a task within a date range
// client.task('5231c687bbdf0f94fa000007').results({
//     from: '2013-01-01',
//     to: '2013-01-31'
// }, function (err, results) {
//     // results  =  array of objects representing results, or null if an error occurred
// });
//
// // Get results for a task with full details
// client.task('5231c687bbdf0f94fa000007').results({
//     full: true
// }, function (err, results) {
//     // results  =  array of objects representing results, or null if an error occurred
// });
//
// // Get a result by ID
// client.task('5231c687bbdf0f94fa000007').result('523c0ee0ca452f0000000009').get({}, function (err, result) {
//     // task  =  object representing the requested result, or null if an error occurred
// });
//
// // Get a result by ID with full details
// client.task('5231c687bbdf0f94fa000007').result('523c0ee0ca452f0000000009').get({
//     full: true
// }, function (err, result) {
//     // task  =  object representing the requested result, or null if an error occurred
// });
// ```
function createClient(root) {

    var client = {

        // Setted later per request if need be. Contains `Authorization` header value.
        token:null,

        auth:{
            signIn:function signIn(credentials, done) {
                post(root + 'sign-in', credentials, done);
            },
            signUp:function signUp(userInfo, done) {
                post(root + 'sign-up', userInfo, done);
            }
        },

        alive:{
            check:function(done){
                get(root + 'alive', null, done);
            }
        },

        tasks:{

            // Create a new task
            create:function (task, done) {
                post(root + 'tasks', task, done);
            },

            // Get all tasks
            get:function (query, done) {
                get(root + 'tasks', query, done);
            },

            // Get results for all tasks
            results:function (query, done) {
                get(root + 'tasks/results', query, done);
            }

        },

        task:function (id) {
            return {

                // Get a task
                get:function (query, done) {
                    get(root + 'tasks/' + id, query, done);
                },

                // Edit a task
                edit:function (edits, done) {
                    patch(root + 'tasks/' + id, edits, done);
                },

                // Remove a task
                remove:function (done) {
                    del(root + 'tasks/' + id, null, done);
                },

                // Run a task
                run:function (done) {
                    post(root + 'tasks/' + id + '/run', null, done);
                },

                // Get results for a task
                results:function (query, done) {
                    get(root + 'tasks/' + id + '/results', query, done);
                },

                result:function (rid) {
                    return {

                        // Get a result
                        get:function (query, done) {
                            get(root + 'tasks/' + id + '/results/' + rid, query, done);
                        },

                        // Delete a result
                        delete:function (query, done) {
                            del(root + 'results/' + rid, query, done);
                        }

                    };
                }

            };
        }

    };

    return client;

    ////////////////

    // Perform a DELETE request
    function del(url, query, done) {
        req('DELETE', url, query, null, done);
    }

    // Perform a GET request
    function get(url, query, done) {
        req('GET', url, query, null, done);
    }

    // Perform a PATCH request
    function patch(url, body, done) {
        req('PATCH', url, null, body, done);
    }

    // Perform a POST request
    function post(url, body, done) {
        req('POST', url, null, body, done);
    }

    // Perform a request
    function req(method, url, query, body, done) {
        var options = {
            method:method,
            url:url,
            qs:query,
            body:body,
            headers:{},
            json:true,
            rejectUnauthorized: false,
            requestCert: true,
            agent: false
        };
        if (client.token) options.headers.Authorization = client.token;
        request(options, function (err, res, body) {
            if (err) return done(err);
            if (res.statusCode > 299) {
                var exc;
                if (body instanceof Object && (body.code || body.message)) {
                    exc            = new Error(body.message);
                    exc.code       = body.code;
                    exc.statusCode = body.statusCode || res.statusCode;
                }
                else {
                    var message    = body || 'Error ' + res.statusCode;
                    exc            = new Error(message);
                    exc.code       = null;
                    exc.statusCode = res.statusCode;
                }
                return done(exc);
            }
            done(null, body);
        });
    }
}
