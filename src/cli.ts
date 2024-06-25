#!/usr/bin/env node
import meow from 'meow';
import openapiToApiClient from './openapiToApiClient.js';

const cli = meow(
  `
  Usage
    $ openapi-box <input>

  Options
    --output, -o Output folder, default to "./client"

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
    },
  },
);

if (cli.input.length === 0) {
  cli.showHelp();
}

await openapiToApiClient(cli.input[0], cli.flags.output);
