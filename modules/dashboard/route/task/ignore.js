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

module.exports = route;

// Route definition
function route(app) {

    app.express.post('/:id/ignore', function(req, res, next) {
        app.ws(req).task(req.params.id).get({}, function(err, task) {
            if(err) return next(err);
            var edit = {
                name:task.name
            };
            app.ws(req).task(req.params.id).edit(edit, function() {
                res.redirect('/' + req.params.id + '?rule-ignored');
            });
        });
    });

}
