const jestConfig = {
  displayName: 'kovaa-lab-utils',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  testEnvironmentOptions: {},
  transform: {
    '^.+\\.[tj]s$': [
      '@swc/jest',
      { jsc: { parser: { syntax: 'typescript' } } },
    ],
  },
  moduleFileExtensions: ['ts', 'js'],
  coverageDirectory: './coverage',
};

export default jestConfig;
