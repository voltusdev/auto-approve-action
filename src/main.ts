import * as core from "@actions/core";
import * as github from "@actions/github";
import { approve } from "./approve";

async function run() {
  core.info(
    `If you're wondering where this comes from, it's the github action defined here: https://github.com/voltusdev/auto-approve-action`
  );
  const token = core.getInput("github-token", { required: true });
  const prNumber: number = parseInt(core.getInput("pull-request-number"), 10);
  if (!Number.isNaN(prNumber)) {
    await approve(token, github.context, prNumber);
  } else {
    await approve(token, github.context);
  }
}

run();
