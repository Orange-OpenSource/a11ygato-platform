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

const _   = require('lodash');

class AuthHelper {

    static isOwnTask(req, task){
        if(!task) return false;
        const userInfo = _.get(req, 'auth.credentials');
        if(!userInfo) return false;
        return userInfo.id === task.userId.toString();
    }

}

module.exports = AuthHelper;
