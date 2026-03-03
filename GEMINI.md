# Gemini Assistant Project Guide

This document provides guidelines and context for the Gemini assistant to ensure consistency and efficiency when working on this project.

## Project Overview

This is a monorepo project for `weaver2`, built with NestJS. The main application is in `apps/core-backend`, and shared libraries are in `libs`.

## Architecture and Coding Conventions

- **Monorepo Structure:**
  - `apps/`: Contains the actual runnable applications.
  - `libs/`: Contains reusable logic, modules, and DTOs shared across different apps.

## Key Commands

-   **Linting and Formatting:**
    -   `pnpm lint`: Run ESLint to check for code quality.
    -   `pnpm format`: Run Prettier to format the code.
-   **Testing:**
    -   `pnpm test`: Run all unit tests.
    -   `pnpm test:watch`: Run tests in watch mode.
    -   `pnpm test:e2e`: Run end-to-end tests.
-   **Database:**
    -   `pnpm db:migrate`: Run Prisma migrations to update the database schema.
    -   `pnpm db:generate`: Generate Prisma client based on the schema.
-   **Running the App:**
    -   `pnpm dev`: Run the selected project in development mode (using `scripts/run-project.sh`).

## Development Guidelines

### Commit Messages

Commit messages should follow a specific format.

-   **Format:**
    ```
    type(scope): subject
      - Bullet point 1
      - Bullet point 2
    ```
-   **Example:**
    ```
    feat(swagger): Improve DX with standard response decorator
      - Introduces a custom decorator, @ApiStandardResponses, to reduce boilerplate.
      - Refactors DTO locations for better architectural clarity.
    ```
-   **Presentation:** When suggesting commit messages, present them as plain text without line numbers or any code block formatting. For example:
    ```
    type(scope): subject
      - Bullet point 1
      - Bullet point 2
    ```

### Code Style

-   **DTOs:**
    -   Application-specific DTOs (like `UserDto`) should be located within the corresponding module's `dto` directory (e.g., `apps/core-backend/src/modules/user/dto`).
    -   DTOs used purely for Swagger documentation (like `ErrorResponseDto`) should be placed in `libs/common/src/global/dto/swagger`.
-   **Custom Decorators:** Use custom decorators to reduce boilerplate, especially for Swagger annotations. Add detailed JSDoc comments to explain their purpose and usage.

## Important Notes

- **Logging:** Do not use `console.log`. Instead, use the `Logger` from `@nestjs/common`.
- **Environment Variables:** Manage environment variables by copying `.env.example` to a `.env` file. Never commit sensitive information directly into the source code.
