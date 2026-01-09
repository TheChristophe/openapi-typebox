#!/usr/bin/env node
import meow from 'meow';
import jsonschemaToModel from './generation/jsonschemaModel.js';
import configuration from './generation/utility/configuration.js';

const cli = meow(
  `
  Usage
    $ schema-box <directory including .schema.json files>

  Options
    --output, -o Output folder, default to "./client"
    --compile Compile the generated client
    --package Generate a package.json
    --package-name Package name
    --package-registry Registry to publish to
    --package-author Package author
    --snapshot-version Append timestamp to package version

  Examples
    $ schema-box ./dir
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

await jsonschemaToModel(cli.input[0], cli.flags.output);
