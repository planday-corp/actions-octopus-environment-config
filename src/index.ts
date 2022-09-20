const core = require("@actions/core");

const queryString = require("query-string");
const nodeFetch = require("node-fetch") as typeof fetch;

// Read action inputs
const environment_name = core.getInput("environment_name", { required: true });
const delete_environment = core.getBooleanInput("delete_environment", {
  required: true,
});
const environment_to_copy = core.getInput("environment_to_copy", {
  required: true,
});
const octopus_server_url = core.getInput("octopus_server_url", {
  required: true,
});
const octopus_api_key = core.getInput("octopus_api_key", { required: true });

// HTTP request headers for the Octopus API
const headers = {
  "X-Octopus-ApiKey": octopus_api_key,
  accept: "application/json",
  "Content-Type": "application/json",
};

(async function main() {
  try {
    if (!delete_environment) {
      core.info("Action is set to create environment...");

      const body = { Name: environment_name };

      core.info(`Creating "${environment_name}" environment`);
      const newEnvResponse = await nodeFetch(
        `${octopus_server_url}/api/environments`,
        {
          method: "post",
          body: JSON.stringify(body),
          headers: headers,
        }
      );

      if (newEnvResponse.status == 400) {
        // Environment already created, we dont do anything
        core.warning(`Environment ${environment_name} already exists`);
        return;
      }

      if (!newEnvResponse.ok) {
        core.error(` Could not create environment ${environment_name}`);
        throw new Error(
          `Could not create environment: ${newEnvResponse.statusText}`
        );
      }
      core.debug(`Creating ${environment_name} environment: done`);

      core.info(`Fetching environment to copy from: ${environment_to_copy}`);
      const environmentToCopyFrom = await (
        await nodeFetch(
          `${octopus_server_url}/api/environments?name=${environment_to_copy}`,
          { method: "GET", headers: headers }
        )
      ).json();

      var environmentToCopyFromId = environmentToCopyFrom.Items[0].Id;
      core.debug(`Environment id to copy from: ${environmentToCopyFromId}`);

      core.info(
        `Fetching machines associated with environment ${environment_to_copy} (id: ${environmentToCopyFromId})`
      );
      var environmentToCopyFromMachines = await (
        await nodeFetch(
          `${octopus_server_url}/api/environments/${environmentToCopyFromId}/machines`,
          { method: "GET", headers: headers }
        )
      ).json();

      var newEnvironment = await newEnvResponse.json();
      let machines = environmentToCopyFromMachines.Items as any[];
      core.debug(`Machines list: ${machines}`);

      // For each machine, update it with the newly created environment
      for (var machine of machines) {
        machine.EnvironmentIds.push(newEnvironment.Id);

        core.info(
          `Updating machine ${machine.Name} (id: ${machine.Id}) by associating environment ${newEnvironment.Id}`
        );
        var updateMachineEnvironments = await nodeFetch(
          `${octopus_server_url}/api/machines/${machine.Id}`,
          {
            method: "PUT",
            headers: headers,
            body: JSON.stringify(machine),
          }
        );
        if (!updateMachineEnvironments.ok) {
          core.error(
            `Could not update machine ${machine.Name} (${machine.Id}) environments with ${newEnvironment.Id}`
          );
          throw new Error(
            `Could not update machine ${machine.Name} (${machine.Id}) environments with ${newEnvironment.Id}`
          );
        }
      }

      // Set action output(s)
      core.setOutput("environment_id", newEnvironment.Id);
    } else {
      core.info("Action is set to delete environment...");

      core.info(
        `Getting environment id for environment ${environment_name}...`
      );
      const environmentRequest = await nodeFetch(
        `${octopus_server_url}/api/environments?name=${environment_name}`,
        { method: "GET", headers: headers }
      );

      if (!environmentRequest.ok) {
        core.error(
          `Could not get environment ${environment_name}: ${environmentRequest.statusText}`
        );
        throw new Error(
          `Could not get environment ${environment_name}: ${environmentRequest.statusText}`
        );
      }

      var environmentResponse = await environmentRequest.json();
      var environmentId = environmentResponse.Items[0].Id;
      core.debug(`Environment id to delete: ${environmentId}`);

      core.info(
        `Fetching machines associated with environment ${environment_name} (id: ${environmentId})...`
      );
      var environmentMachines = await (
        await nodeFetch(
          `${octopus_server_url}/api/environments/${environmentId}/machines`,
          { method: "GET", headers: headers }
        )
      ).json();

      let machines = environmentMachines.Items as any[];

      // For each machine, update it with to remove the environment
      for (var machine of machines) {
        // index of the 'environment id' in the EnvironmentIds array we want to remove
        let index = machine.EnvironmentIds.indexOf(environmentId, 0);
        if (index > -1) {
          machine.EnvironmentIds.splice(index, 1);
        }
        core.debug(
          `Environment Ids associated with machine ${machine.Name}: [${machine.EnvironmentIds}]`
        );

        core.info(
          `Updating machine ${machine.Name} (id: ${machine.Id}) by removing environment ${environmentId}`
        );
        var updateMachineEnvironments = await nodeFetch(
          `${octopus_server_url}/api/machines/${machine.Id}`,
          {
            method: "PUT",
            headers: headers,
            body: JSON.stringify(machine),
          }
        );
        if (!updateMachineEnvironments.ok) {
          core.error(
            `Could not update machine ${machine.Name} (${machine.Id}) environments with ${environmentId}: ${updateMachineEnvironments.statusText}`
          );
          throw new Error(
            `Could not update machine ${machine.Name} (${machine.Id}) environments with ${environmentId}: ${updateMachineEnvironments.statusText}`
          );
        }
      }

      core.info(
        `Machines updated, removing environment ${environment_name} (id: ${environmentId})...`
      );
      const environmentDeleteRequest = await nodeFetch(
        `${octopus_server_url}/api/environments/${environmentId}`,
        { method: "DELETE", headers: headers }
      );

      if (!environmentDeleteRequest.ok) {
        core.error(
          `Could not delete environment ${environment_name}: ${environmentDeleteRequest.statusText}`
        );
        throw new Error(
          `Could not delete environment ${environment_name}: ${environmentDeleteRequest.statusText}`
        );
      }
    }
  } catch (e: any) {
    core.setFailed(e.message);
  }
  // You can use await inside this function block
})();
