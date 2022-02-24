import * as core from "@actions/core";
import parse from "./parse-diff";

export default function onlyModifiesDocs(files: parse.File[]): boolean {
  const changedFiles = files.filter(
    (file) =>
      !file.new &&
      !file.deleted &&
      file.from === file.to &&
      (file.additions > 0 || file.deletions > 0)
  );
  const renamedFiles = files.filter(
    (file) =>
      !file.new &&
      !file.deleted &&
      file.from !== file.to &&
      file.additions === 0 &&
      file.deletions === 0
  );
  const deletedFiles = files.filter((file) => !!file.deleted);
  const addedFiles = files.filter((file) => !!file.new);

  core.info(`Detected ${changedFiles.length} files changed.`);
  core.info(`Detected ${renamedFiles.length} files renamed.`);
  core.info(`Detected ${deletedFiles.length} files deleted.`);
  core.info(`Detected ${addedFiles.length} files added.`);

  const allFilePaths = [
    // changed could be to or from
    ...changedFiles.map((f) => f.to),
    // renamed, consider both before and after
    ...renamedFiles.map((f) => f.to),
    ...renamedFiles.map((f) => f.from),
    // deleted only has from
    ...deletedFiles.map((f) => f.from),
    // added only has to
    ...addedFiles.map((f) => f.to),
  ];

  // don't think undefined should ever occur but will watch for it in practice...
  const stringFilePaths = allFilePaths.filter(
    (path) => path !== undefined
  ) as string[];

  core.info(`All ${stringFilePaths.length} considered filepaths:`);
  core.info(JSON.stringify(stringFilePaths));

  return stringFilePaths.every(
    (path) =>
      path.includes("/docs/") ||
      path.startsWith("docs/") ||
      path.includes("README.md") ||
      path.includes("README.rst") ||
      path.includes(".github/ISSUE_TEMPLATE") ||
      path.includes(".github/PULL_REQUEST_TEMPLATE") ||
      path.includes("wiki/")
  );
}
