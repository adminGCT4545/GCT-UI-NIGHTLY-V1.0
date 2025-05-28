### Critical Rules - DO NOT VIOLATE
- **NEVER create mock data or simplified components** unless explicitly told to do so
- **NEVER replace existing complex components with simplified versions** - always fix the actual problem
- **ALWAYS work with the existing codebase** - do not create new simplified alternatives
- **ALWAYS find and fix the root cause** of issues instead of creating workarounds
- When debugging issues, focus on fixing the existing implementation, not replacing it
- When something doesn't work, debug and fix it - don't start over with a simple version
- **ALWAYS check tailwind, js, and css DOCS before making changes** to -related components - they have breaking changes
### TypeScript and Linting
- ALWAYS add explicit types to all function parameters, variables, and return types
- ALWAYS run `pnpm build` or appropriate linter command before considering any code changes complete
- Fix all linter and TypeScript errors immediately - don't leave them for the user to fix
- When making changes to multiple files, check each one for type errors
### PostgresSQL
- NEVER use raw SQL queries ($queryRaw, $queryRawUnsafe) - always use PostgresSQL methods
- When relations don't exist in the schema, use separate queries with findMany() and create lookup maps
- Always check the PostgresSQL schema before assuming relations exist
### UI Component Guidelines
- ALWAYS check KYNSEY UPDATES & Readme DOCS before making changes to related components. They are very new versions and likely have breaking changes you do not know about.
