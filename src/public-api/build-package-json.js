const fs = require('fs');
const path = require('path');
const cpx = require('cpx');

const packageJson = Object.assign({}, require('../../package.json'), {
  name: 'perf-api',
  description: 'A programmatic API for performance data.',
  version: '0.0.0',
  main: 'public-api/index.js',
});

deleteFromObject(packageJson, [
  'scripts',
  'devDependencies',
  'jest',
  'lint-staged',
  'babel',
]);

deleteFromObject(packageJson.dependencies, [
  'react',
  'babel-runtime',
  'react',
  'react-addons-perf',
  'react-contextmenu',
  'react-dom',
  'react-redux',
  'react-transition-group',
]);

function deleteFromObject(object, keys) {
  for (const key of keys) {
    delete object[key];
  }
}

const targetPackageJsonPath = path.join(
  __dirname,
  '../../dist-npm/package.json'
);

try {
  fs.writeFileSync(targetPackageJsonPath, JSON.stringify(packageJson, null, 2));
} catch (error) {
  console.log('Could not write out the package.json file');
  console.log(error);
}

console.log(`Created the package.json file at ${targetPackageJsonPath}`);

const targetReadmePath = path.join(__dirname, '../../dist-npm');

cpx.copy(path.join(__dirname, './README.md'), targetReadmePath, error => {
  if (error) {
    console.log('Could not copy the README.md');
    console.log(error);
  } else {
    console.log(`Created the README.md file at ${targetReadmePath}/README.md`);
  }
});
