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

/*
    @license
    This file is part of pa11y-dashboard.

    pa11y-dashboard is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    pa11y-dashboard is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with pa11y-dashboard.  If not, see <http://www.gnu.org/licenses/>.
*/

'use strict';

module.exports = route;

// Route definition
function route(app) {

    app.express.get('/sign-in', function(req, res) {
        var options = {
            signIn:true,
            layout:'../layout/auth'
        };
        if(req.query.to) options.to = encodeURIComponent(req.query.to);
        res.render('auth/sign-in', options);
    });

    // Try to sign in by contacting the webservice module (hapi).
    // On success, a cookie is setted containing the JWT token.
    // jshint unused:false
    app.express.post('/sign-in', function(req, res) {
        app.ws().auth.signIn(req.body, function(err, token) {
            if(err){
                console.error('Sign in failed with error:', err);
                return res.status(err.statusCode || 500).json({ code:err.code, statusCode:err.statusCode, message:err.message || err });
            }
            var maxAge = 1000 * 60 * 60 * 24 * 60; // Now + 2 months
            res.cookie('token', token, { maxAge:maxAge, httpOnly:true });
            res.status(200).json({ code:200, data:{ result:token } });
        });
    });

}
