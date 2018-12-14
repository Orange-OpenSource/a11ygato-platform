/*
    @license
    @a11ygato/platform
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

const argv = require('minimist')(process.argv.slice(2));

const env = argv.env;

// Will be used for app name in order to differentiate several instances
const nameSuffix = env ? '-' + env : '';

// Define sane defaults for built-in environments to simplify day-to-day life.
let watch, wsInspect, dbInspect;
switch(env){
    case 'production':
        watch     = false;
        wsInspect = '0.0.0.0:9236';
        dbInspect = '0.0.0.0:9237';
        break;
    case 'integration':
        watch     = false;
        wsInspect = '0.0.0.0:9234';
        dbInspect = '0.0.0.0:9235';
        break;
    case 'pre-integration':
        watch     = false;
        wsInspect = '0.0.0.0:9232';
        dbInspect = '0.0.0.0:9233';
        break;
    // default
    default:
        watch     = true;
        wsInspect = '9230';
        dbInspect = '9231';
}

// Configuration options: http://pm2.keymetrics.io/docs/usage/application-declaration/

const commonConfiguration = {
    script:'index.js',
    watch:watch,
    'watch_options':{ 'followSymlinks':true },
    env:{
        'NODE_ENV':'default'
    },
    [`env_${env}`]:{
        'NODE_ENV':env
    },
    log_date_format:'YYYY-MM-DD HH:mm',
    combine_logs:true,
    wait_ready:true,
    listen_timeout:10000,
    max_restarts: 3,
    restart_delay: 3000,
    autorestart:true,
    kill_timeout:10000,
    post_update:['echo RESTARTING…']
};

// Declare two apps with default configuration.
const configuration = {
    apps:[
        // The first one is the web service
        {
            name:`webservice${nameSuffix}`,
            cwd:'modules/webservice',
            'ignore_watch':[
                'node_modules/@a11ygato/audit-engine/node_modules/puppeteer/',
                'node_modules/@a11ygato/audit-engine/.idea/',
                'node_modules/@a11ygato/audit-engine/.git/',
                'node_modules/puppeteer/',
                '.git/',
                '.idea/'
            ],
            node_args:`--inspect=${wsInspect} --max-old-space-size=6144`,
            error_file:`../../logs/webservice${nameSuffix}.log`,
            out_file:`../../logs/webservice${nameSuffix}.log`
        },
        // The second one is the dashboard
        {
            name:`dashboard${nameSuffix}`,
            cwd:'modules/dashboard',
            'ignore_watch':[
                '.git/',
                '.idea/'
            ],
            node_args:`--inspect=${dbInspect} --max-old-space-size=6144`,
            error_file:`../../logs/dashboard${nameSuffix}.log`,
            out_file:`../../logs/dashboard${nameSuffix}.log`
        }]
};

// Generate dynamically final configuration
for(const app of configuration.apps){

    // Merge app-specific configuration with the common one
    Object.assign(app, commonConfiguration);

    if(process.env.VERBOSE === 'true'){
        console.log(`${app.name} pm2 configuration:`, JSON.stringify(app, null, '    '));
    }
}

console.log('Once all servers have started, you may point a browser to https://127.0.0.1:8443 or https://pally:8443 if you have setted an alias in your host file\n');

module.exports = configuration;
