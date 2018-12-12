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

// const { CancelledAuditError } = require('../Errors');

// Maximum number of retry before declaring a URL in error.
const MAX_RUN = 3;

class JobRunner {

    constructor(job) {
        this.job   = job;
        this.audit = job.audit;
    }

    async run() {

        const { job, audit:{ browserInstance, engine, pool } } = this;

        try{
            // Create a result folder that contains resources like a screen capture.
            // Would have contained previously an offline version of the page but this is deprecated.
            // Now we are just saving the source code for debugging when sh** happens.
            job.createTimestamp();
            job.createResourcesDirectory();

            // Result hash that we will fill in after each step during audit
            job.initResult();

            const runJob = async (browserInstance) => {
                job.logger.info('Starting job...');
                job.browserInstance = browserInstance;
                return engine.runJob(job);
            };

            // If a browserInstance is provided, we can start immediately, else, we will acquire a browser instance
            // and release it back to the pool when the function resolves or throws
            await (browserInstance ? runJob(browserInstance) : pool.use((browserInstance) => {
                job.logger.info(`Browser instance (${engine.name}) acquired`);
                return runJob(browserInstance);
            }));
        }
        catch(err){
            // The underlying browser engine doesn't catch the error directly cause it wouldn't know what to do with it.
            // We are catching it inside the job runner, the one which have launched the run.
            // Except for uncaught exceptions, an audit never crash. If there is an error, the exception is saved in the report.
            this._registerException(err);
        }
        finally{
            this._processJobResult();
        }
    }

    _registerException(err) {
        // if(err && err instanceof CancelledAuditError){
        //     this.cancelled = true;
        //     return;
        // }
        this.job.registerException(err);
    }

    // Process a url job:
    // - determine success or failure
    // - aggregate results
    _processJobResult() {

        // if(this.cancelled) return;

        const job    = this.job;
        const result = job.result;
        const err    = result && result.exception;

        if(err){
            job.logger.error(`Failed to run job for URL ${job.url} (run ${job.run}):`, err);
            // In that case we will retry 2 times before we give up.
            // After 3 failures, we mark that URL in error.
            if(job.run < MAX_RUN){
                this.audit.rescheduleJob(job);
                return;
            }
        }
        else{
            if(process.env.VERBOSE)
                job.logger.info(`Job successful on URL ${result.original} with result:`, result);
            else
                job.logger.info('Job successful on URL', result.original);
        }
        this.audit.aggregateJobResult(result);
    }
}

module.exports = JobRunner;
