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

const Page    = require('puppeteer/lib/Page').Page;

const Audit = require('../audit/Audit');

////////////

const whitelist = ['q', 'url', 'async', 'lodash', 'util'];

// A sandbox is an object whose properties will be accessible as global objects in the vm.
// The page is the browser instance retrieved from the pool.
// In the sandbox, I'm using the term 'page' instead of 'browserInstance' because it is simpler et more explicit for the end user.
class Sandbox {

    constructor(scenario) {

        this.scenario = scenario;

        this.logger = scenario.logger;

        // Real Puppeteer page
        this.realPage  = scenario.browserInstance;

        // Proxy for the real puppeteer page.
        this.proxyPage = this.createProtectedPage(this.realPage);

        // Flag that will be set to true once the script has terminated.
        this.completed = false;

        // Every time an audit is invoked we keep a reference to the returned promise.
        // It will be used to keep track of ghost promises that have not been awaited in the script.
        this.promiseCount = 0;

        // Every time an audit complete, we keep track of its result (the report).
        // By comparing the number of reports and the number of promises, we will know if there is ghost promises in this script
        // due to some missing `await`.
        this.reportCount = 0;

        // All these properties will be accessible as global objects in the vm.
        this.globalContext = {
            id:scenario.id,
            page:this.proxyPage,
            console:{
                debug:this.logger.debug.bind(this.logger),
                info:this.logger.info.bind(this.logger),
                log:this.logger.info.bind(this.logger),
                warn:this.logger.warn.bind(this.logger),
                error:this.logger.error.bind(this.logger)
            },
            audit:this.audit.bind(this),
            // Vendors
            require: this.require.bind(this),
            Buffer,
        };

    }

    // Trigger an audit with all its possibilities like crawl.
    // 1. If `page` is provided, the whole audit is made with that instance. Concurrency is forcibly 1 (see `Audit()`).
    //   1.1. if `task` or `task.url` is omitted, the current page url is used.
    // 2. if `page` is NOT provided and `task.url` is setted, a classic audit begins with optional concurrency.
    //   2.1. if `task.url` is not setted, an error is thrown (see `Audit()`).
    async audit(proxyPage, task) {

        // Should not be possible but better be safe than sorry.
        if(this.completed) {
            this.logger.error('You are trying to execute an audit after script completion. Maybe you forget to await something.');
            return;
        }

        switch(arguments.length){
            case 0:
                throw new Error('You must provide a `page` and/or `task`. You can\'t omit both.');
            case 1:
                if(!(proxyPage instanceof Page) && typeof(proxyPage) === 'object'){
                    task      = proxyPage;
                    proxyPage = null;
                }
                else if(!(proxyPage instanceof Page) && typeof(proxyPage) !== 'object'){
                    throw new Error('Please provide either a valid task or page.');
                }
                break;
            case 2:
                if(!(proxyPage instanceof Page)) throw new Error('`page` is not a valid Page instance.');
                if(typeof(proxyPage) !== 'object') throw new Error('`task` is not a valid task.');
                break;
        }
        task = task || {};
        if(proxyPage && !task.url){
            task.url = await proxyPage.url();
        }

        // The puppeteer page injected into our user script is not the real page but a proxy with a few protected properties.
        // Nonetheless, into our own code, we need the real page because we will invoke some protected methods like 'screenshot()'.
        const audit = new Audit(task, proxyPage ? this.realPage : null, this.scenario);
        const promise = audit.run();
        this.promiseCount++;
        const report = await promise;
        this.reportCount++;
        this.scenario.aggregateAuditResult(report);
    }

    // Custom require based on a whitelist.
    // Only a few dependencies are requirable.
    require(dep){
        if(whitelist.includes(dep)) return require(dep);
        throw new Error(`Dependency ${dep} not whitelisted.`);
    }

    // Override some Puppeteer methods because we don't want them to have unlimited powers like taking a screenshot and thus creating a file.
    createProtectedPage(page) {
        const protectedProperties = ['close', 'injectFile', 'pdf', 'screenshot'];
        const handler             = {
            get:function(target, property) {
                // If property is protected, we return a no-op function.
                if(protectedProperties.find(el => el === property)){
                    this.logger.warn(`Unauthorized access to protected method ${property}()`);
                    return function() {};
                }
                return target[property];
            }
        };
        return new Proxy(page, handler);
    }

}

module.exports = Sandbox;

