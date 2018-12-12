/*
    @license
    @a11ygato/cli
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

const auditEngine = require('@a11ygato/audit-engine');

const jsonReporter  = require('../reporter/json');
const junitReporter = require('../reporter/junit');
const ReporterEnum  = require('../reporter/ReporterEnum');

////////////

class Runner {

    constructor(task, settings) {
        // Will serve to log total time taken by audit in report
        this.auditStartTime = null;

        // Audit duration in seconds
        this.auditDuration = null;

        this.task     = task;
        this.settings = settings;

        this.report = null;

        switch(this.settings.format){
            case ReporterEnum.JUNIT:
                this.reporter = junitReporter;
                break;
            case ReporterEnum.JSON:
                this.reporter = jsonReporter;
                break;
        }
    }

    async run() {
        this.auditStartTime = Date.now();

        // Define and validate engine settings
        // Create pools of browser instances
        await auditEngine.init(this.settings);

        // Run audit
        const audit = this.task.scenario ? auditEngine.createScenario(this.task) : auditEngine.createAudit(this.task);
        this.report = await audit.run();

        this.auditDuration = Math.round((Date.now() - this.auditStartTime) / 1000);

        // Generate a JUnit or JSON report saved on file system
        this.reporter && await this.reporter.save(this.report, this.settings, this.auditDuration);

        return this.report;
    }

    async shutdown() {
        await auditEngine.shutdown();
    }
}

module.exports = Runner;
