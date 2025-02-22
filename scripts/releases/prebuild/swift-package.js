/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 * @oncall react_native
 */

const {RESOURCES_FOLDER, TARGET_FOLDER} = require('./constants');
const fs = require('fs');
const path = require('path');

/*::
  import type {Dependency} from './types';
  import {skip} from "rxjs/operators";
  */

const log = (message /*: string */, ...optionalParams /*: Array<mixed> */) =>
  console.log('   → ' + message, ...optionalParams);

/**
 * Creates the Package.swift file for a Swift package based on the dependencies
 * @param {*} dependency
 * @param {*} rootFolder
 */
async function createSwiftPackageFile(
  scheme /*: string */,
  dependencies /*  :$ReadOnlyArray<Dependency> */,
  rootFolder /*: string */,
) {
  log(
    'Creating Package.swift file for',
    dependencies.map(d => d.name).join(', '),
  );

  const packageSwiftPath = path.join(rootFolder, 'Package.swift');
  const packageSwiftContents = `// swift-tools-version: 6.0
  /*
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   */

  import PackageDescription

  let package = Package(
      name: "${scheme}",
      products: [
          // Products define the executables and libraries a package produces, making them visible to other packages.
          .library(
              name: "${scheme}",
              type: .dynamic,
              targets: [${dependencies.map(d => `"${d.name}"`).join(', ')}]
          ),
      ],
      targets: [
${dependencies.map(d => createSwiftTarget(d)).join('')}
      ]
    )`;

  // Write to file
  fs.writeFileSync(packageSwiftPath, packageSwiftContents);
  log('Package.swift file created at', packageSwiftPath);
}

function createSwiftTarget(dependency /*  :Dependency */) {
  // Setup unsafe flags
  let unsafeCAndCxxSettings = '';
  if (dependency.settings.compilerFlags != null) {
    unsafeCAndCxxSettings = `.unsafeFlags([${dependency.settings.compilerFlags.map(flag => `"${flag}"`).join(', ')}]),`;
  }

  // Setup defines
  let defines = '';
  if (dependency.settings.defines != null) {
    defines = dependency.settings.defines
      .map(
        define =>
          `.define("${define.name}" ${define.value ? ', to: "' + define.value + '"' : ''}),\n                `,
      )
      .join('');
  }

  // Setup header search paths
  let headerSearchPaths = '';
  if (dependency.settings.headerSearchPaths != null) {
    headerSearchPaths = dependency.settings.headerSearchPaths
      .map(l => `.headerSearchPath("${l}"),\n                `)
      .join('');
  }

  // Setup linked libraries
  let linkedLibraries = '';
  if (dependency.settings.linkedLibraries != null) {
    linkedLibraries = dependency.settings.linkedLibraries
      .map(l => `.linkedLibrary("${l}"),\n                `)
      .join('');
  }

  return `          .target(
              name: "${dependency.name}",
              dependencies: [],
              path: "${dependency.name}/${TARGET_FOLDER}",
              ${dependency.files.resources ? 'resources: [.process("' + RESOURCES_FOLDER + '")],' : ''}
              publicHeadersPath: "${dependency.settings.publicHeaderFiles}",
              cSettings: [
                ${headerSearchPaths}
                ${unsafeCAndCxxSettings}
                ${defines}
              ],
              cxxSettings: [
                ${headerSearchPaths}
                ${unsafeCAndCxxSettings}
                ${defines}
              ],
              linkerSettings: [
                ${linkedLibraries}
              ]
            ),
`;
}

module.exports = {
  createSwiftPackageFile,
};
