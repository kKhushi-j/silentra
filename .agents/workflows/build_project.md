# Build Project Workflow

This workflow details the steps required to install dependencies and build the Silentra project.

## Steps

1. **Install Dependencies**
   Run the following command to install all necessary packages:
   ```powershell
   npm install
   ```

2. **Typecheck Code**
   Verify the TypeScript code for any type errors:
   ```powershell
   npm run typecheck
   ```

3. **Build Web Application**
   Compile the Next.js application for production:
   ```powershell
   # Use npx next build on Windows to avoid NODE_ENV issues in scripts
   npx next build
   ```
