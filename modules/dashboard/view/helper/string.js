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

'use strict';

const hbs = require('express-hbs');
const _   = require('lodash');

module.exports = helper;

function helper() {

    // Convert a string to lower-case
    hbs.registerHelper('lowercase', function(context) {
        return context.toLowerCase();
    });

    // Convert a string to upper-case
    hbs.registerHelper('uppercase', function(context) {
        return context.toUpperCase();
    });

    // Convert a string to upper-case
    hbs.registerHelper('capitalize', function(context) {
        return _.capitalize(context);
    });

}
