const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig');

/** @type {import('ts-jest').InitialOptionsTsJest} */
module.exports = {
    preset: 'ts-jest',
    globals: {
        'ts-jest': {
            isolatedModules: true,
        },
    },
    moduleFileExtensions: ['js', 'ts', 'tsx', 'd.ts', 'json', 'node'],
    moduleNameMapper: {
        '\\.(jpe?g|png|gif|svg)$': '<rootDir>/resources/scripts/__mocks__/file.ts',
        '\\.(s?css|less)$': 'identity-obj-proxy',
        ...pathsToModuleNameMapper(compilerOptions.paths, {
            prefix: '<rootDir>/',
        }),
    },
    setupFilesAfterEnv: [
        '<rootDir>/resources/scripts/setup-tests.ts',
    ],
    transform: {
        // Under the test environment the babel preset targets the running version of
        // node, which pulls in a plugin that the pinned version of @babel/core is too
        // old to load. TypeScript is compiled by ts-jest instead, which does not go
        // through babel at all.
        '.*\\.tsx?$': 'ts-jest',
        '.*\\.jsx$': 'babel-jest',
    },
    testPathIgnorePatterns: ['/node_modules/'],
};
