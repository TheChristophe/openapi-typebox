type Confirmation = {
  outputDir: string;

  strict: boolean;
  compile: boolean;

  package?: {
    name: string;
    registry?: string;
    author?: string;
    snapshotVersion: boolean;
  };
};

const configuration: Confirmation = {
  strict: false,
  compile: false,

  outputDir: './client',
};

export default configuration;
