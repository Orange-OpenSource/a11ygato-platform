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

const _    = require('lodash');
const Q    = require('q');
const fs   = require('fs');
const path = require('path');

const { URL } = require('url');

const Utils      = require('../../common/Utils');
const EngineEnum = require('../EngineEnum');
const Errors     = require('../../core/Errors');

/*
 * Chrome headless engine.
 *
 * As a convention, functions prefixed with "remote__" are functions executed in the context of Chrome headless, meaning, in a remote context.
 *
 * */

// Pointer to a promise-friendly function I will be using later on.
const writeFile = Q.nbind(fs.writeFile, fs);

module.exports = {
    name:EngineEnum.CHROME,
    // Responsible to audit a page in Chrome.
    runJob:runJob
};

/////////////////////

async function runJob(job) {

    const { browserInstance:page, audit } = job;
    const { task, settings }              = audit;

    // Alias
    const result = job.result;

    job.logger.info('Chrome tab connected');

    // Log remote console messages in node console.
    page.on('console', (msg) => {
        job.logger.debug('PAGE LOG:', msg.text());
    });

    // Log LOAD event in time
    page.on('load', () => job.logger.debug('`LOAD` event fired'));

    try{
        await guard(navigateToPage, 'Timed out navigating to ' + job.url)();
        await guard(logCurrentUrl, 'Timed out logging current url')();
        await guard(recordPageSource, 'Timed out recording page source')();
        await guard(captureScreenshot, 'Timed out capturing a screenshot', 10000)();
        await guard(countElements, 'Timed out counting the number of HTML elements')();
        await guard(crawl, 'Timed out crawling the page for new links')();
        await guard(insertAxeScript, 'Timed out inserting axe-core script in the page')();
        await guard(executeAxeTests, 'Timed out executing axe-core tests for the page')();
    }
    finally{
        page.removeAllListeners('console').removeAllListeners('load');
    }
    return job;


    //////////////////////

    // Create a function that invoke `fn` and apply a timeout upon the returned promise.
    // `fn`: function to invoke in the chain of promises
    // `message`: optional message to use for timeout
    // `timeout`: optional timeout value ; default is `task.timeout`
    function guard(fn, message, timeout) {
        timeout = timeout || task.timeout;
        return function() {
            return Q(fn.apply(null, arguments)).timeout(timeout, message);
        };
    }

    async function navigateToPage() {
        // Enabled in Puppeteer 1.3 only.
        // Until I understand why Puppeteer version > 1.1.1 fail on prod, we can't use this.
        // The direct consequence is that some site like https://twitter.com will not work cause their CSP will prevent injecting
        // the axe script. The bad news is that this fail is silent and do not trigger an exception.
        await page.setBypassCSP(true);
        job.logger.info('Navigating to page…');
        return new Promise((resolve, reject) => {
            page.goto(job.url, { timeout:task.timeout, waitUntil:'load' })
                .then((response) => {
                    // Some sites are still doing things after the load event.
                    // To avoid too much difference between two runs, I'm adding a bit of latency.
                    // It will slow down everyone but add more consistency to scores.
                    setTimeout(() => resolve(response), 1000);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    /* Log the current url after a LOAD event to see if it is equivalent to the one we navigated to. */
    async function logCurrentUrl() {
        job.logger.info('URL registered for audition is:', job.url);

        const redirect = await page.url();
        job.logger.info('URL really audited after being loaded in Chrome is:', redirect);

        // I'm comparing the source and target in order to determine if there was a redirection.
        // In that case, if protocol and host don't match, I choose to mark the url in error.
        // The goal is to educate the end-user and make him understand that it is not really auditing the url he thought.
        // A common scenario is to found an http://… url that is redirected to https://…
        // Technically, this is another URL potentially hitting another machine.
        if(redirect === job.url) return;

        const sourceUrl = new URL(job.url);
        const finalUrl  = new URL(redirect);
        if(sourceUrl.host !== finalUrl.host || sourceUrl.protocol !== finalUrl.protocol){
            throw new Errors.InvalidRedirectionError({ info:{ sourceUrl:job.url, url:redirect } });
        }

        // // check if the loaded URL has already been audited and if so, cancel the current audit
        // if(audit.auditedUrls[job.url]){
        //     job.logger.info(`URL ${job.url} already audited or scheduled`);
        //     const cause = new Errors.UrlAlreadyAuditedError({ info:{ url:job.url, sourceUrl:origin } });
        //     throw new Errors.CancelledAuditError({ cause });
        // }
        //
        // // Track it in case we found it again during this crawl or another.
        // audit.trackJob(job);
    }

    /*
     * Save a screenshot of the page.
     * WARNING: there is a very strong possibility the captured screenshot is incomplete when main content has scroll in an absolute div
     * instead of page normal flow.
     * */
    async function captureScreenshot() {
        job.logger.info('Taking screenshot…');
        const pageWidth = 1680, pageHeight = 1050;
        await page.setViewport({ width:pageWidth, height:pageHeight });
        job.logger.info('Viewport:', pageWidth, 'x', pageHeight);
        const filename = path.join(job.resourcesDirectory, settings.screenshotFilename);
        await page.screenshot({ path:filename, fullPage:true });
        job.logger.info('Screenshot captured');
    }

    /*
     * Save HTML source on file system (useful for debugging)
     * This is not mandatorily what was send by the server, but what we have in the DOM in the moment.
     * */
    async function recordPageSource(prefix) {
        job.logger.info('Trying to record the page source…');
        if(!prefix) prefix = '';
        const filename = path.join(job.resourcesDirectory, prefix + settings.sourceFilename);
        const source   = await page.content();
        await writeFile(filename, source);
        job.logger.info('HTML source code saved');
    }

    /* Count how many HTML elements there is in the page (will serve to compute a KPI). */
    async function countElements() {
        job.logger.info('Trying to count the number of HTML elements…');
        // Count the number of HTML elements in page. Will serve to compute a KPI.
        const count        = await page.evaluate(() => document.getElementsByTagName('*').length);
        result.numElements = count;
        job.logger.info('Counted', count, 'elements in page');
    }

    // Search for new links in the page.
    async function crawl() {
        // We don't need to crawl new urls if we are already at the lower level of depth
        if(job.depth === task.depth){
            return job.logger.info('Maximum depth reached: no more crawling');
        }

        if(audit.availableSlots < 1){
            return job.logger.info('Maximum number of auditions reached: no more crawling');
        }

        // Crawl the page in order to register new URLs to audit (from the same domain) .
        const links = await page.evaluate(remote__crawl);
        await audit.pushNewUrls(links, job);

        ////////////

        function remote__crawl() {
            // Convert a NodeList to an array of anchors
            const anchors = Array.prototype.slice.call(document.querySelectorAll('a'));
            console.log('Found', anchors.length, 'anchors');
            // Convert an array of anchors to an array of URL
            const links = Array.prototype.map.call(anchors, function(anchor) {
                // Eliminate the empty string
                return anchor && anchor.href || null;
            });
            return links;
        }
    }

    /*
     * Inject axe-core script and return a promise with the result.
     * */
    async function insertAxeScript() {
        job.logger.info('Trying to insert axe script in page…');
        await page.addScriptTag({ path:settings.axeScript });
        const axeVersion = await page.evaluate(() => window.axe && window.axe.version);
        // TODO: Remove mention of CSP below after enabling #setBypassCSP() in #navigateToPage().
        // I'm forced to make a manual check and throw myself an error cause a CSP will make puppeteer to fail silently.
        if(!axeVersion) throw new Error('Rules engine not injected in page: there is a strong probability a Content-Security-Policy is blocking script injection.');
        job.logger.info('Axe version available in global namespace:', axeVersion);
    }

    /*
     * Execute axe tests and return results via a promise.
     * */
    async function executeAxeTests() {

        job.logger.info('Trying to execute axe tests…');

        const axeResults = await page.evaluate(remote__executeAxeTests);

        if(process.env.VERBOSE) job.logger.info('Axe results:', Utils.stringify(axeResults));
        job.logger.info('Converting results…');

        // Set results in a generic and above all legacy format used before when their was several a11y engines.
        _.extend(result, Utils.convertAxeResults(axeResults));

        // Set results in the raw axe format
        if(settings.includeRawAxeResults) result.raw = { axe:axeResults };

        ////////////

        // Serialized and executed remotely in chrome headless.
        function remote__executeAxeTests() {
            return new Promise(function(resolve, reject) {
                try{
                    window.axe.configure({ 'reporter':'v1' });
                    console.log('Axe configured');
                    const axeOptions = {
                        'rules':{
                            'bypass':{ enabled:false },
                            'video-caption':{ enabled:false },
                            'audio-caption':{ enabled:false },
                            'object-alt':{ enabled:false },
                            'video-description':{ enabled:false }
                        },
                        'runOnly':{
                            'type':'tag',
                            'values':['wcag2a', 'wcag2aa']
                        }
                    };
                    console.log('Running axe…');
                    window.axe.run(document, axeOptions, function(err, axeResults) {
                        console.log('Axe runned');
                        var errmsg = (err && err.message) || err;
                        if(errmsg) return reject(errmsg);
                        resolve(axeResults);
                    });
                } catch(err){
                    var errmsg = (err && err.message) || err;
                    console.error('ERR:', errmsg);
                    reject(errmsg);
                }
            });
        }
    }

}
