# OrgFlow: Post result as comment

<p><img src="logo.svg" alt="OrgFlow Logo" width="200"/></p>

OrgFlow is a cross-platform DevOps tool that opens the Salesforce platform up to modern software development, version control, deployment and automation techniques.

More information about OrgFlow:

- Website: https://www.orgflow.io
- Documentation: https://docs.orgflow.io
- Blog: https://medium.com/orgflow

This action takes the JSON result output from an OrgFlow command, transforms it into Markdown using a Liquid template, and posts the result as a comment on a GitHub issue or pull request.

Running this action at the start of your workflow job allows you to run any OrgFlow commands with minimal hassle in subsequent steps of your job, without having to provide any of the above configuration again.

See also:

- Our [`setup`](https://github.com/OrgFlow-Actions/setup) action which allows you to easily install and configure OrgFlow at the start of your job
- Our [`demo`](https://github.com/OrgFlow-Actions/demo) template repository that contains a set of basic sample workflows that show how to use OrgFlow in GitHub Actions

## Supported platforms

This action works on:

- GitHub-hosted runners and self-hosted runners
- Ubuntu, macOS and Windows
- With or without a container (also works with the `orgflow/cli` Docker image)

## Inputs

| Name            | Required? | Default                | Description                                                                                                      |
| --------------- | :-------: | ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `github-token`  |  **Yes**  |                        | GitHub access token used to post comment (usually `${{ secrets.GITHUB_TOKEN }}`).                                   |
| `issue-number`  |  **Yes**  |                        | ID of issue or pull request to post comment on.                                                                  |
| `result`        |  **Yes**  |                        | OrgFlow command result JSON output to post as comment.                                                           |
| `template-path` |  **Yes**  |                        | Path to Liquid template used to format the comment (either one of the included templates, or a custom template). |

## Examples

Assuming the containing workflow is triggered by a pull request being created or updated, run the `env:flowmerge` command to check the deployability of the pull request, and then use this action to post the result as a comment on the pull request itself:

```yaml
jobs:
  orgflow_job:
    runs-on: ubuntu-latest

    steps:
      # Download and install latest version
      - uses: orgflow-actions/setup@v1
        with:
          license-key: ${{ secrets.ORGFLOW_LICENSEKEY }}
          salesforce-username: ${{ secrets.SALESFORCE_USERNAME }}
          salesforce-password: ${{ secrets.SALESFORCE_PASSWORD }}
          stack-name: MyStack
        env:
          ORGFLOW_ACCEPTEULA: "true"

      # Run OrgFlow command to list environments in stack so that we can map branch names to environment names:
      - run: |
          json=$(orgflow env:list --output=json)
          echo "::set-output name=environments::$json"
        id: env:list

      # Find source environment:
      - run: |
          echo "${{ steps.env-list.outputs.environments }}" |
          jq '[.[] | select(.git.branch == "${{ github.head_ref }}") | .name] | select(. | length > 0)[0]' -r |
          ( read output; echo "::set-output name=environment-name::$output"; )
        id: find-source-environment

      # Find target environment:
      - run: |
          echo "${{ steps.env-list.outputs.environments }}" |
          jq '[.[] | select(.git.branch == "${{ github.base_ref }}") | .name] | select(. | length > 0)[0]' -r |
          ( read output; echo "::set-output name=environment-name::$output"; )
        id: find-target-environment

      # Run OrgFlow command to validate deployment of the would-be result of merging this PR:
      - run: |
          json=$(orgflow env:flowmerge --from="${{ steps.find-source-environment.outputs.environment-name }}" --into="${{ steps.find-target-environment.outputs.environment-name }}" --checkOnly --output=json)
          json=$(echo $json | jq '.result.environments.into.flowOut' -c)
          echo "::set-output name=result::$json"
        id: env-flowmerge

      # Post result as a comment on this PR:
      - uses: orgflow-actions/result-to-comment@v1
        if: ${{ steps.env-flowmerge.outputs.result != '' }}
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          issue-number: ${{ github.event.pull_request.number }}
          result: ${{ steps.env-flowmerge.outputs.result }}
          template-path: env-flow-out.liquid
```

Please refer to the [command reference page](https://docs.orgflow.io/reference/commands/help.html) in our docs for a complete list of available OrgFlow commands that you can use in your workflow.

## Templates

This action currently only contains one included template named `env-flow-out.liquid`, designed to handle the result of an outbound flow (full result of the `env:flowout` command or part of the result of the `env:flowmerge` command). For posting as a comment on a GitHub issue or pull request, few other command results make much sense. Nevertheless, more templates (supporting other command outputs) may be added to this action in the future.

This action also supports custom templates, which you can specify as a path relative to your job's workspace (which is usually the same as the root of your repository). You can use this support to customize the included `env-flow-out.liquid` template to suit your needs, or to provide templates for other command result types.

Finally, we encourage you to contribute templates for other OrgFlow command results by submitting pull requests against this repository.

## Versioning

All of our `orgflow-actions/*` actions are semantically versioned. Breaking changes will cause a major version bump.

All releases are tagged with a full version number, e.g. `v1.0.0`. You can use these tags to pin your workflow to a specific release, e.g. `@v1.0.0`.

We also maintain branches for each major version of our actions, and you can reference branch names to ensure that you are using the most up to date version of this action for a specific major version. For example `@v1` would cause your workflow to automatically use the most up to date `v1.x.x` version of this action.

## Troubleshooting

### Workflow logs

To enable more detailed log output from this action, enable **step debug logs** for your workflow by adding the secret `ACTIONS_STEP_DEBUG` with the value `true`. You can also enable **runner debug logs** by adding the secret `ACTIONS_RUNNER_DEBUG` with the value `true`.

More information here:
https://github.com/actions/toolkit/blob/main/docs/action-debugging.md
