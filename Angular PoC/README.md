# Angular PoC - Proof of Concept

This workspace contains a sample Angular application for proof of concept and demonstration purposes.

## Project Structure

```
.
├── .github/
│   └── copilot-instructions.md    # Copilot configuration and setup checklist
├── angular-app/                    # Main Angular application
│   ├── src/                        # Application source code
│   │   ├── app/                   # Angular components and routing
│   │   ├── main.ts                # Application entry point
│   │   └── index.html             # HTML template
│   ├── dist/                      # Build output
│   ├── package.json               # Project dependencies
│   ├── angular.json               # Angular configuration
│   ├── tsconfig.json              # TypeScript configuration
│   └── README.md                  # Angular app documentation
└── README.md                       # This file
```

## Quick Start

### Prerequisites

- Node.js (v24+ recommended)
- npm (included with Node.js)

### Installation

```bash
cd angular-app
npm install
```

### Development Server

Start the development server:

```bash
npm start
```

Navigate to `http://localhost:4200/` in your browser. The application will automatically reload when you modify source files.

### Build

Build the project for production:

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

### Testing

Run unit tests:

```bash
npm test
```

## Features

- **Standalone Components**: Uses Angular's modern standalone component architecture
- **Routing**: Pre-configured routing module for multi-page applications
- **TypeScript**: Full TypeScript support with strict mode enabled
- **CSS Styling**: CSS framework configured for styling
- **Development Tools**: Includes debugging configuration and VS Code integration

## Additional Resources

- [Angular Documentation](https://angular.dev/)
- [Angular CLI Documentation](https://angular.dev/cli/)
- [TypeScript Documentation](https://www.typescriptlang.org/)

## Next Steps

Customize the application by:

1. Modifying components in `src/app/`
2. Adding new routes in `src/app/app.routes.ts`
3. Creating new components with `ng generate component component-name`
4. Adding services and state management as needed

---

For more information, see the [Angular app README](./angular-app/README.md).
