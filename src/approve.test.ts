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

const docChanged = {
  deletions: 1,
  additions: 1,
  from: "/docs/test.md",
  to: "/docs/test.md",
  deleted: undefined,
  new: undefined,
};

const docRenamed = {
  deletions: 0,
  additions: 0,
  from: "/docs/test.md",
  to: "/docs/test2.md",
  deleted: undefined,
  new: undefined,
};

const docDeleted = {
  deletions: 0,
  additions: 0,
  from: "/docs/test.md",
  to: "/dev/null",
  deleted: true,
  new: undefined,
};

const docAdded = {
  deletions: 0,
  additions: 10,
  from: "/dev/null",
  to: "/docs/new.md",
  deleted: undefined,
  new: true,
};

const readmeMdChanged = {
  deletions: 1,
  additions: 0,
  from: "/docs/README.md",
  to: "/docs/README.md",
  deleted: undefined,
  new: undefined,
};

const readmeRstChanged = {
  deletions: 0,
  additions: 1,
  from: "/test/docs/README.rst",
  to: "/test/docs/README.rst",
  deleted: undefined,
  new: undefined,
};

const githubIssueChanged = {
  deletions: 1,
  additions: 4,
  from: ".github/ISSUE_TEMPLATE/blah",
  to: ".github/ISSUE_TEMPLATE/blah",
  deleted: undefined,
  new: undefined,
};

const githubPrChanged = {
  deletions: 9,
  additions: 4,
  from: ".github/PULL_REQUEST_TEMPLATE/blah",
  to: ".github/PULL_REQUEST_TEMPLATE/blah",
  deleted: undefined,
  new: undefined,
};

const wikiChanged = {
  deletions: 1,
  additions: 1,
  from: "wiki/blah",
  to: "wiki/blah",
  deleted: undefined,
  new: undefined,
};

const nonDocChanged = {
  deletions: 1,
  additions: 1,
  from: "blah",
  to: "blah",
  deleted: undefined,
  new: undefined,
};

const nonDocRenamed = {
  deletions: 0,
  additions: 0,
  from: "blah",
  to: "blahblah",
  deleted: undefined,
  new: undefined,
};

const nonDocDeleted = {
  deletions: 0,
  additions: 0,
  from: "blah",
  to: "/dev/null",
  deleted: true,
  new: undefined,
};

const nonDocAdded = {
  deletions: 0,
  additions: 5,
  from: "/dev/null",
  to: "blah",
  deleted: undefined,
  new: true,
};

const docOnlyDiffs = [
  docChanged,
  docRenamed,
  docDeleted,
  docAdded,
  readmeMdChanged,
  readmeRstChanged,
  githubIssueChanged,
  githubPrChanged,
  wikiChanged,
];

test("only approves when a diff changes /docs directory files and/or READMEs", async () => {
  nock("https://api.github.com")
    .get("/repos/hmarr/test/pulls/101")
    .reply(200, docOnlyDiffs);

  await approve("gh-tok", ghContext(), 0);

  expect(core.info).not.toHaveBeenCalledWith(
    expect.stringContaining("Approved pull request #101")
  );
});

test("does not approve when PR has no content", async () => {
  nock("https://api.github.com")
    .get("/repos/hmarr/test/pulls/101")
    .reply(200, []);

  await approve("gh-tok", ghContext(), 0);

  expect(core.info).not.toHaveBeenCalledWith(
    expect.stringContaining("Approved pull request #101")
  );
});

test("does not approve when PR includes non-doc changed", async () => {
  nock("https://api.github.com")
    .get("/repos/hmarr/test/pulls/101")
    .reply(200, [...docOnlyDiffs, nonDocChanged]);

  await approve("gh-tok", ghContext(), 0);

  expect(core.info).not.toHaveBeenCalledWith(
    expect.stringContaining("Approved pull request #101")
  );
});

test("does not approve when PR includes non-doc renamed", async () => {
  nock("https://api.github.com")
    .get("/repos/hmarr/test/pulls/101")
    .reply(200, [...docOnlyDiffs, nonDocRenamed]);

  await approve("gh-tok", ghContext(), 0);

  expect(core.info).not.toHaveBeenCalledWith(
    expect.stringContaining("Approved pull request #101")
  );
});

test("does not approve when PR includes non-doc deleted", async () => {
  nock("https://api.github.com")
    .get("/repos/hmarr/test/pulls/101")
    .reply(200, [...docOnlyDiffs, nonDocDeleted]);

  await approve("gh-tok", ghContext(), 0);

  expect(core.info).not.toHaveBeenCalledWith(
    expect.stringContaining("Approved pull request #101")
  );
});

test("does not approve when PR includes non-doc added", async () => {
  nock("https://api.github.com")
    .get("/repos/hmarr/test/pulls/101")
    .reply(200, [...docOnlyDiffs, nonDocAdded]);

  await approve("gh-tok", ghContext(), 0);

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
    .reply(200, docOnlyDiffs);

  await approve("gh-tok", ghContext(), 0);

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
    .reply(200, docOnlyDiffs);

  await approve("gh-tok", new Context(), 0, 101);

  expect(core.info).toHaveBeenCalledWith(
    expect.stringContaining("Approved pull request #101")
  );
});

test("without a pull request", async () => {
  await approve("gh-tok", new Context(), 0);

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
    .reply(200, docOnlyDiffs);

  await approve("gh-tok", ghContext(), 0);

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
    .reply(200, docOnlyDiffs);

  await approve("gh-tok", ghContext(), 0);

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
    .reply(200, docOnlyDiffs);

  await approve("gh-tok", ghContext(), 0);

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
    .reply(200, docOnlyDiffs);

  await approve("gh-tok", ghContext(), 0);

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
