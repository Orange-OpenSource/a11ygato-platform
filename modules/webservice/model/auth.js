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

var fs     = require('fs');
var bcrypt = require('bcrypt');
var jwt    = require('jsonwebtoken');

var AppError = require('../common/AppError');

module.exports = function (app, callback) {
    app.db.collection('users', function (err, collection) {
        if (err) return callback(AppError.fromErr(err));
        collection.ensureIndex({ email:1 }, { unique:true });
        var model = {
            collection:collection,
            // Check user existence and create a JWT token for it.
            signIn:function signIn(credentials, callback) {
                collection.findOne({ email:credentials.email }, function (err, user) {
                    if (err) return callback(AppError.fromErr(err));
                    if (!user) return callback(AppError.UserNotFound());
                    bcrypt.compare(credentials.password, user.password, function (err, res) {
                        if (!res) return callback(AppError.UserNotFound());
                        fs.readFile(app.config.auth.privateKey, function (err, privateKey) {
                            if (err) return callback(AppError.fromErr(err));
                            var payload = {
                                id:user._id,
                                email:user.email,
                                firstName:user.firstName,
                                lastName:user.lastName
                            };
                            var options = {
                                algorithm:'RS256',
                                expiresIn:60 * 60 * 24 * 60 // 2 months
                            };
                            jwt.sign(payload, privateKey, options, function (err, token) {
                                if (err) return callback(AppError.fromErr(err));
                                token = 'Bearer ' + token;
                                callback(null, token);
                            });
                        });
                    });
                });
            },
            // Create a user in db.
            signUp:function signUp(userInfo, callback) {
                if (!userInfo || !userInfo.email || !userInfo.password || !userInfo.firstName || !userInfo.lastName)
                    return callback(AppError.MissingMandatoryField());
                try {
                    collection.findOne({ email:userInfo.email }, function (err, user) {
                        if (err) return callback(AppError.fromErr(err));
                        if (user) return callback(AppError.EmailAlreadyInUse());
                        // Using 10 salt rounds abritarily.
                        bcrypt.genSalt(10, function (err, salt) {
                            if (err) return callback(AppError.fromErr(err));
                            bcrypt.hash(userInfo.password, salt, function (err, hash) {
                                if (err) return callback(AppError.fromErr(err));
                                userInfo.password = hash;
                                collection.insert(userInfo, function (err) {
                                    if (err) return callback(AppError.fromErr(err));
                                    console.log('Inserted a new user in db:', userInfo);
                                    return callback();
                                });
                            });
                        });
                    });
                }
                catch (err) {
                    return callback(AppError.fromErr(err));
                }
            },
            findUser:function findUser(email, callback) {
                collection.findOne({ email:email }, callback);
            }
        };
        callback(err, model);
    });
};
