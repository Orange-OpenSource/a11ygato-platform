/*
    @license
    @a11ygato/cli
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

const VError = require('verror');

class Err {

    static noEnv() {
        return new VError({
            name:'ENOENV',
            info:{ exitCode:2 }
        }, 'No environment provided');
    }

    static noEnvFound(globPattern) {
        return new VError({
            name:'ENOENVFOUND',
            info:{ exitCode:3 }
        }, 'No environment found with glob pattern %s', globPattern);
    }

    static command(command, cause){
        return new VError({
            name:'ECMD',
            cause:cause instanceof Error ? cause : null,
            info:{ exitCode:4 }
        }, ' ⤫ %s', command);

    }

    static invalidArgument(arg){
        return new VError({
            name:'EINVARG',
            info:{ exitCode:5 },
        }, 'Invalid argument(s): %s', arg);
    }

    static folderNotFound(folder){
        return new VError({
            name:'EFDNOTFOUND',
            info:{ exitCode:6 },
        }, 'Folder not found: %s', folder);
    }
}

module.exports = Err;
