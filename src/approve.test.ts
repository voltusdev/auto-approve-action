import * as core from "@actions/core";
import { Context } from "@actions/github/lib/context";
import nock from "nock";
import { approve } from "./approve";

beforeEach(() => {
  jest.restoreAllMocks();
  jest.spyOn(core, "setFailed").mockImplementation(jest.fn());
  jest.spyOn(core, "info").mockImplementation(jest.fn());

  process.env["GITHUB_REPOSITORY"] = "hmarr/test";
});

const docsOnlyDiff =
  "diff --git a/test/docs/leo.md b/test/docs/leo.md\nnew file mode 100644\nindex 0000000000..89b0cb2bfc\n--- /dev/null\n+++ b/test/docs/leo.md\n@@ -0,0 +1 @@\n+leo is cool\n" +
  "a/README.md b/README.md\nnew file mode 100644\nindex 0000000000..89b0cb2bfc\n--- /dev/null\n+++ b/README.md\n@@ -0,0 +1 @@\n+leo is cool\n" +
  "a/test/README.rst b/test/README.rst\nnew file mode 100644\nindex 0000000000..89b0cb2bfc\n--- /dev/null\n+++ b/test/README.rst\n@@ -0,0 +1 @@\n+leo is cool\n" +
  "a/.github/ISSUE_TEMPLATE/test_issue.md b/.github/ISSUE_TEMPLATE/test_issue.md\nnew file mode 100644\nindex 0000000000..89b0cb2bfc\n--- /dev/null\n+++ b/.github/ISSUE_TEMPLATE/test.md\n@@ -0,0 +1 @@\n+leo is cool\n" +
  "a/.github/PULL_REQUEST_TEMPLATE/test.md b/.github/PULL_REQUEST_TEMPLATE/test.md\nnew file mode 100644\nindex 0000000000..89b0cb2bfc\n--- /dev/null\n+++ b/.github/PULL_REQUEST_TEMPLATE/test.md\n@@ -0,0 +1 @@\n+leo is cool\n" +
  "a/wiki/test.md b/wiki/test.md file mode 100644\nindex 0000000000..89b0cb2bfc\n--- /dev/null\n+++ b/wiki/test.md\n@@ -0,0 +1 @@\n+leo is cool\n";

const nonDocsDiff =
  docsOnlyDiff +
  "a/code.py b/code.py\nnew file mode 100644\nindex 0000000000..89b0cb2bfc\n--- /dev/null\n+++ b/code.py\n@@ -0,0 +1 @@\n+leo is cool\n";

test("only approves when a diff changes /docs directory files and/or READMEs", async () => {
  nock("https://api.github.com")
    .get("/repos/hmarr/test/pulls/101")
    .reply(200, nonDocsDiff);

  await approve("gh-tok", ghContext());

  expect(core.info).not.toHaveBeenCalledWith(
    expect.stringContaining("Approved pull request #101")
  );
});

test("does not approve when PR is just renames/moves", async () => {
  const renameDiff =
    "diff --git a/buildtools/build_docs.sh b/buildtoolies/build_docs.sh\nsimilarity index 100%\nrename from buildtools/build_docs.sh\nrename to buildtoolies/build_docs.sh";
  nock("https://api.github.com")
    .get("/repos/hmarr/test/pulls/101")
    .reply(200, renameDiff);

  await approve("gh-tok", ghContext());

  expect(core.info).not.toHaveBeenCalledWith(
    expect.stringContaining("Approved pull request #101")
  );
});

test("when a review is successfully created", async () => {
  nock("https://api.github.com")
    .post("/repos/hmarr/test/pulls/101/reviews")
    .reply(200, { id: 1 });

  // mock the request for the diff information
  nock("https://api.github.com")
    .get("/repos/hmarr/test/pulls/101")
    .reply(200, docsOnlyDiff);

  await approve("gh-tok", ghContext());

  expect(core.info).toHaveBeenCalledWith(
    expect.stringContaining("Approved pull request #101")
  );
});

test("when a review is successfully created using pull-request-number", async () => {
  nock("https://api.github.com")
    .post("/repos/hmarr/test/pulls/101/reviews")
    .reply(200, { id: 1 });

  // mock the request for the diff information
  nock("https://api.github.com")
    .get("/repos/hmarr/test/pulls/101")
    .reply(200, docsOnlyDiff);

  await approve("gh-tok", new Context(), 101);

  expect(core.info).toHaveBeenCalledWith(
    expect.stringContaining("Approved pull request #101")
  );
});

test("without a pull request", async () => {
  await approve("gh-tok", new Context());

  expect(core.setFailed).toHaveBeenCalledWith(
    expect.stringContaining("Make sure you're triggering this")
  );
});

test("when the token is invalid", async () => {
  nock("https://api.github.com")
    .post("/repos/hmarr/test/pulls/101/reviews")
    .reply(401, { message: "Bad credentials" });

  // mock the request for the diff information
  nock("https://api.github.com")
    .get("/repos/hmarr/test/pulls/101")
    .reply(200, docsOnlyDiff);

  await approve("gh-tok", ghContext());

  expect(core.setFailed).toHaveBeenCalledWith(
    expect.stringContaining("`github-token` input parameter")
  );
});

test("when the token doesn't have write permissions", async () => {
  nock("https://api.github.com")
    .post("/repos/hmarr/test/pulls/101/reviews")
    .reply(403, { message: "Resource not accessible by integration" });

  // mock the request for the diff information
  nock("https://api.github.com")
    .get("/repos/hmarr/test/pulls/101")
    .reply(200, docsOnlyDiff);

  await approve("gh-tok", ghContext());

  expect(core.setFailed).toHaveBeenCalledWith(
    expect.stringContaining("pull_request_target")
  );
});

test("when a user tries to approve their own pull request", async () => {
  nock("https://api.github.com")
    .post("/repos/hmarr/test/pulls/101/reviews")
    .reply(422, { message: "Unprocessable Entity" });

  // mock the request for the diff information
  nock("https://api.github.com")
    .get("/repos/hmarr/test/pulls/101")
    .reply(200, docsOnlyDiff);

  await approve("gh-tok", ghContext());

  expect(core.setFailed).toHaveBeenCalledWith(
    expect.stringContaining("same user account")
  );
});

test("when the token doesn't have access to the repository", async () => {
  nock("https://api.github.com")
    .post("/repos/hmarr/test/pulls/101/reviews")
    .reply(404, { message: "Not Found" });

  // mock the request for the diff information
  nock("https://api.github.com")
    .get("/repos/hmarr/test/pulls/101")
    .reply(200, docsOnlyDiff);

  await approve("gh-tok", ghContext());

  expect(core.setFailed).toHaveBeenCalledWith(
    expect.stringContaining("doesn't have access")
  );
});

function ghContext(): Context {
  const ctx = new Context();
  ctx.payload = {
    pull_request: {
      number: 101,
    },
  };
  return ctx;
}
