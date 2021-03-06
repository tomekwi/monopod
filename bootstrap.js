'use strict'; // eslint-disable-line strict
  // Otherwise we can’t use `let` in node v4.

const fs = require('fs');
const pathModule = require('path');
const chalk = require('chalk');
const b = chalk.bold;
const mkdirp = require('mkdirp');
const newError = require('./_/newError');
const packagePaths$ = require('./_/packagePaths');

/*                                                            (see git.io/rtype)
  ({
    path = process.cwd(): String,
      // Path to your project directory

    scope = require('path').basename(path): String,
      // The npm scope of all packages in your repo
  }) =>
    Void
 */
module.exports = (params) => {
  const path = params.path || process.cwd();
  const scope = params.scope || pathModule.basename(path);

  const packagePaths = packagePaths$(path);

  // Check for `packages/*`
  packagePaths.forEach((packagePath) => {
    const nodeModulesPath = `${packagePath}/node_modules`;

    let nodeModulesStats;
    try {
      nodeModulesStats = fs.lstatSync(nodeModulesPath);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }

    if (nodeModulesStats && !nodeModulesStats.isSymbolicLink()) throw newError(
      'Making sure we don’t overwrite any important stuff, ' +
      `we’ve stumbled upon the ${
        nodeModulesStats.isDirectory() ? 'directory' : 'file'
      } ${b(nodeModulesPath)}. We don’t want to break things, so make sure ` +
      `there’s nothing called ${b('node_modules')} ` +
      `in any of your ${b('packages/*/')}. We’re fine if it’s a symlink, ` +
      'by the way.'
    );
  });

  // Wire up packages with one another
  const nodeModulesPath = `${path}/node_modules`;
  const symlinkPath = `${nodeModulesPath}/@${scope}`;
  const symlinkError = (message) => newError(
    `We can’t create a symlink at ${b(symlinkPath)}. ${message}`
  );
  try {
    const nodeModules = fs.lstatSync(nodeModulesPath);
    if (!nodeModules.isDirectory()) throw symlinkError(
      `Make sure ${b(nodeModulesPath)} is a directory. We’ll create it ` +
      'if necessary.'
    );
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    mkdirp.sync(nodeModulesPath);
  }
  fs.symlinkSync(`${path}/packages`, symlinkPath);

  // Hook up `node_modules` on each package
  packagePaths.forEach((packagePath) => {
    fs.symlinkSync('../../node_modules', `${packagePath}/node_modules`, 'dir');
  });
};
