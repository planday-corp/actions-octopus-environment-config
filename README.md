# Octopus Environment Config Action

This action will create or a new Octopus Environment or delete an existing one.
In the case of a creation, it will also add it to chosen the Deployment Target(s).

## Inputs:

`environment_name`: Name of the environment to create or delete.

`delete_environment`: (boolean) Whether or not to delete the environment. Default is `false`.

`environment_to_copy`: Name of the environment to copy from. Example: `stable`.

`octopus_server_url`: URL of the Octopus server in the form `http(s)://xxxxx`.

`octopus_api_key`: API key for the Octopus server.

## Outputs:

`environment_id`: ID of the newly created environment.

## Usage:

```yaml
# Creation of a new environment copied from "stable"
- uses: planday-corp/actions-octopus-environment-config@main
  with: 
    environment_name: "my_new_environment"
    delete: false
    environment_to_copy: "stable"
    octopus_server_url: "${{secrets.octopus_server_url}}"
    octopus_api_key: ${{secrets.octopus_api_key}}

# Deletion of an environment
- uses: planday-corp/actions-octopus-environment-config@main
  with: 
    environment_name: "my_new_environment"
    delete: true
    octopus_server_url: "${{secrets.octopus_server_url}}"
    octopus_api_key: ${{secrets.octopus_api_key}}
```

## Development

This actions is written with TypeScript for Node.js `v16.10` in `src/index.ts`.

To build this action, run

```shell
npm install
npm run build
```


### With `docker`

```shell
docker run --rm -it -v $(pwd):/tmp/workspace -w /tmp/workspace node:16.10 bash -c 'npm install && npm run build'
```