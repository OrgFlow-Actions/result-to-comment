/*
** This module is the action's main entry point.
*/

import * as core from "@actions/core";
import * as github from "@actions/github";
import * as path from "path";
import { Liquid } from "liquidjs";

export async function run()
{
	try
	{
		// Gather and validate input:

		const token = core.getInput("github-token");
		const issueNumber = Number.parseInt(core.getInput("issue-number"));
		const result = core.getInput("result");
		const templatePath = core.getInput("template-path");

		const octokit = github.getOctokit(token);

		const liquid = new Liquid({
			root: [
				path.join(__dirname, "../templates"), // Firstly look among built-in templates
				process.env.GITHUB_WORKSPACE // Secondly look relative to workspace/repo
			]
		});

		core.debug(`Rendering template '${templatePath}'...`);

		const markdown = await liquid.renderFile(templatePath);

		core.debug("Template rendered successfully.");

		const repositoryParts = process.env.GITHUB_REPOSITORY.split("/");
		const repositoryOwner = repositoryParts[0];
		const repositoryName = repositoryParts[1];

		core.debug(`Posting comment on issue ${issueNumber} in repository '${repositoryOwner}/${repositoryName}'...`);

		await octokit.rest.issues.createComment({
            owner: repositoryOwner,
            repo: repositoryName,
            issue_number: issueNumber,
            body: markdown,
		});

		core.debug("Comment posted successfully.");
	}
	catch (error)
	{
		core.setFailed(error.message);
	}
}

run();