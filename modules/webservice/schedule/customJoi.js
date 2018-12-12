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

var Joi    = require('joi');
var parser = require('cron-parser');

module.exports = Joi.extend({
    base:Joi.string(),
    name:'string',
    language:{
        cronexp:'needs to be a valid CRON expression',
        validRegex: 'needs to be a valid regular expression'
    },
    rules:[
        {
            name:'cronexp',
            validate:function (params, value, state, options) {
                try {
                    // I'm adding custom validation to cron-parser they only validate the 5 first parts.
                    // So this is valid according to cron-parser : 10 15 * * * foo
                    var parts = value.split(' ');
                    if(parts.length !== 5) throw new Error('Invalid cron expression');
                    // I'm adding an asterisk at the beginning because cron-parser handles seconds.
                    var interval = parser.parseExpression('* ' + value);
                    interval.next();
                } catch (ex) {
                    return this.createError('string.cronexp', { v:value }, state, options);
                }
                return value;
            }
        },
        {
            name:'validRegex',
            validate:function (params, value, state, options) {
                try {
                    new RegExp(value);
                } catch (ex) {
                    return this.createError('string.validRegex', { v:value }, state, options);
                }
                return value;
            }
        }
    ]
});
