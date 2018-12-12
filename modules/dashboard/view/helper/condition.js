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

// jshint ignore: start
'use strict';

var hbs = require('express-hbs');

module.exports = helper;

function helper() {

    hbs.registerHelper('ternary', function(predicate, valueIfTrue, valueIfFalse) {
        return predicate ? valueIfTrue : valueIfFalse;
    });

    hbs.registerHelper('xif', function(v1, operator, v2, options) {

        switch(operator){
            case '==':
                return (v1 == v2) ? options.fn(this) : options.inverse(this);
            case '===':
                return (v1 === v2) ? options.fn(this) : options.inverse(this);
            case '!=':
                return (v1 != v2) ? options.fn(this) : options.inverse(this);
            case '!==':
                return (v1 !== v2) ? options.fn(this) : options.inverse(this);
            case '<':
                return (v1 < v2) ? options.fn(this) : options.inverse(this);
            case '<=':
                return (v1 <= v2) ? options.fn(this) : options.inverse(this);
            case '>':
                return (v1 > v2) ? options.fn(this) : options.inverse(this);
            case '>=':
                return (v1 >= v2) ? options.fn(this) : options.inverse(this);
            case '&&':
                return (v1 && v2) ? options.fn(this) : options.inverse(this);
            case '||':
                return (v1 || v2) ? options.fn(this) : options.inverse(this);
            default:
                return options.inverse(this);
        }
    });

    hbs.registerHelper('xunless', function(v1, operator, v2, options) {

        switch(operator){
            case '==':
                return !(v1 == v2) ? options.fn(this) : options.inverse(this);
            case '===':
                return !(v1 === v2) ? options.fn(this) : options.inverse(this);
            case '!=':
                return !(v1 != v2) ? options.fn(this) : options.inverse(this);
            case '!==':
                return !(v1 !== v2) ? options.fn(this) : options.inverse(this);
            case '<':
                return !(v1 < v2) ? options.fn(this) : options.inverse(this);
            case '<=':
                return !(v1 <= v2) ? options.fn(this) : options.inverse(this);
            case '>':
                return !(v1 > v2) ? options.fn(this) : options.inverse(this);
            case '>=':
                return !(v1 >= v2) ? options.fn(this) : options.inverse(this);
            case '&&':
                return !(v1 && v2) ? options.fn(this) : options.inverse(this);
            case '||':
                return !(v1 || v2) ? options.fn(this) : options.inverse(this);
            default:
                return options.inverse(this);
        }
    });

}
