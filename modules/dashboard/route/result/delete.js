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

const presentResult = require('../../view/presenter/result');

module.exports = route;

// Route definition
function route (app) {

    app.express.get('/tasks/:tid/results/:rid/delete', (req, res, next) => {
        const tid = req.params.tid;
        const rid = req.params.rid;
        app.ws(req).task(tid).result(rid).get({},(err, result) => {
            if(err) return next(err);
            res.render('result/delete', {
                result:presentResult(result),
                isResultSubPage:true
            });
        });
    });

    app.express.post('/tasks/:tid/results/:rid/delete', (req, res, next) => {
        const tid = req.params.tid;
        const rid = req.params.rid;
        app.ws(req).task(tid).result(rid).delete({}, (err) => {
            if (err) return next(err);
            res.redirect('/' + tid);
        });
    });

}
