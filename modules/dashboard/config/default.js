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

module.exports = {
    port: 8080,
    analytics: 'UA-118024071-3',
    webservice: {
        host: '127.0.0.1',
        port: 3448
    },
    auth:{
        publicKey:'../../security/jwt/pally.pem',
    },
    tls:{
        port: 8443,
        privateKey:'../../security/tls/pally.key',
        certificate:'../../security/tls/pally.crt'
    }
};
