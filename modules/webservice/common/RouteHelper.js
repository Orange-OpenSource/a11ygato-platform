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

var AppError = require('./AppError');

///////////////

function RouteHelper() {}

RouteHelper.prototype             = {};
RouteHelper.prototype.constructor = RouteHelper;

module.exports = RouteHelper;

///////////////


RouteHelper.replyWithErr = function replyWithErr(err, reply) {
    if (err instanceof AppError) {
        var payload = err.toJSON();
        return reply(payload).code(err.statusCode);
    }
    return reply(err && err.message || err).code(500);
};
