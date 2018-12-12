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

    app.express.get('/new', function (req, res) {
        res.render('task/edit', {
            isNewTaskPage: true,
            formAction: '/new',
            isScenario:req.query.type === 'scenario'
        });
    });

    app.express.post('/new', function (req, res) {
        app.ws(req).tasks.create(req.body, function (err, task) {
            if (err) {
                return res.render('task/edit', {
                    error: err,
                    task: req.body,
                    isScenario:req.body.type === 'scenario'
                });
            }
            res.redirect('/' + task.id + '?added');
        });
    });

}
