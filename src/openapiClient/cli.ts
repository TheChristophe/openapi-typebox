#!/usr/bin/env node
import meow from 'meow';
import configuration from '../shared/configuration.js';
import openapiToClient from './openapiToClient.js';

const cli = meow(
  `
  Usage
    $ openapi-box <json or yaml file>

  Options
    --output, -o Output folder, default to "./client"
    --strict Strict Openapi 3.1 mode
    --compile Compile the generated client
    --package Generate a package.json
    --package-name Package name
    --package-registry Registry to publish to
    --package-author Package author
    --snapshot-version Append timestamp to package version

  Examples
    $ openapi-box ./openapi.json
`,
  {
    importMeta: import.meta,
    allowUnknownFlags: false,
    autoHelp: true,
    flags: {
      output: {
        type: 'string',
        shortFlag: 'o',
        default: './client',
      },

      strict: {
        type: 'boolean',
        default: false,
      },

      compile: {
        type: 'boolean',
        default: false,
      },

      package: {
        type: 'boolean',
        default: false,
      },
      packageName: {
        type: 'string',
        isRequired: (flags) => !!flags['package'],
      },
      packageRegistry: {
        type: 'string',
      },
      packageAuthor: {
        type: 'string',
      },
      snapshotVersion: {
        type: 'boolean',
        default: false,
      },
    },
  },
);

if (cli.input.length === 0) {
  cli.showHelp();
}

configuration.strict = cli.flags.strict;
configuration.compile = cli.flags.compile;

if (cli.flags.package) {
  configuration.package = {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    name: cli.flags.packageName!,
    registry: cli.flags.packageRegistry,
    author: cli.flags.packageAuthor,
    snapshotVersion: cli.flags.snapshotVersion,
  };
}

await openapiToClient(cli.input[0], {
  basePath: cli.flags.output,
  path: '.',
});
