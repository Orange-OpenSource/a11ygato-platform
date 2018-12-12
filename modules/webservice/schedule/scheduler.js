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

/*
    @license
    This file is part of pa11y-webservice.

    pa11y-webservice is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    pa11y-webservice is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with pa11y-webservice.  If not, see <http://www.gnu.org/licenses/>.
*/

'use strict';

var async = require('async');
var chalk = require('chalk');
var later = require('later');

// This queue will contains all tasks running at the same time to avoid having more than 2 jobs concurrently.
var queue;

// List of created jobs. Each job is identified by its corresponding task id.
var jobs = {};

module.exports = {
    init:init,
    editJob:editJob,
    deleteJob:deleteJob
};

// Create a CRON scheduler.
function init(app, callback) {

    queue = async.queue(runTask, 2);

    // Schedule a cron job for each existing task having a cron expression.
    async.waterfall([loadAllTasks, scheduleExistingTasks], function(err) {
        if(err){
            console.error(chalk.red('Failed to schedule tasks: %s'), err.message);
            return callback(err);
        }
        console.log('Scheduler initialized @ %s', new Date());
        callback();
    });

    /////////////

    // Load all tasks in db.
    function loadAllTasks(next) {
        app.model.task.getAll(null, next);
    }

    // Iterate over all tasks and schedule a cron job for each one having a cron expression.
    function scheduleExistingTasks(tasks, next) {
        tasks.forEach(function(task) {
            editJob(task);
        });
        next();
    }

    // Run the task
    function runTask(task, done) {

        console.log(chalk.green('Running scheduled task with id %s @ %s'), task.id, new Date());

        // Execute the given task
        app.model.task.runById(task.id, function(err) {
            if(err){
                console.log(chalk.red('Failed to run task %s: %s'), task.id, err.message);
            } else{
                console.log(chalk.green('Finished task %s @ %s'), task.id, new Date());
            }
            done(err);
        });

    }
}

// Create a cron job (timer) for this task.
function editJob(task) {
    deleteJob(task.id);
    if(!task.cron) return;
    try{
        var sched = later.parse.cron(task.cron);
        var job   = later.setInterval(function() { onTick(task); }, sched);

        // Keep a reference on this job in order to delete it later.
        jobs[task.id] = job;
        console.log('Cron job created for task %s with cron configuration %s at %s', task.id, task.cron, new Date());
    } catch(ex){
        console.error('Failed to create a cron job for task %s. Pattern is probably invalid. Error: %s', task.id, ex.message);
    }

    ///////////

    function onTick(task) {
        console.log('Cron job with configuration `%s` added to queue for task `%s`', task.cron, task.id);
        queue.push(task);
    }
}

// Delete existing job if any.
// Return true if an existing job has been deleted.
function deleteJob(taskId) {
    var job = jobs[taskId];
    if(!job) return false;
    job.clear();
    jobs[taskId] = null;
    console.log(chalk.yellow('Cron job deleted for task %s'), taskId);
    return true;
}
