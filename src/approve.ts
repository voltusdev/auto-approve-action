import * as core from "@actions/core";
import * as github from "@actions/github";
import { RequestError } from "@octokit/request-error";
import { Context } from "@actions/github/lib/context";
import onlyModifiesDocs from "./docs-detector";
import parse from "./parse-diff";

export async function approve(
  token: string,
  context: Context,
  sleepBeforeApproveSeconds: number,
  prNumber?: number
) {
  if (!prNumber) {
    prNumber = context.payload.pull_request?.number;
  }

  if (!prNumber) {
    core.setFailed(
      "Event payload missing `pull_request` key, and no `pull-request-number` provided as input." +
        "Make sure you're triggering this action on the `pull_request` or `pull_request_target` events."
    );
    return;
  }

  const client = github.getOctokit(token);

  const { data }: { data: unknown } = await client.pulls.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: prNumber,
    mediaType: {
      format: "diff",
    },
  });
  const diff = data as string;
  const files = parse(diff);

  core.info(`Evaluating pull request #${prNumber} for auto-approval...`);
  try {
    const reviews = await client.pulls.listReviews({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: prNumber,
    });

    const priorAutoApprovedReviews = reviews.data.filter((review) => {
      return (
        review.user?.login === "github-actions[bot]" &&
        review.state === "APPROVED"
      );
    });

    if (priorAutoApprovedReviews.length > 0) {
      core.info("PR already auto-approved.");
    } else if (diff.length > 0 && onlyModifiesDocs(files)) {
      core.info(
        `PR only modifies docs - sleeping ${sleepBeforeApproveSeconds}s and then approving this PR.`
      );
      await new Promise((r) => setTimeout(r, sleepBeforeApproveSeconds * 1000));
      await client.pulls.createReview({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: prNumber,
        event: "APPROVE",
      });
      core.info(`Approved pull request #${prNumber}`);
      core.setOutput("approved", "true");
    } else {
      core.info(
        `PR modifies more than just docs. Please get a human to look at it and approve it.`
      );
      // dismiss old approvals
      await Promise.all(
        priorAutoApprovedReviews.map(async (review) => {
          if (prNumber) {
            await client.pulls.dismissReview({
              owner: context.repo.owner,
              repo: context.repo.repo,
              pull_number: prNumber,
              review_id: review.id,
              message: "More than docs changed. Dismissed prior PR approval.",
            });
          }
        })
      );
    }
  } catch (error) {
    if (error instanceof RequestError) {
      switch (error.status) {
        case 401:
          core.setFailed(
            `${error.message}. Please check that the \`github-token\` input ` +
              "parameter is set correctly."
          );
          break;
        case 403:
          core.setFailed(
            `${error.message}. In some cases, the GitHub token used for actions triggered ` +
              "from `pull_request` events are read-only, which can cause this problem. " +
              "Switching to the `pull_request_target` event typically resolves this issue."
          );
          break;
        case 404:
          core.setFailed(
            `${error.message}. This typically means the token you're using doesn't have ` +
              "access to this repository. Use the built-in `${{ secrets.GITHUB_TOKEN }}` token " +
              "or review the scopes assigned to your personal access token."
          );
          break;
        case 422:
          core.setFailed(
            `${error.message}. This typically happens when you try to approve the pull ` +
              "request with the same user account that created the pull request. Try using " +
              "the built-in `${{ secrets.GITHUB_TOKEN }}` token, or if you're using a personal " +
              "access token, use one that belongs to a dedicated bot account."
          );
          break;
        default:
          core.setFailed(`Error (code ${error.status}): ${error.message}`);
      }
      return;
    }

    core.setFailed(error.message);
    return;
  }
}
