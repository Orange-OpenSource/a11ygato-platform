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

const _               = require('lodash');
const Q               = require('q');
const ProxyAgent      = require('proxy-agent');
const HttpsProxyAgent = require('https-proxy-agent');
const https           = require('https');
const { URL }         = require('url');
const fetch           = require('fetch-cookie/node-fetch')(require('node-fetch'));
const async           = require('async');


class UrlJudge {

    constructor(links = [], job, task, audit) {

        this.links = links;
        this.job   = job;
        this.task  = task;
        this.audit = audit;

        if(!job || !task || !audit) throw new Error('Missing argument(s)');

        // Base url to check for matching
        this.rootURL = new URL(this.task.url);

        if(this.task.urlFilter){
            try{
                this.regex = new RegExp(this.task.urlFilter);
                this.job.logger.info(`Using regex ${this.regex} to filter urls`);
            }
            catch(err){
                this.job.logger.warn(`Ignoring regex for task ${this.task.id}: ${err.message || err}`);
            }
        }

        // Mime-Type used to select valid urls.
        this.mimeType = 'text/html';

        // HTTP(S) agents that accepts auto-signed certificates and use a proxy.
        let options = {};
        if(this.audit.settings.proxy){
            options         = require('url').parse('http://' + this.audit.settings.proxy);
            this.httpAgent  = new ProxyAgent(options);
            this.httpsAgent = new HttpsProxyAgent(Object.assign(options, { rejectUnauthorized:false }));
        }
        else{
            this.httpsAgent = new https.Agent({ rejectUnauthorized:false });
        }

    }

    // Iterate over all links and keep only the one which have a 'text/html' content-type.
    // To check the content-type, a request is made. Redirect are handled.
    filterByMimeType() {

        return new Promise((resolve, reject) => {

            let links = this.links;

            this.job.logger.info(`Filtering ${links.length} links`);

            // Filter by removing duplicates and invalid urls.
            links = _(links)
                .uniq()
                .map((link) => this.checkValidity(link).url)
                .compact()
                // Since we transformed relative URL to absolute, we may have new duplicates.
                .uniq()
                .value();

            this.job.logger.info(`Found ${links.length} new unique links in page`);
            this.job.logger.info(`Current depth is ${this.job.depth + 1}`);

            this.numberOfUrlsWeCanAdd = Math.min(this.audit.availableSlots, links.length);
            if(this.numberOfUrlsWeCanAdd === 0) resolve([]);

            const validRedirectedUrls = [];

            // Maximum 5 concurrent requests at the same time.
            async.filterLimit(links, Math.min(5, this.numberOfUrlsWeCanAdd), (link, callback) => this._goFetch(link, validRedirectedUrls, callback), (err, result) => {
                err ? reject(err) : resolve(result.concat(validRedirectedUrls));
            });
        });

    }

    // We only keep resources with HTML content
    _goFetch(link, validRedirectedUrls, callback, followingRedirect) {

        const readContentType = (response) => {
            if(this.numberOfUrlsWeCanAdd < 1) return callback(null, false);
            switch(response.status){
                case 301:
                case 302:
                case 303:
                case 307:
                case 308:{
                    const redirect = response.headers.get('location');
                    this.job.logger.debug(`➡ ${link} redirect to ${redirect}`);
                    const check = this.checkValidity(redirect);
                    if(check.rejected){
                        this.job.logger.debug(`⤬ ${redirect} ignored: ${check.rejected}`);
                        return callback(null, false);
                    }
                    // Prevent having an infinite loop if 'Location' header is identical.
                    if(check.url !== link) return this._goFetch(check.url, validRedirectedUrls, callback, true);
                }
            }
            const contentType = response.headers.get('content-type');
            let selected      = contentType && contentType.indexOf(this.mimeType) >= 0 || false;
            if(!selected){
                this.audit.urlsToForget[link] = true;
                this.job.logger.debug(`⤬ ${link} ignored: wrong content-type ${contentType}`);
            }
            else{
                this.numberOfUrlsWeCanAdd--;
                this.job.logger.debug(`✔︎ ${link} accepted`);
                if(followingRedirect){
                    selected = false;
                    validRedirectedUrls.push(link);
                }
            }
            callback(null, selected);
        };

        const abort = (err) => {
            this.job.logger.warn(`⤬ URL check failed for ${link} with error: ${err && err.message || err}`);
            // I'm not providing err cause I don't want to stop the whole process, this url will just be ignored
            callback(null, false);
        };

        try{
            // All available spots have been filled
            if(this.numberOfUrlsWeCanAdd < 1 || !link) return callback(null, false);
            const options = { redirect:'manual', timeout:30000 };
            options.agent = link.startsWith('https') ? this.httpsAgent : this.httpAgent;
            // this.job.logger.debug(`Checking content type of ${link}…`);
            // High level timeout which role is to make sur we will not consume too much time for one URL.
            // It would have been nice to have a second level timeout once the connection is established that close the underlying tcp socket.
            // Or at least, being able to cancel the fetch. There is a WIP for that which works with an AbortSignal but nothing stable.
            // TODO: cancel the fetch on timeout once the spec is finalized (abort signal).
            Q(fetch(link, options)).timeout(10000, 'URL aborted cause fetching was too long').then(readContentType).catch(abort);
        }
        catch(err){
            abort(err);
        }

    }

    // Check if the provided link is valid regarding the root url from which we started.
    // Protocol, hostname and port must mach.
    // Return the URL eventually slightly modified or undefined if we should not keep it.
    // If the URL has already been audited, or not selected, it is ignored.
    checkValidity(link) {

        if(link) link = link.trim();

        // Remove empty links
        if(_.isEmpty(link)) return { rejected:'empty link' };

        // Remove javascript: urls
        if(link.indexOf('javascript:') >= 0) return { rejected:'javascript: link' };

        // Transform link to an absolute URL in case it is relative
        const url = new URL(link, this.task.url);

        if(!this.regex){
            // Remove urls from another domain
            if(this.rootURL.host !== url.host) return { rejected:`host don't match ; ${this.rootURL.host} <> ${url.host}` };

            // I consider also the protocol in the comparison cause http://domain.com:80 is distinct from https://domain.com:80.
            if(this.rootURL.protocol !== url.protocol) return { rejected:`protocol don't match ; ${this.rootURL.protocol} <> ${url.protocol}` };
        }
        else{
            if(!this.regex.test(url.href)) return { rejected:`ignored by custom url filter ; regex: ${this.task.urlFilter}` };
        }

        // Remove anchors and links ending with #. Preserve hashbangs.
        if((url.hash && !url.hash.startsWith('#!')) || !url.hash) url.hash = '';

        // Morph to a simple string.
        // const finalUrl = url.toString().replace(/\/#$/g, '').replace(/\/$/g, '');
        const finalUrl = url.toString();

        // Remove urls already audited
        if(this.audit.auditedUrls[finalUrl] != null) return { rejected:'url already audited' };

        // Remove urls we have already analysed and eliminated (based on the content-type)
        if(this.audit.urlsToForget[finalUrl] != null) return { rejected:'url already ignored' };

        return { url:finalUrl };
    }
}

module.exports = UrlJudge;
