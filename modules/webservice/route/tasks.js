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

const _   = require('underscore');
const Joi = require('joi');

const customJoi = require('../schedule/customJoi');

// Routes relating to all tasks
module.exports = function(app) {

    const model  = app.model;
    const server = app.server;

    const SCHEMAS = {
        new:{
            url:Joi.object().keys({
                name:Joi.string().required(),
                url:Joi.string().required(),
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
                scenario:Joi.string().required(),
                cron:customJoi.string().cronexp().allow(null).empty(''),
                engine:Joi.string().allow('chrome', 'phantom', null).empty(''),
                type:Joi.string().required().allow('url', 'scenario')
            })
        }
    };

    // Get all tasks
    server.route({
        method:'GET',
        path:'/tasks',
        handler:function(req, reply) {
            const credentials = req.auth.credentials;
            model.task.getAll(credentials.id, function(err, tasks) {
                if(err || !tasks){
                    return reply(err && err.message || err).code(500);
                }
                if(req.query.lastres){
                    model.result.getAll({}, function(err, results) {
                        if(err || !results){
                            return reply(err && err.message || err || 'No results').code(500);
                        }
                        const resultsByTask = _.groupBy(results, 'task');
                        tasks               = tasks.map(function(task) {
                            if(resultsByTask[task.id] && resultsByTask[task.id].length){
                                task.last_result = resultsByTask[task.id][0];
                            } else{
                                task.last_result = null;
                            }
                            return task;
                        });
                        reply(tasks).code(200);
                    });
                } else{
                    reply(tasks).code(200);
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

    // Create a task
    server.route({
        method:'POST',
        path:'/tasks',
        handler:function(req, reply) {
            const credentials = req.auth.credentials;
            model.task.create(credentials.id, req.payload, function(err, task) {
                if(err || !task){
                    return reply(err && err.message || err).code(500);
                }
                reply(task)
                    .header('Location', 'http://' + req.info.host + '/tasks/' + task.id)
                    .code(201);
            });
        },
        config:{
            validate:{
                query:false,
                payload:function validate(value, options, next) {
                    const schema = value.type === 'scenario' ? SCHEMAS.new.scenario : SCHEMAS.new.url;
                    const result = schema.validate(value);
                    if(result.error) return next(result.error);
                    next(null, result.value);
                }
            }
        }
    });

    // Alive check useful to test server availability. Used by dashboard.
    server.route({
        method:'GET',
        path:'/alive',
        config: { auth: false },
        handler:function(req, reply) {
            reply().code(200);
        }
    });

};
