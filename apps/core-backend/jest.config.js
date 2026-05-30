/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '../..',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['apps/core-backend/src/**/*.(t|j)s', 'libs/**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  roots: ['<rootDir>/apps/core-backend/src', '<rootDir>/libs'],
  moduleNameMapper: {
    '^@weaver2/common(|/.*)$': '<rootDir>/libs/common/src/$1',
    '^@weaver2/email(|/.*)$': '<rootDir>/libs/email/src/$1',
    '^@weaver2/pagination(|/.*)$': '<rootDir>/libs/pagination/src/$1',
    '^@weaver2/prisma(|/.*)$': '<rootDir>/libs/prisma/src/$1',
    '^@weaver2/shared(|/.*)$': '<rootDir>/libs/shared/src/$1',
    '^@weaver2/upload(|/.*)$': '<rootDir>/libs/upload/src/$1',
    '^@weaver2/module-registry(|/.*)$': '<rootDir>/libs/module-registry/src/$1',
  },
};
