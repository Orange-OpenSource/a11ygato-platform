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

var _ = require('lodash');

var presentTask   = require('../../view/presenter/task');
var presentResult = require('../../view/presenter/result');
var AuthHelper    = require('../auth/helper');

module.exports = route;

// Route definition
function route(app) {

    app.express.get('/:id', function(req, res, next) {
        app.ws(req).task(req.params.id).get({ lastres:true }, function(err, task) {
            if(err) return next(err);
            app.ws(req).task(req.params.id).results({}, function(err, results) {
                if(err) return next(err);
                const presentedResults = results.map(presentResult);
                task                 = presentTask(task);
                res.render('task', {
                    task:task,
                    results:presentedResults,
                    mainResult:task.lastResult || null,
                    added:(typeof req.query.added !== 'undefined'),
                    running:(typeof req.query.running !== 'undefined'),
                    // ruleIgnored:(typeof req.query['rule-ignored'] !== 'undefined'),
                    // ruleUnignored:(typeof req.query['rule-unignored'] !== 'undefined'),
                    hasOneResult:(presentedResults.length < 2),
                    isTaskPage:true,
                    // If you know the URL, you have a read-only access
                    editable:AuthHelper.isOwnTask(req, task),
                    // This boolean tells the view if the column "Impact" should be rendered in the errors table.
                    // This information was added recently in the data model and thus is not present in all results in database.
                    showImpactColumn:_.get(task, 'lastResult.errors[0].impact') != null
                });
            });
        });
    });

}
