import * as core from "@actions/core";

export default function onlyModifiesDocs(diff: string): boolean {
  const diffLines = diff.split("\n");

  /* this plays by the following rules to get all the changed files from the diff string:
  - /dev/null excluded
  - check for lines starting with --- or +++
  - split at the first space and take the part of the line post-split
  - remove the leading "a/" or "b/" chars
  - deduplicate with the call to set
   */
  const changedFilePaths = [
    ...new Set(
      diffLines
        .filter(
          (line) =>
            line.trim() !== "" &&
            !line.includes("/dev/null") &&
            (line.startsWith("---") || line.startsWith("+++")) &&
            !line.startsWith("----") &&
            !line.startsWith("++++")
        )
        .map((line) => line.split(" ")[1].slice(2))
    ),
  ];

  core.info(`Detected ${changedFilePaths.length} files changed:`);
  core.info(JSON.stringify(changedFilePaths));

  return changedFilePaths.every(
    (path) =>
      path.includes("/docs/") ||
      path.includes("README.md") ||
      path.includes("README.rst") ||
      path.includes(".github/ISSUE_TEMPLATE") ||
      path.includes(".github/PULL_REQUEST_TEMPLATE") ||
      path.includes("wiki/")
  );
}
