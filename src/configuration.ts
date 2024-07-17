type Confirmation = {
  throwOnError: boolean;

  outputDir: string;

  package?: {
    packageName: string;
  };
};

const configuration: Confirmation = {
  throwOnError: true,

  outputDir: './client',
};

export default configuration;
