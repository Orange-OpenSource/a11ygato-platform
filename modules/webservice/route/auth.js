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

'use strict';

var Joi = require('joi');

var RouteHelper = require('../common/RouteHelper');

// Routes relating to individual tasks
module.exports = function (app) {

    var model  = app.model;
    var server = app.server;

    // Sign IN
    server.route({
        method:'POST',
        path:'/sign-in',
        handler:function (req, reply) {
            model.auth.signIn(req.payload, function (err, token) {
                if(err){
                    console.error('Sign in failed with error:', err);
                    return RouteHelper.replyWithErr(err, reply);
                }
                return reply(token).code(200);
            });
        },
        config:{
            auth:false,
            validate:{
                payload:{
                    email:Joi.string().email().required(),
                    password:Joi.string().required()
                }
            }
        }
    });

    // Sign UP
    server.route({
        method:'POST',
        path:'/sign-up',
        handler:function (req, reply) {
            model.auth.signUp(req.payload, function (err) {
                if(err){
                    console.error('Sign up failed with error:', err);
                    return RouteHelper.replyWithErr(err, reply);
                }
                return reply().code(201);
            });
        },
        config:{
            auth:false,
            validate:{
                payload:{
                    firstName:Joi.string().required(),
                    lastName:Joi.string().required(),
                    email:Joi.string().email().required(),
                    password:Joi.string().required()
                }
            }
        }
    });
};


