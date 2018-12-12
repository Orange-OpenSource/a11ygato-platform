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

const Q      = require('q');
const fs     = require('fs');
const _      = require('lodash');
const path   = require('path');
const VError = require('verror');
const Chrome = require('chrome-remote-interface');

const Utils      = require('../../common/Utils');
const EngineEnum = require('../EngineEnum');

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

function runJob(job) {

    const browserInstance = job.browserInstance;
    const audit = job.audit;
    const task = audit.task;
    const settings = audit.settings;

    const pageWidth = 1920;
    let pageHeight; // Measured page height computed at runtime.

    // Alias
    const result = job.result;

    return Chrome({ tab:browserInstance }).then(function(client) {

        job.logger.info('Chrome tab connected');

        // Extract used DevTools domains.
        const Page      = client.Page;
        const Network   = client.Network;
        const Runtime   = client.Runtime;
        const Emulation = client.Emulation;
        const Console   = client.Console;
        const Log       = client.Log;
        const Security  = client.Security;

        Security.certificateError(function certificateError(eventId) {
            console.log('eventId:', eventId);
            Security.handleCertificateError({ eventId:eventId, action:'continue' });
        });

        // Log remote console messages in node console.
        Console.messageAdded(function messageAdded(addedMessage) {
            job.logger.debug('PAGE LOG:', addedMessage.message.text);
        });

        // Log remote console messages in node console. Don't know why we need both. But some errors are not logged by Console#messageAdded().
        Log.entryAdded(function entryAdded(addedEntry) {
            job.logger.debug('PAGE LOG:', addedEntry.entry.text);
        });

        Page.domContentEventFired(function domContentEventFired() {
            job.logger.debug('`DOMContentLoaded` event fired');
        });

        return enableChromeDomains()
            .then(guard(navigateToPage, 'Timed out navigating to ' + job.url))
            .then(guard(waitForLoadEvent, 'Timed out waiting for `load` event'))
            .then(guard(logCurrentUrl, 'Timed out logging current url'))
            .then(guard(measurePageHeight, 'Timed out measuring page height'))
            .then(guard(setViewportSize, 'Timed out setting viewport size'))
            .then(guard(recordPageSource, 'Timed out recording page source'))
            .then(guard(captureScreenshot, 'Timed out capturing a screenshot'))
            .then(guard(countElements, 'Timed out counting the number of HTML elements'))
            .then(guard(crawl, 'Timed out crawling the page for new links'))
            .then(guard(insertAxeScript, 'Timed out inserting axe-core script in the page'))
            .then(guard(executeAxeTests, 'Timed out executing axe-core tests for the page'))
            .catch(function(err) {
                job.registerException(err);
            })
            .then(function() {
                return job;
            })
            .finally(guard(disconnect, 'Timed out disconnecting from Chrome headless'));


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

        // Activate used domains in Chrome Debugging Protocol
        function enableChromeDomains() {
            return Q([
                Network.enable(),
                Runtime.enable(),
                Page.enable(),
                Console.enable(),
                Log.enable(),
                Security.enable()
            ])
                .then(function() {
                    // Bypass certificate errors
                    // https://github.com/cyrus-and/chrome-remote-interface/wiki/Bypass-certificate-errors-(%22Your-connection-is-not-private%22)
                    return Security.setOverrideCertificateErrors({ override:true });
                });
        }

        function navigateToPage() {
            job.logger.info('Navigating to page…');
            return Page.navigate({ url:job.url });
        }

        // Block the promise chain until the page load event is fired.
        function waitForLoadEvent() {
            job.logger.info('Waiting for `load` event…');
            return new Promise(function(resolve) {
                Page.loadEventFired(function loadEventFired() {
                    job.logger.info('`load` event fired');
                    // job.logger.info('Waiting all page iframes loading…');
                    // return Runtime.evaluate({ expression:generateExpression(waitIframesLoading) });
                    resolve();
                });
            });

            //////////

            // function waitIframesLoading() {
            //     const iframes = document.querySelectorAll('iframe');
            //     console.log('There is %s iframes in this page', iframes.length);
            //     iframes.forEach(function(iframe) {
            //         const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            //         console.log('iframe state:', iframeDoc.readyState);
            //     });
            // }
        }

        // Define a common screen size for all audits.
        function setViewportSize() {
            job.logger.info('Trying to set viewport size…');
            return Emulation.setDeviceMetricsOverride({
                width:pageWidth,
                height:pageHeight,
                mobile:false,
                deviceScaleFactor:1,
                fitWindow:false
            }).then(function() {
                return Page.getLayoutMetrics();
            }).then(function(metrics) {
                job.logger.info('Viewport:', metrics.layoutViewport.clientWidth, 'x', metrics.layoutViewport.clientHeight);
            });
        }

        /* Log the current url after a LOAD event to see if it is equivalent to the one we navigated to. */
        function logCurrentUrl() {
            job.logger.info('URL registered for audition is:', job.url);
            return Runtime.evaluate({ expression:'window.location.href' }).then(function(response) {
                const liveURL = Utils.sanitize(parseResponse(response));
                job.liveURL = Utils.sanitize(liveURL);
                job.logger.info('URL really audited after being loaded in Chrome is:', liveURL);
            });
        }

        /* Disconnect client from remote chrome. */
        function disconnect() {
            job.logger.info('Trying to disconnect from Chrome headless…');
            return client.close().then(function() {
                job.logger.info('Client disconnected');
            });
        }

        /*
         * Save HTML source on file system (useful for debugging)
         * This is not mandatorily what was send by the server, but what we have in the DOM in the moment.
         * */
        function recordPageSource(prefix) {

            job.logger.info('Navigated to', task.url);
            job.logger.info('Trying to record the page source…');

            if(!prefix) prefix = '';

            const filename = path.join(job.resourcesDirectory, prefix + settings.sourceFilename);
            return Runtime.evaluate({ expression:'document.documentElement.outerHTML' }).then(saveSource);

            function saveSource(response) {
                const source = parseResponse(response);
                return writeFile(filename, source).then(function() {
                    job.logger.info('HTML source code saved');
                }).catch(function(err) {
                    throw new VError(err, 'Failed to save source code:');
                });
            }
        }

        /* Count how many HTML elements there is in the page (will serve to compute a KPI). */
        function countElements() {
            job.logger.info('Trying to count the number of HTML elements…');

            // Count the number of HTML elements in page. Will serve to compute a KPI.
            return Runtime.evaluate({ expression:generateExpression(remote__countElements) }).then(function(response) {
                const count          = parseResponse(response);
                result.numElements = count;
                job.logger.info('Counted', count, 'elements in page');
            });

            function remote__countElements() {
                return document.getElementsByTagName('*').length;
            }
        }

        // Search for new links in the page.
        function crawl() {
            // We don't need to crawl new urls if we are already at the lower level of depth
            if(job.depth === task.depth){
                return job.logger.info('Maximum depth reached: no more crawling');
            }

            if(audit.availableSlots === 0){
                return job.logger.info('Maximum number of auditions reached: no more crawling');
            }

            // Crawl the page in order to register new URLs to audit (from the same domain) .
            return Runtime.evaluate({ expression:generateExpression(remote__crawl), returnByValue:true }).then(function(response) {
                const links = parseResponse(response);
                return audit.pushNewUrls(links, job);
            });

            ////////////

            function remote__crawl() {
                // Convert a NodeList to an array of anchors
                var anchors = Array.prototype.slice.call(document.querySelectorAll('a'));
                console.log('Found', anchors.length, 'anchors');
                // Convert an array of anchors to an array of URL
                var links = Array.prototype.map.call(anchors, function(anchor) {
                    // Eliminate the empty string
                    return anchor && anchor.href || null;
                });
                return links;
            }
        }

        // Measure at runtime page height (not window). Will be used later to create a complete screenshot of the page.
        function measurePageHeight() {
            // TODO some sites like ingdirect obtain a wrong measure (very very high)
            return Runtime.evaluate({
                expression:'Math.max(document.body.scrollHeight, document.body.offsetHeight, document.documentElement.clientHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight)'
            }).then(function(response) {
                // 100000: Security height to avoid crashing the whole process when page height is miscalculated.
                pageHeight = Math.min(parseResponse(response), 100000);
                job.logger.info('Page true height:', pageHeight);
            });
        }

        /*
         * Save a screenshot of the page.
         * WARNING: there is a very strong possibility the captured screenshot is incomplete when main content has scroll in an absolute div
         * instead of page normal flow.
         * */
        function captureScreenshot() {
            // TODO improve screenshot fidelity on very very big pages like boosted.orange.com/css. The screenshot is cropped.
            const filename = path.join(job.resourcesDirectory, settings.screenshotFilename);
            job.logger.info('Trying to capture a screenshot…');
            return Emulation.setVisibleSize({ width:pageWidth, height:pageHeight })
                .then(function() {
                    // A security delay is necessary to avoid having a cropped screenshot.
                    return Q.delay(1000);
                }).then(function() {
                    return Page.captureScreenshot({ format:'png', quality:100 });
                }).then(function(response) {
                    parseResponse(response); // check for errors
                    return writeFile(filename, response.data, 'base64');
                }).then(function() {
                    job.logger.info('Screenshot captured');
                }).catch(function(err) {
                    throw new VError(err, 'Failed to capture a screenshot');
                });
        }

        /*
         * Inject axe-core script and return a promise with the result.
         * */
        function insertAxeScript() {
            job.logger.info('Trying to insert axe script in page…');
            return new Promise(function(resolve, reject) {
                fs.readFile(settings.axeScript, 'utf8', function(err, content) {
                    if(err) return reject(err);
                    Runtime.evaluate({ expression:content })
                        .then(function() {
                            return Runtime.evaluate({ expression:'window.axe.version' });
                        })
                        .then(function(response) {
                            const version = parseResponse(response); // Will throw an exception if response contains an error.
                            job.logger.info('Axe version available in global namespace:', version);
                        })
                        .then(resolve)
                        .catch(reject);
                });
            });
        }

        /*
         * Execute axe tests and return results via a promise.
         * */
        function executeAxeTests() {

            job.logger.info('Trying to execute axe tests…');
            return Runtime.evaluate({
                expression:generateExpression(remote__executeAxeTests),
                awaitPromise:true,
                returnByValue:true
            })
                .then(function(response) {
                    const axeResults = parseResponse(response);
                    if(process.env.VERBOSE) job.logger.info('Axe results:', Utils.stringify(axeResults));
                    // Set results in a generic and above all legacy format used before when their was several a11y engines.
                    _.extend(result, Utils.convertAxeResults(axeResults));
                    // Set results in the raw axe format
                    if(settings.includeRawAxeResults) result.raw = { axe:axeResults };
                    job.logger.info('Axe results converted:', result);
                });

            // Serialized and executed remotely in chrome headless.
            function remote__executeAxeTests() {
                return new Promise(function(resolve, reject) {
                    try{
                        window.axe.configure({ 'reporter':'v1' });
                        console.log('Axe configured');
                        var axeOptions = {
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


        /* Generate an IIEF string invoking `fn` */
        function generateExpression(fn, placeholders) {
            let expression = '(' + fn.toString() + ')()';
            for(const key in placeholders){
                if(placeholders.hasOwnProperty(key)){
                    expression = expression.replace('${' + key + '}', placeholders[key]);
                }
            }
            if(process.env.VERBOSE) job.logger.info('Serialized IIEF:', expression);
            return expression;
        }

        /* Extract result from response. If result is an error, it is thrown immediately. */
        function parseResponse(response) {
            if(process.env.VERBOSE){
                job.logger.info('-----------------------------------------------');
                job.logger.info('response:', response);
                job.logger.info('-----------------------------------------------');
            }
            const errmsg = _.get(response, 'exceptionDetails.exception.value');
            if(errmsg) throw new VError(errmsg);
            if(_.get(response, 'result.subtype') === 'error') throw new VError(response.result.description);
            return _.get(response, 'result.value');
        }

    });

}
