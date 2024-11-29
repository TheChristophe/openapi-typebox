#!/usr/bin/env node
import meow from 'meow';
import openapiToApiClient from './openapiToApiClient.js';
import configuration from './configuration.js';

const cli = meow(
  `
  Usage
    $ openapi-box <input>

  Options
    --output, -o Output folder, default to "./client"
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

if (cli.flags.package) {
  configuration.package = {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    name: cli.flags.packageName!,
    registry: cli.flags.packageRegistry,
    author: cli.flags.packageAuthor,
    snapshotVersion: cli.flags.snapshotVersion,
  };
}

await openapiToApiClient(cli.input[0], cli.flags.output);
