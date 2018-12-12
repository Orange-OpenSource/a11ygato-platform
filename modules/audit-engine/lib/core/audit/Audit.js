/*
    @license
    @a11ygato/audit-engine
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

const _            = require('lodash');
const EventEmitter = require('events');
const shortid      = require('shortid');
const async        = require('async');
const util         = require('util');

const Job       = require('./Job');
const JobRunner = require('./JobRunner');
const UrlJudge  = require('./UrlJudge');

const getSettings   = require('../settings').get;
const pools         = require('../pools');
const chromeEngine  = require('../../engine/puppeteer/chromeEngine');
const phantomEngine = require('../../engine/phantom/phantomEngine');
const Logger        = require('../../common/Logger');

// Defaults
const defaultTask = require('./defaultTask');

// Maximum number of audition in parallel
const MAX_CONCURRENCY = 5;

// Maximum number of auditions in total
const MAX_LIMIT = 200;

class Audit extends EventEmitter {

    // `browserInstance` is optional. When provided, the whole audit will use only one instance (one tab or one page in a browser),
    // thus prohibiting concurrency.
    constructor(task = {}, browserInstance, scenario) {

        super();

        if(!task.url) throw new Error('Please provide a URL if you want to trigger an audit');

        this.id = shortid.generate();

        // Used for logging.
        this.logger = new Logger(`${scenario ? scenario.logger.prefix : ''}A/${this.id} ‣ `);

        // When provided, the entire audit is made with this instance.
        this.browserInstance = browserInstance;
        browserInstance && this.logger.info('A browser instance was provided. THe pool will not be used.');

        // When provided, it means this audit is part of a scenario.
        this.scenario = scenario;

        // Construct the final task.
        this.task = Object.assign({}, defaultTask, task);

        // When the browserInstance is provided, you can't have concurrency, the same browserInstance is used sequentially.
        this.task.concurrency = browserInstance ? 1 : Math.min(this.task.concurrency, MAX_CONCURRENCY);

        // We don't have unlimited resources.
        this.task.limit = Math.min(this.task.limit, MAX_LIMIT);

        // Module settings defined once.
        this.settings = getSettings();

        // Create a concurrency queue that will run some audit in parallel if `task.concurrency` > 1.
        this.queue = async.queue(async (job, next) => {
            const runner = new JobRunner(job);
            await runner.run();
            next();
        }, this.task.concurrency);

        // Invoked when the queue is empty (all crawled urls have been audited).
        this.queue.drain = () => {
            process.env.VERBOSE && this.logger.info(`End of crawl from root url ${this.task.url} with results:`, this.report);
            this.logger.info(`${this.report.count.error} accessibility errors have been found in total`);
            this.emit('done', this.report);
        };

        // Final hash that will aggregate all results from all audited URLs.
        // Attribute names are from legacy code.
        this.report = {
            count:{
                total:0,
                pass:0,
                error:0,
                warning:0,
                notice:0
            },
            numElements:0,
            urls:[],
            root:this.task.url
        };

        // When this counter reach down 0, we can't add any more url to audit.
        this.availableSlots = this.task.limit;

        // List of URL we have audited so far.
        this.auditedUrls = {};

        // List of URL we have analysed and not kept because of their content-type.
        this.urlsToForget = {};

        // Browser engine that will be used during this audit.
        // Keeping both engines for now but it will not last. Chrome is already the only choice.
        // TODO remove phantom when permission is granted.
        this.engine = this.task.engine === chromeEngine.name && this.settings.chrome.enabled ? chromeEngine : phantomEngine;
        this.logger.info(`Using engine ${this.engine.name}`);

        // Try to retrieve a pool for the requested engine.
        this.pool = pools.get(this.engine.name);
    }

    run() {
        return new Promise((resolve) => {
            this.on('done', resolve);
            // Start running items in the queue from task root url.
            // Depending on `depth` and `limit`, new urls will be added (crawled) later on in the queue.
            this.scheduleJob(new Job(this, this.task.url));
        });
    }

    // Aggregate each url job result
    aggregateJobResult(result) {
        this.report.count.total += result.count.total;
        this.report.count.error += result.count.error;
        this.report.count.pass += result.count.pass;
        this.report.count.warning += result.count.warning;
        this.report.count.notice += result.count.notice;
        this.report.numElements += result.numElements;
        this.report.urls.push(result);
    }

    // Add a new job to the queue.
    scheduleJob(job) {
        if(this.availableSlots < 1) return;
        if(this.isUrlTracked(job.url)) return;
        this.trackJob(job);
        this.availableSlots--;
        this.queue.push(job);
        this.logger.info('New job added to queue:', job);
    }

    // Readd an existing job to the queue. Add one to the number of runs.
    rescheduleJob(job) {
        job.run += 1;
        this.queue.push(job);
        this.logger.warn(`Existing job readded to queue. Current run: ${job.run}. Current job:`, job);
    }

    // Keep track of processed jobs.
    trackJob(job) {
        this.auditedUrls[job.url] = job;
    }

    isUrlTracked(url){
        return !!this.auditedUrls[url];
    }

    // Filter new urls found in a page and create a new `Job` for each url added to the `queue`.
    async pushNewUrls(links, job) {

        if(!links || this.availableSlots < 1) return;

        // Register a new job in the queue for each url that is valid HTML.
        const judge = new UrlJudge(links, job, this.task, this);
        links       = await judge.filterByMimeType();

        // I'm checking availableSlots before and after filtering cause it may change in the mean time.
        if(this.availableSlots < 1) return;

        job.logger.info(`Kept ${links.length} links after content-type checking: ${util.inspect(links)}`);
        for(const link of links) this.scheduleJob(new Job(this, link, job.depth + 1, 1));

    }

    // Define util.inspect() symbol in order to determine how to log an instance of Audit.
    // The goal is to only log the 100 first characters of a scenario.
    [util.inspect.custom]() {
        const extract = _.clone(_.pick(this, 'id', 'logger', 'task', 'availableSlots', 'report'));
        extract.task.scenario && (extract.task.scenario = extract.task.scenario.substring(0, Math.min(100, extract.task.scenario.length)));
        return extract;
    }

    get [Symbol.toStringTag]() {
        return 'Audit';
    }
}

// This module exports a function capable of auditing a URL.
module.exports = Audit;
