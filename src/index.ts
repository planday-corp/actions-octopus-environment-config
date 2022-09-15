const core = require('@actions/core');

const queryString = require('query-string');

const environment_name = core.getInput('environment_name');
const delete_environment = core.getInput('delete');
const environment_to_copy = core.getInput('environment_to_copy');
const octopus_server_url = core.getInput('octopus_server_url');
const octopus_server_token = core.getInput('octopus_server_token');
const meta = {
  'X-Octopus-ApiKey':  octopus_server_token,
  'accept': 'application/json',
  'Content-Type': 'application/json'
};
const headers = new Headers(meta);




(async function main () {

  try {


    if(!delete_environment) {

      const body = {Name: environment_name };

      const response = await fetch(`${octopus_server_url}/api/environments`, {
        method: 'post',
        body: JSON.stringify(body),
        headers: headers});

      if(response.status==400) {
        //environment already created, we dont do anything
        return
      }

      if(!response.ok){
        throw new Error(`Could not create environment: ${response.statusText}`); 
      }

      const environmentToCopyFrom = await (await fetch(`${octopus_server_url}/api/environments?name=${environment_to_copy}`, 
      { method: 'GET', headers: headers})).json();

      var urlOfMachinesToAdd = environmentToCopyFrom.Items[0].Links.Machines
      var machines = await (await fetch(`${octopus_server_url}${urlOfMachinesToAdd}`,{ method: 'GET', headers: headers})).json();
      
      var newEnvironment = await response.json()
      machines.Items.forEach((machine:any): void => {
        machine.EnvironmentIds.add(newEnvironment.Id);     
        //todo put the environment again

      });


    }
    else
    {

    }     

  } 
  catch (e: any) {
      core.setFailed(e.message);
    }
    // You can use await inside this function block
})();


