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

var Joi   = require('joi');
var path  = require('path');
var chalk = require('chalk');
var async = require('async');
var fs    = require('fs-extra');
var _     = require('underscore');

var customJoi  = require('../schedule/customJoi');
var scheduler  = require('../schedule/scheduler');
var AuthHelper = require('../common/AuthHelper');

// Routes relating to individual tasks
module.exports = function(app) {

    var model  = app.model;
    var server = app.server;

    // When using a function to validate inputs (payload, query, etc.) I'm extracting Joi configuration
    // in order to avoid to compile it every time. This is not necessary when providing Joi configuration directly
    // cause I'm confident HAPI will do it automatically.
    const SCHEMAS = {
        edit:{
            url:Joi.object().keys({
                name:Joi.string().required(),
                url:Joi.string().required().empty(''),
                depth:Joi.number().integer().min(0).allow(null).empty(''),
                concurrency:Joi.number().integer().min(1).max(5).allow(null).empty(''),
                limit:Joi.number().integer().min(1).max(200).allow(null).empty(''),
                timeout:Joi.number().integer().min(0).allow(null).empty(''),
                cron:customJoi.string().cronexp().allow(null).empty(''),
                engine:Joi.string().allow('chrome', 'phantom', null).empty(''),
                type:Joi.string().required().allow('url', 'scenario'),
                urlFilter:customJoi.string().validRegex().allow(null).empty('')
            }),
            scenario:Joi.object().keys({
                name:Joi.string().required(),
                scenario:Joi.string().required().empty(''),
                cron:customJoi.string().cronexp().allow(null).empty(''),
                engine:Joi.string().allow('chrome', 'phantom', null).empty(''),
                type:Joi.string().required().allow('url', 'scenario')
            })
        }
    };

    // Get a task
    server.route({
        method:'GET',
        path:'/tasks/{id}',
        handler:function(req, reply) {
            model.task.getById(req.params.id, function(err, task) {
                if(err) return reply(err && err.message || err).code(500);
                if(!task) return reply().code(404);
                if(req.query.lastres){
                    model.result.getByTaskId(task.id, {
                        limit:1,
                        full:true
                    }, function(err, results) {
                        if(err || !results) return reply(err && err.message || err || 'No results').code(500);
                        task.last_result = null;
                        if(results && results.length){
                            task.last_result = results[0];
                        }
                        reply(task).code(200);
                    });
                } else{
                    reply(task).code(200);
                }
            });
        },
        config:{
            validate:{
                query:Joi.object({
                    lastres:Joi.boolean()
                }),
                payload:false
            }
        }
    });

    // Edit a task
    server.route({
        method:'PATCH',
        path:'/tasks/{id}',
        handler:function(req, reply) {
            model.task.getById(req.params.id, function(err, task) {
                if(err) return reply({ code:500, message:err }).code(500);
                if(!task) return reply().code(404);
                if(!AuthHelper.isOwnTask(req, task)) return reply().code(404);
                model.task.editById(task.id, task, req.payload, function(err, updateCount) {
                    if(err || updateCount < 1) return reply({ code:500, message:err }).code(500);
                    model.task.getById(task.id, function(err, task) {
                        if(err) return reply({ code:500, message:err }).code(500);
                        scheduler.editJob(task);
                        reply(task).code(200);
                    });
                });
            });
        },
        config:{
            validate:{
                query:false,
                payload:function validate(value, options, next) {
                    const schema = value.type === 'scenario' ? SCHEMAS.edit.scenario : SCHEMAS.edit.url;
                    const result = schema.validate(value);
                    if(result.error) return next(result.error);
                    next(null, result.value);
                }
            }
        }
    });

    // Delete a task
    server.route({
        method:'DELETE',
        path:'/tasks/{id}',
        handler:function(req, reply) {
            var taskId = req.params.id;
            model.task.getById(taskId, function(err, task) {
                if(err) return reply({ code:500, message:err }).code(500);
                if(!task) return reply().code(404);
                if(!AuthHelper.isOwnTask(req, task)) return reply().code(404);
                model.result.getByTaskId(taskId, req.query, function(err, results) {
                    // Delete each result assets
                    results = results || [];
                    async.each(results, removeResultAssetsInPublicFolder, function() {
                        // `count` is the number of items truly deleted.
                        model.task.deleteById(taskId, function(err, count) {
                            if(err) return reply({ code:500, message:err }).code(500);
                            if(!count) return reply().code(404);
                            model.result.deleteByTaskId(taskId, function(err) {
                                if(err) return reply({ code:500, message:err }).code(500);
                                // Remove timer for this job if any.
                                scheduler.deleteJob(taskId);
                                reply().code(200);
                            });
                        });
                    });
                });
            });
        },
        config:{
            validate:{
                query:{},
                payload:false
            }
        }
    });
    // Run a task
    server.route({
        method:'POST',
        path:'/tasks/{id}/run',
        handler:function(req, reply) {
            model.task.getById(req.params.id, function(err, task) {
                if(err) return reply({ code:500, message:err }).code(500);
                if(!task) return reply().code(404);
                if(!AuthHelper.isOwnTask(req, task)) return reply().code(404);
                console.log('');
                console.log(`Starting task ${task.id} @ ${new Date()}...`);
                if(process.env.NODE_ENV !== 'test'){
                    model.task.runById(req.params.id, function(err, results) {
                        if(err || !results){
                            console.error(chalk.red(`Task ${task.id} failed:`, err));
                        } else if(_.some(results.urls, 'error')){
                            console.log(chalk.yellow(`Finished task ${task.id} @ ${new Date()} with errors.`));
                        } else{
                            console.log(chalk.green(`Finished task ${task.id} @ ${new Date()}`));
                        }
                    });
                }
                reply().code(202);
            });
        },
        config:{
            validate:{
                query:{}
            }
        }
    });

    // Get results for a task
    server.route({
        method:'GET',
        path:'/tasks/{id}/results',
        handler:function(req, reply) {
            model.task.getById(req.params.id, function(err, task) {
                if(err) return reply({ code:500, message:err }).code(500);
                if(!task) return reply().code(404);
                model.result.getByTaskId(req.params.id, req.query, function(err, results) {
                    if(err || !results){
                        return reply(err && err.message || err || 'No results').code(500);
                    }
                    reply(results).code(200);
                });
            });
        },
        config:{
            validate:{
                query:Joi.object({
                    from:Joi.string().isoDate(),
                    to:Joi.string().isoDate(),
                    full:Joi.boolean()
                }),
                payload:false
            }
        }
    });

    // Get a result for a task
    server.route({
        method:'GET',
        path:'/tasks/{tid}/results/{rid}',
        handler:function(req, reply) {
            var rid = req.params.rid;
            var tid = req.params.tid;
            model.result.getByIdAndTaskId(rid, tid, req.query, function(err, result) {
                if(err) return reply(err && err.message || err).code(500);
                if(!result) return reply().code(404);
                reply(result).code(200);
            });
        },
        config:{
            validate:{
                query:Joi.object({
                    full:Joi.boolean()
                }),
                payload:false
            }
        }

    });

    // Delete a result for a task
    server.route({
        method:'DELETE',
        path:'/results/{rid}',
        handler:function(req, reply) {
            var rid = req.params.rid;
            // TODO Check result is part of a task which is owned by this user
            model.result.getById(rid, true, function(err, result) {
                if(err) return reply(err && err.message || err).code(500);
                if(!result) return reply().code(404);
                model.result.deleteById(rid, function(err, count) {
                    if(err || !count) return reply(err && err.message || err).code(500);
                    removeResultAssetsInPublicFolder(result, function() {
                        reply().code(200);
                    });
                });
            });
        },
        config:{
            validate:{
                query:{},
                payload:false
            }
        }
    });

    // Remove all assets in fs (page + images) from public folder.
    // resultId is mandatory.
    function removeResultAssetsInPublicFolder(result, done) {
        if(!result.urls) return done();
        async.each(result.urls, deleteResultAssets, done);

        ///////////
        function deleteResultAssets(urlData, callback) {
            var localPath = urlData.local;
            if(!localPath) return callback();
            var folderPath   = path.dirname(localPath);
            var absolutePath = '';
            if(path.isAbsolute(folderPath)){
                // This is a security for compliance with old results which use an absolute path instead of a relative one.
                absolutePath = folderPath;
            } else{
                absolutePath = path.join(app.config.engine.publicFolder, folderPath);
            }
            fs.remove(absolutePath, function(err) {
                if(err)
                    console.warn(chalk.yellow('Failed to remove assets in public folder %s for url %s and result id %s:'), absolutePath, urlData.original, result.id, err);
                else
                    console.log('Removed assets in public folder for url %s and result id %s', urlData.original, result.id);
                // I'm not providing the error cause I don't want to interrupt the loop.
                // Not being able to delete some assets is not fatal.
                callback();
            });
        }
    }
};
