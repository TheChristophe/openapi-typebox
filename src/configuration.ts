type Confirmation = {
  throwOnError: boolean;

  outputDir: string;

  package?: {
    name: string;
    registry?: string;
    author?: string;
    snapshotVersion: boolean;
  };
};

const configuration: Confirmation = {
  throwOnError: true,

  outputDir: './client',
};

export default configuration;
