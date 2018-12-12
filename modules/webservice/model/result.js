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

/*
    @license
    This file is part of pa11y-webservice.

    pa11y-webservice is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    pa11y-webservice is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with pa11y-webservice.  If not, see <http://www.gnu.org/licenses/>.
*/

'use strict';
var ObjectID = require('mongodb').ObjectID;

// Result model
module.exports = function (app, callback) {
    app.db.collection('results', function (err, collection) {
        if (err) return callback(err);
        collection.ensureIndex({ date:1 }, { w:-1 });
        var model = {

            collection:collection,

            // Create a result
            create:function (newResult, callback) {
                if (!newResult.date) {
                    newResult.date = Date.now();
                }
                if (newResult.task && !(newResult.task instanceof ObjectID)) {
                    newResult.task = new ObjectID(newResult.task);
                }
                collection.insert(newResult, function (err, result) {
                    if (err) return callback(err);
                    console.log('Inserted a new result in db:', result);
                    var output = model.prepareForOutput(result.ops[ 0 ]);
                    callback(null, output);
                });
            },

            // Default filter options
            _defaultFilterOpts:function (opts) {
                opts.full = !!opts.full;
                return opts;
            },

            // Get results
            _getFiltered:function (opts, callback) {
                opts       = model._defaultFilterOpts(opts);
                var filter = {};
                if (opts.task) {
                    filter.task = new ObjectID(opts.task);
                }
                collection
                    .find(filter)
                    .sort({ date:-1 })
                    .limit(opts.limit || 0)
                    .toArray(function (err, results) {
                        if (err) {
                            return callback(err);
                        }
                        var preparedResults = results
                            .map(opts.full ? model.prepareForFullOutput : model.prepareForOutput)
                            .filter(function (elem) { return elem != null; });
                        callback(null, preparedResults);
                    });
            },

            // Get results for all tasks
            getAll:function (opts, callback) {
                delete opts.task;
                model._getFiltered(opts, callback);
            },

            // Get a result by ID
            getById:function (id, full, callback) {
                var prepare = (full ? model.prepareForFullOutput : model.prepareForOutput);
                try {
                    id = new ObjectID(id);
                } catch (err) {
                    return callback(null, null);
                }
                collection.findOne({ _id:id }, function (err, result) {
                    if (err) {
                        return callback(err);
                    }
                    if (result) {
                        result = prepare(result);
                    }
                    callback(null, result);
                });
            },

            // Get results for a single task
            getByTaskId:function (id, opts, callback) {
                opts.task = id;
                model._getFiltered(opts, callback);
            },

            // Delete results for a single task
            deleteByTaskId:function (id, callback) {
                try {
                    id = new ObjectID(id);
                } catch (err) {
                    return callback(err);
                }
                collection.deleteMany({ task:id }, callback);
            },

            // Delete a single result
            deleteById:function (id, callback) {
                try {
                    id = new ObjectID(id);
                } catch (err) {
                    return callback(err);
                }
                collection.deleteOne({ _id:id }, function (error, result) {
                    callback(error, result ? result.deletedCount : null);
                });
            },

            // Get a result by ID and task ID
            getByIdAndTaskId:function (id, task, opts, callback) {
                var prepare = (opts.full ? model.prepareForFullOutput : model.prepareForOutput);
                try {
                    id   = new ObjectID(id);
                    task = new ObjectID(task);
                } catch (err) {
                    return callback(null, null);
                }
                collection.findOne({ _id:id, task:task }, function (err, result) {
                    if (err) {
                        return callback(err);
                    }
                    if (result) {
                        result = prepare(result);
                    }
                    callback(null, result);
                });
            },

            // Prepare a result for output
            prepareForOutput:function (result) {
                result = model.prepareForFullOutput(result);
                if (result) delete result.results;
                return result;
            },
            prepareForFullOutput:function (result) {
                if (!model.validate(result)) return null;
                result.urls = result.urls.map(function (url) {
                    if (!url) return;
                    url.kpi = Math.floor((url.count.error / url.numElements) * 1000) || 0;
                    return url;
                });
                return Object.assign({}, result, {
                    id:result._id.toString(),
                    task:result.task.toString(),
                    prettyDate:new Date(result.date).toISOString(),
                    kpi:Math.floor((result.count.error / result.numElements) * 1000) || 0,
                    urls:result.urls || []
                });
            },
            validate:function (result) {
                var valid = result.numElements != null &&
                    result.count != null &&
                    result.count.tests == null &&
                    result.count.total != null &&
                    result.urls &&
                    (result.root || (!result.root && result.scenario));
                if(!valid) console.warn('Result %s ignored for integrity reasons', result._id);
                return valid;
            }

        };
        callback(err, model);
    });
};
