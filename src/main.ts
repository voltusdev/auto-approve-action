import * as core from "@actions/core";
import * as github from "@actions/github";
import { approve } from "./approve";

// cannot be over 6hrs or github actions will fail the job
// https://docs.github.com/en/actions/reference/usage-limits-billing-and-administration
// edit: we realized we pay per hour here so set sleep to 0
const SLEEP_BEFORE_AUTO_APPROVING_SECONDS = 0;

async function run() {
  core.info(
    `If you're wondering where this comes from, it's the github action defined here: https://github.com/voltusdev/auto-approve-action`
  );
  const token = core.getInput("github-token", { required: true });
  const prNumber: number = parseInt(core.getInput("pull-request-number"), 10);
  if (!Number.isNaN(prNumber)) {
    await approve(
      token,
      github.context,
      SLEEP_BEFORE_AUTO_APPROVING_SECONDS,
      prNumber
    );
  } else {
    await approve(token, github.context, SLEEP_BEFORE_AUTO_APPROVING_SECONDS);
  }
}

run();
