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

var ObjectID    = require('mongodb').ObjectID;
var auditEngine = require('@a11ygato/audit-engine');
var util        = require('util');

// const { createAudit:{ defaults:taskDefaults } } = require('@a11ygato/audit-engine');
var scheduler                                   = require('../schedule/scheduler');

module.exports = function(app, callback) {
    app.db.collection('tasks', function(err, collection) {
        if(err) return callback(err);
        collection.ensureIndex({ name:1, url:1 }, { w:-1 });
        var model = {
            collection:collection,
            // Create a task
            create:function(userId, newTask, callback) {
                Object.assign(newTask, { userId:new ObjectID(userId) });
                collection.insert(newTask, function(err, result) {
                    if(err){
                        return callback(err);
                    }
                    var createdTask = model.prepareForOutput(result.ops[0]);
                    scheduler.editJob(createdTask);
                    callback(null, createdTask);
                });
            },
            // Get all tasks
            getAll:function(userId, callback) {
                var query = {};
                if(userId) query.userId = new ObjectID(userId);
                collection
                    .find(query)
                    .sort({ name:1, url:1 })
                    .toArray(function(err, tasks) {
                        if(err){
                            return callback(err);
                        }
                        callback(null, tasks.map(model.prepareForOutput));
                    });
            },
            // Get a task by ID
            getById:function(id, callback) {
                try{
                    id = new ObjectID(id);
                } catch(err){
                    return callback(null, null);
                }
                collection.findOne({ _id:id }, function(err, task) {
                    if(err){
                        return callback(err);
                    }
                    if(task){
                        task = model.prepareForOutput(task);
                    }
                    callback(null, task);
                });
            },
            // Edit a task by ID
            editById:function(id, task, payload, callback) {
                try{
                    id = new ObjectID(id);
                } catch(err){
                    return callback(err, 0);
                }
                const $unset = {};
                ['cron', 'timeout', 'depth', 'limit', 'url', 'name', 'concurrency', 'scenario', 'urlFilter'].forEach(key => {
                    if(payload[key] == null && task[key] != null) $unset[key] = null;
                });
                const actions = { $set:payload };
                if(Object.keys($unset).length) actions['$unset'] = $unset;
                collection.update({ _id:id }, actions, (err, updateCount) => {
                    const annotation = {
                        type:'edit',
                        date:Date.now(),
                        comment:payload.comment || 'Edited task'
                    };
                    model.addAnnotationById(id, annotation, function(err) {
                        callback(err, updateCount);
                    });
                });
            },
            // Add an annotation to a task
            addAnnotationById:function(id, annotation, callback) {
                model.getById(id, function(err, task) {
                    if(err || !task){
                        return callback(err, 0);
                    }
                    id = new ObjectID(id);
                    if(!Array.isArray(task.annotations)){
                        collection.update({ _id:id }, { $set:{ annotations:[annotation] } }, callback);
                    } else{
                        collection.update({ _id:id }, { $push:{ annotations:annotation } }, callback);
                    }
                });
            },
            // Delete a task by ID
            deleteById:function(id, callback) {
                try{
                    id = new ObjectID(id);
                } catch(err){
                    return callback(null);
                }
                collection.deleteOne({ _id:id }, function(error, result) {
                    callback(error, result ? result.deletedCount : null);
                });
            },
            // Run a task by ID
            runById:async function(id, callback) {
                let result;
                try{
                    const getTaskById = util.promisify(model.getById);
                    const task        = await getTaskById(id);
                    result            = await model.runTask(task);
                }
                catch(err){
                    if(callback) return callback(err);
                    throw err;
                }
                if(callback) return callback(null, result);
                return result;
            },
            runTask:async function(task) {
                const audit      = task.scenario ? auditEngine.createScenario(task) : auditEngine.createAudit(task);
                const result     = await audit.run();
                result.task      = new ObjectID(task.id);
                const saveResult = util.promisify(app.model.result.create);
                await saveResult(result);
                return result;
            },
            // Prepare a task for output
            prepareForOutput:function(task) {
                const output = Object.assign({}, task);
                output.id    = task._id.toString();
                delete output._id;
                return output;
            }
        };
        callback(err, model);
    });
};
