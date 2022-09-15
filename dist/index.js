"use strict";
const core = require('@actions/core');
const queryString = require('query-string');
const environment_name = core.getInput('environment_name');
const delete_environment = core.getInput('delete');
const environment_to_copy = core.getInput('environment_to_copy');
const octopus_server_url = core.getInput('octopus_server_url');
const octopus_server_token = core.getInput('octopus_server_token');
const meta = {
    'X-Octopus-ApiKey': octopus_server_token,
    'accept': 'application/json',
    'Content-Type': 'application/json'
};
const headers = new Headers(meta);
(async function main() {
    try {
        if (!delete_environment) {
            const body = { Name: environment_name };
            const newEnvResponse = await fetch(`${octopus_server_url}/api/environments`, {
                method: 'post',
                body: JSON.stringify(body),
                headers: headers
            });
            if (newEnvResponse.status == 400) {
                //environment already created, we dont do anything
                return;
            }
            if (!newEnvResponse.ok) {
                throw new Error(`Could not create environment: ${newEnvResponse.statusText}`);
            }
            const environmentToCopyFrom = await (await fetch(`${octopus_server_url}/api/environments?name=${environment_to_copy}`, { method: 'GET', headers: headers })).json();
            var environmentToCopyFromId = environmentToCopyFrom.Items[0].Id;
            var environmentToCopyFromMachines = await (await fetch(`${octopus_server_url}/api/environments/${environmentToCopyFromId}/machines`, { method: 'GET', headers: headers })).json();
            var newEnvironment = await newEnvResponse.json();
            // environmentToCopyFromMachines.Items.forEach((machine:any): void => {
            //   machine.EnvironmentIds.add(newEnvironment.Id);
            //   //todo put the environment again
            // });
            // For each machine, update it with the newly created environment
            let machines = environmentToCopyFromMachines.Items;
            for (var machine of machines) {
                machine.EnvironmentIds.add(newEnvironment.Id);
                var updateMachineEnvironments = await (await fetch(`${octopus_server_url}/api/machines/${machine.Id}`, {
                    method: 'PUT',
                    headers: headers,
                    body: JSON.stringify(machine)
                })).json();
                if (!updateMachineEnvironments.ok) {
                    throw new Error(`Could not update machine ${machine.Name} (${machine.Id}) environments with ${newEnvironment.Id}`);
                }
            }
        }
        else {
        }
    }
    catch (e) {
        core.setFailed(e.message);
    }
    // You can use await inside this function block
})();
