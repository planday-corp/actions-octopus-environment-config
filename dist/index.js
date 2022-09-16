"use strict";
const core = require('@actions/core');
const queryString = require('query-string');
const environment_name = core.getInput('environment_name');
const delete_environment = core.getInput('delete');
const environment_to_copy = core.getInput('environment_to_copy');
const octopus_server_url = core.getInput('octopus_server_url');
const octopus_api_key = core.getInput('octopus_api_key');
const headers = {
    'X-Octopus-ApiKey': octopus_api_key,
    'accept': 'application/json',
    'Content-Type': 'application/json'
};
(async function main() {
    try {
        if (!delete_environment) {
            core.info("Creating environment");
            const body = { Name: environment_name };
            core.info(`Creating ${environment_name} environment}`);
            const newEnvResponse = await fetch(`${octopus_server_url}/api/environments`, {
                method: 'post',
                body: JSON.stringify(body),
                headers: headers
            });
            if (newEnvResponse.status == 400) {
                //environment already created, we dont do anything
                core.info(`Environment ${environment_name} already exists`);
                return;
            }
            if (!newEnvResponse.ok) {
                core.error(` Could not create environment ${environment_name}`);
                throw new Error(`Could not create environment: ${newEnvResponse.statusText}`);
            }
            core.info(`Fetching environment to copy from: ${environment_to_copy}`);
            const environmentToCopyFrom = await (await fetch(`${octopus_server_url}/api/environments?name=${environment_to_copy}`, { method: 'GET', headers: headers })).json();
            var environmentToCopyFromId = environmentToCopyFrom.Items[0].Id;
            core.debug(`Environment id to copy from: ${environmentToCopyFromId}`);
            core.info(`Fetching machines associated with environment ${environment_to_copy} (id: ${environmentToCopyFromId})`);
            var environmentToCopyFromMachines = await (await fetch(`${octopus_server_url}/api/environments/${environmentToCopyFromId}/machines`, { method: 'GET', headers: headers })).json();
            var newEnvironment = await newEnvResponse.json();
            // environmentToCopyFromMachines.Items.forEach((machine:any): void => {
            //   machine.EnvironmentIds.add(newEnvironment.Id);
            //   //todo put the environment again
            // });
            let machines = environmentToCopyFromMachines.Items;
            core.debug(`Machines list: ${machines}`);
            // For each machine, update it with the newly created environment
            for (var machine of machines) {
                machine.EnvironmentIds.add(newEnvironment.Id);
                core.info(`Updating machine ${machine.Id} by associating environment ${newEnvironment.Id}`);
                var updateMachineEnvironments = await (await fetch(`${octopus_server_url}/api/machines/${machine.Id}`, {
                    method: 'PUT',
                    headers: headers,
                    body: JSON.stringify(machine)
                })).json();
                if (!updateMachineEnvironments.ok) {
                    core.error(`Could not update machine ${machine.Name} (${machine.Id}) environments with ${newEnvironment.Id}`);
                    throw new Error(`Could not update machine ${machine.Name} (${machine.Id}) environments with ${newEnvironment.Id}`);
                }
            }
        }
        else {
            core.info("Deleting environment");
        }
    }
    catch (e) {
        core.setFailed(e.message);
    }
    // You can use await inside this function block
})();
