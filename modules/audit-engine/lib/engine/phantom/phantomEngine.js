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
const path   = require('path');
const _      = require('lodash');
const VError = require('verror');

const Utils       = require('../../common/Utils');
const EngineEnum  = require('../EngineEnum');

// Responsible to audit a page in Phantom.
module.exports = {
    name:EngineEnum.PHANTOM,
    runJob:runJob
};

/////////////////

/*
 * - `browserInstance`: a browser instance from a pool (either phantom or chrome)
 * - `job`: TODO
 * - `task`: TODO
 * - `settings`: TODO
 * - `context`: TODO
 */
function runJob(job) {

    const browserInstance = job.browserInstance;
    const audit = job.audit;
    const task = audit.task;
    const settings = audit.settings;

    // The page instance created by Phantom that will be populated after #openPage has been invoked.
    let page;

    // Alias
    const result = job.result;

    // Pointer to a promise-friendly function I will be using later on.
    const writeFile = Q.nbind(fs.writeFile, fs);

    // Flag that indicates we killed manually our phantom instance.
    // Sometimes a phantom process become unresponsive (100% cpu) when axe execute some tests.
    // For instance, the color-contrast test uses an unsupported API in Webkit which is polyfilled without much success.
    let killSwitch = false;

    return createPage()
        .then(openPage)
        .then(function(status) {
            job.logger.info('Page loaded? :', status);
            if(status !== 'success') throw new Error('Cannot open ' + job.url);
        })
        .then(function() {
            // Record page source for debugging when sh** happens.
            return recordPageSource();
        })
        .then(function() {
            // Set viewport size
            return page.property('viewportSize', { width:1280, height:768 })
                .then(function() {
                    return page.property('viewportSize');
                })
                .then(function(viewport) {
                    job.logger.info('Viewport: ', viewport.width, 'x', viewport.height);
                });
        })
        // Inject accessibility libraries
        .then(injectJsScripts)
        .then(function() {
            // Log current URL
            // There is potentially a difference between the url we asked Phantom to load
            // and the url we finally analysed because there may be one or several redirections.
            job.logger.info('URL registered for audition is:', job.url);
            return page.property('url').then(function(liveURL) {
                job.liveURL = Utils.sanitize(liveURL);
                job.logger.info('URL really audited after being loaded in Phantom is:', liveURL);
            });
        })
        .then(function() {
            // Count the number of HTML elements in page. Will serve to compute a KPI.
            return evaluateInPhantom({ fn:countElements }).then(function(count) {
                result.numElements = count;
                job.logger.info('Counted', count, 'elements in page');
            });
        })
        .then(function() {
            // Search for new URLs to audit.
            // We don't need to crawl new urls if we are already at the lower level of depth
            if(job.depth === task.depth){
                return job.logger.info('Maximum depth reached: no more crawling');
            }
            if(audit.availableSlots === 0){
                return job.logger.info('Maximum number of auditions reached: no more crawling');
            }
            // Crawl the page in order to register new URLs to audit (from the same domain) .
            return evaluateInPhantom({ fn:crawl }).then(function(links) {
                return audit.pushNewUrls(links, job);
            });
        })
        .then(function() {
            // Launch axe analysis
            return evaluateInPhantom({ fn:executeAxeTests, timeoutMessage:'Timeout executing axe tests' }).catch(function(err) {
                return Q.reject(new VError(err, 'Axe analysis failed'));
            });
        })
        .then(function() {
            job.logger.info('Axe tests executing… Waiting for results.');
            // Wait for axe results
            return waitFor({ fn:axeResults, listenToErrors:false, timeoutMessage:'Timeout waiting for axe results' })
                .then(success)
                .catch(failure);

            ////////
            function axeResults() {
                // I'm keeping only the message for axeErr because serializing an Error instance from the phantom
                // context to node get us an Object instead of an Error.
                return { err:window.axeErr && window.axeErr.message, results:window.axeResults };
            }

            // Change results structure
            function success(data) {
                if(data.err) return failure(data.err);
                // Set results in a generic and above all legacy format used before when their was several a11y browserInstances.
                _.extend(result, Utils.convertAxeResults(data.results));
                // Set results in the raw axe format
                if(settings.includeRawAxeResults) result.raw = { axe:data.results };
                job.logger.info('Axe results converted');
            }

            function failure(err) {
                return Q.reject(new VError(err, 'Error while waiting for Axe results'));
            }
        })
        // Save a screen capture in file system that we can view via a result page.
        .then(recordScreenCapture)
        .catch(function(err) {
            result.exception = (err && err.message) || err;
        })
        .then(function() {
            // Forward result
            return job;
        })
        .finally(function() {
            releaseResources();
        });

    ///////////

    function releaseResources() {
        job.logger.info('Page released');
        // Close the page and releases the memory heap associated with it.
        !killSwitch && page && page.close();
    }

    function createPage() {
        return Q(browserInstance.createPage()).timeout(task.timeout, 'Timeout creating phantom page ' + job.url);
    }

    // Open the job url into Phantom. Some listeners are set before opening the page.
    function openPage(p) {
        page = p;

        page.on('onConsoleMessage', function(msg) {
            job.logger.debug('PAGE LOG: ' + msg);
        });

        // Log page navigations after page was opened.
        page.on('onNavigationRequested', function navigationDidRequested(url, type, willNavigate, main) {
            job.logger.debug('Trying to navigate to: ' + url);
            job.logger.debug('Caused by: ' + type);
            job.logger.debug('Will actually navigate: ' + willNavigate);
            job.logger.debug('Sent from the page\'s main frame: ' + main);
        });

        return Q(page.open(job.url)).timeout(task.timeout, 'Timeout opening phantom page ' + job.url);
    }

    // Evaluate a function in phantom context.
    // Return a promise.
    // `options` is an hash that can have 3 properties:
    // - `listenToErrors` : whether we want to catch errors ; default: true
    // - `fn` : the function to execute in phantom context
    // - `args` : arguments to provide to function `fn` ; default: []
    function evaluateInPhantom(options) {

        _.defaults(options, {
            listenToErrors:true, fn:function() {}, args:[], timeout:task.timeout,
            timeoutMessage:'Timeout evaluating code in Phantom'
        });

        // Clone options.args
        const args = options.args.slice();

        // Insert fn at the beginning of args as first argument
        args.splice(0, 0, options.fn);

        const def = Q.defer();
        listenToOnErrorEvent();
        page.evaluate.apply(page, args).then(def.resolve).catch(def.reject);

        return def.promise
            .timeout(options.timeout, options.timeoutMessage)
            .catch(killBrowserInstanceIfProcessIsLikelyFrozen)
            .finally(stopOnErrorEventListening);

        /////////

        function listenToOnErrorEvent() {
            options.listenToErrors && page.on('onError', function(err) {
                if(err instanceof Array) err = err[0];
                if(!(err instanceof Error)) err = new Error(err);
                def.reject(new VError(err));
            });
        }

        // Kill browser instance if evaluation ended with a timeout cause this generally means the process is at 100% for ever.
        // Some polyfills in axe-core on Webkit browsers are known to cause this issue.
        function killBrowserInstanceIfProcessIsLikelyFrozen(err) {
            if(err.message && err.message.indexOf('Timeout') >= 0){
                // There is a strong possibility that the phantom process is frozen when entering this case.
                // Sometimes it stays at 100% of CPU which will impact the whole server.
                // To avoid further problems, let's kill it.
                job.logger.warn('Detected what is probably an abnormal situation. As a prevention measure, the phantom process will be killed now. ' +
                    'You may try with a bigger timeout to avoid this situation.');
                job.logger.error('The error causing this warning is:', err);
                browserInstance.kill();
                // THe pool will recycle this instance when killSwitch is true.
                browserInstance.killSwitch = killSwitch = true;
            }
            throw err;
        }

        function stopOnErrorEventListening() {
            options.listenToErrors && !killSwitch && page.off('onError');
        }
    }

    // Resolve a promise when `test` function return true.
    // The promise might be rejected if there was no resolve before the timeout expire.
    function waitFor(options) {
        _.defaults(options, { timeout:task.timeout, timeoutMessage:'Timeout waiting for a condition in Phantom' });
        const def = Q.defer();
        checkCondition();
        return def.promise.timeout(options.timeout, options.timeoutMessage);

        /////////

        function checkCondition() {
            evaluateInPhantom(options)
                .then(function(condition) {
                    if(condition)
                        def.resolve(condition);
                    else
                        _.throttle(checkCondition, 250);
                })
                .catch(def.reject);
        }
    }

    // Count how many HTML elements there is in the page
    function countElements() {
        return document.getElementsByTagName('*').length;
    }

    // Search for urls inside the page.
    function crawl() {
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

    function executeAxeTests() {
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
                window.axeErr     = err;
                window.axeResults = axeResults;
            });
        } catch(ex){
            window.axeErr = ex;
            console.log('Error:', ex);
        }
    }

    // Inject accessibility js libraries
    function injectJsScripts() {
        return page.injectJs(settings.axeScript)
            .then(function() {
                return evaluateInPhantom({ fn:checkAxe });
            }).then(function(version) {
                job.logger.info('Axe version in window namespace:', version);
                if(!version) throw new VError('Axe not found in global namespace');
                // return version ? true : Q.reject('Axe not found in global namespace');
            });

        ////////

        // Test presence of Axe library
        function checkAxe() {
            return window.axe.version;
        }
    }

    // Save a screen capture of the page
    function recordScreenCapture() {
        const filename = path.join(job.resourcesDirectory, settings.screenshotFilename);
        return page.render(filename, { format:'png', quality:'50' }).then(function() {
            job.logger.info('Screenshot captured');
        }).catch(function(err) {
            job.logger.error('Failed to capture screenshot:', err);
            throw err;
        });
    }

    // Save HTML source on file system (useful for debugging).
    function recordPageSource(prefix) {
        if(!page) return Q();
        if(!prefix) prefix = '';
        const filename = path.join(job.resourcesDirectory, prefix + settings.sourceFilename);
        return page.property('content').then(saveSource);

        ////////////
        function saveSource(content) {
            return writeFile(filename, content).then(function() {
                job.logger.info('HTML source code saved');
            }).catch(function(err) {
                job.logger.error('Failed to save HTML source code:', err);
                throw err;
            });
        }
    }

}
