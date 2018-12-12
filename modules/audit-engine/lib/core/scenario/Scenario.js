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

const util = require('util');

const shortid  = require('shortid');
const prettyMs = require('pretty-ms');
const _        = require('lodash');
const { VM }   = require('vm2');

const Sandbox    = require('./Sandbox');
const pools      = require('../pools');
const EngineEnum = require('../../engine/EngineEnum');
const Logger     = require('../../common/Logger');


class Scenario {

    constructor(task) {

        // The `scenario` property is a String containing the script (source code).
        if(!task || !task.scenario) throw new Error('No scenario property present in the task configuration provided');

        this.id = shortid.generate();

        // Used for logging.
        this.logger = new Logger(`S/${this.id} ‣ `);

        // Default scenario timeout is 4 hours.
        // Hardcoded. Not configurable via settings or task.
        this.timeout = 1000 * 60 * 60 * 4;

        // In a scenario mode, all tasks properties except the `scenario` one are useless because
        // each audit configuration will be provided at runtime inside the script when invoking `audit()`.
        this.task = task;

        // In a scenario, you can't choose your engine: it's chrome.
        this.task.engine = EngineEnum.CHROME;

        // Final report that will aggregate several reports (one per audit).
        // Attribute names are from legacy code.
        // The structure is almost identical to what we use in class Audit.
        // The only difference is the absence of `root` and the presence of `scenario:true` properties.
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
            scenario:true
        };

        // Get Chrome pool.
        this.pool = pools.get(this.task.engine);
    }

    // Load the puppeteer script (scenario) in a vm (new isolated V8 context) and process results.
    async run() {

        try{
            this.logger.info('Starting scenario…');

            // Obtain a chrome instance (chrome tab) from pool.
            this.browserInstance = await this.pool.acquire();

            // Create the sandbox used to populate the vm global context.
            this.sandbox = new Sandbox(this);

            // Wrap the scenario source code in order to always return a promise and allow async/await syntax.
            const script = `
            
                // ---------------------------------------------------------------------------------------------------------------------
                // Let me try to explain this strange code.
                // It is my understanding after a lot of tests that we can't exchange an uncaught rejected promise between two V8 contexts.
                // The first V8 context is our node server (which I call the host) and the second is this script containing code provided by a user
                // and executed by the vm2 module which uses behind the scene, node's vm module.
                
                // Even if you catch a rejected promise in the host context, this is too late. You need to catch it also in the vm one. 
                // Indeed, the vm one doesn't know about it and think you didn't catch it at all, thus invoking global error handlers
                // which are shared between contexts as explained in links below.
                // So concretely, this simple code will trigger an 'unhandledRejection' event: "new Promise((resolve, reject) => reject());"
                
                // Explanations:
                // - https://github.com/nodejs/help/issues/942
                // - https://github.com/nodejs/node/issues/3020
                
                // Today the inconvenience is small: an informative error in the log. But tomorrow, if node kills the process in case of
                // 'unhandledRejection', it will become a very big inconvenience which will invalidate this architecture.
                // In that case, we might be forced to fork each scenario into its own process but that won't be cheap.
                // ---------------------------------------------------------------------------------------------------------------------
                
                const Q = require('q'); 
                
                // I'm wrapping user code into an async function to allow users to use directly the await keyword. 
                // It just works. No need for an IIEF.     
                async function wrapper() { 
                    ${this.task.scenario}
                }
                
                // I'm casting the wrapper function returned value (which is hopefully a promise) as a Q promise.
                // It allows me to use the 'timeout()' method which doesn't exist in the Promise standard yet. 
                Q(wrapper()
                    // The famous catch block that avoid an 'unhandledRejection' error.
                    .catch((err) => { 
                        // The resolved promise contains an err property containing this script rejected value.
                        // As I explained, you can't return a rejected promise.
                        return { err };
                    })
                )
                .timeout(${this.timeout}, 'Scenario killed after timeout of ${prettyMs(this.timeout, { verbose:true })}');
            `;

            if(process.env.VERBOSE) this.logger.debug('Script:', script);

            // Execute source code in a vm
            const vm     = new VM({ timeout:this.timeout, sandbox:this.sandbox.globalContext });
            const result = await vm.run(script);

            this.logger.debug('Script has finished running');

            // The only thing we may receive from the executed code is an exception.
            if(result && result.err) throw result.err;

            // Wrap the returned promise into a Q promise in order to use the `timeout()` utility method which will abort the scenario
            // after a certain amount of time.
            // await Q(done).timeout(this.timeout, util.format('Scenario killed after timeout of %s', prettyMs(this.timeout, { verbose:true })));

            this.sandbox.completed = true;

            if(this.sandbox.promiseCount > this.sandbox.reportCount){
                throw new Error('You are still auditing after your script has completed. Did you forget to await something?');
            }

            this.logger.info('Scenario has finished.');
        }
        catch(err){
            this.logger.error('Scenario crashed:', err && err.message || err);
            // Set the `exception` property with the catched error.
            this.registerException(err);
        }
        finally{
            // Release chrome tab.
            this.browserInstance && this.pool.release(this.browserInstance);
        }
        // Final report containing all aggregated results (at least one audit in theory).
        return this.report;
    }

    // Concatenate results from an audit into a common report.
    aggregateAuditResult(result) {
        this.report.count.total += result.count.total;
        this.report.count.error += result.count.error;
        this.report.count.pass += result.count.pass;
        this.report.count.warning += result.count.warning;
        this.report.count.notice += result.count.notice;
        this.report.numElements += result.numElements;
        this.report.urls.push(...result.urls);
    }

    registerException(err) {
        this.report.exception = (err && err.message) || err;
    }

    [util.inspect.custom]() {
        const extract = _.clone(_.pick(this, 'id', 'logger', 'timeout', 'task', 'report'));
        extract.task.scenario && (extract.task.scenario = extract.task.scenario.substring(0, Math.min(100, extract.task.scenario.length)));
        return extract;
    }

    get [Symbol.toStringTag]() {
        return 'Scenario';
    }

}


module.exports = Scenario;
