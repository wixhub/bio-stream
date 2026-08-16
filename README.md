# Bio-Telemetry Spatial Visualizer

Next-generation spatial rendering engine for migratory animal tracking data, engineered for ecological metadata management and reactive spatial filtering using advanced GIS layers.

## Architecture Overview

The Bio-Telemetry Spatial Visualizer is built as an enterprise-grade Angular 22 single-page application. It completely bypasses Zone.js in favor of experimental zoneless change detection to maximize frame-rate performance for high-frequency Leaflet GIS canvas rendering and real-time telemetry streaming.

## Key Technical Pillars

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.1.3.

Zoneless Execution: Maximizes rendering throughput by eliminating Zone.js overhead.

Signals & Computed Reactivity: Fine-grained state synchronization using Angular Signals (signal, computed, effect) and seamless RxJS bridging via toSignal().

Signal Forms & Standalone Components: Strict modular standalone architecture optimized with lazy-loaded deferrable views (@defer (on idle)).

GIS Map Encapsulation: Decoupled Leaflet integration managed via enterprise services with rigorous DestroyRef memory cleanup lifecycles.

## Project Structure

```text
bio-stream/
├── public/
│ └── data/
│ └── telemetry-mock.json
├── src/
│ ├── app/
│ │ ├── core/
│ │ │ ├── models/
│ │ │ │ └── telemetry.model.ts
│ │ │ └── services/
│ │ │ ├── leaflet-map.service.ts
│ │ │ └── telemetry-stream.service.ts
│ │ ├── features/
│ │ │ ├── map-container/
│ │ │ │ ├── map-container.component.ts
│ │ │ │ ├── map-container.component.html
│ │ │ │ └── map-container.component.scss
│ │ │ ├── telemetry-filters/
│ │ │ │ ├── telemetry-filters.component.ts
│ │ │ │ ├── telemetry-filters.component.html
│ │ │ │ └── telemetry-filters.component.scss
│ │ │ └── telemetry-analytics/
│ │ │ ├── telemetry-analytics.component.ts
│ │ │ ├── telemetry-analytics.component.html
│ │ │ └── telemetry-analytics.component.scss
│ │ ├── app.config.ts
│ │ ├── app.component.ts
│ │ └── app.component.html
│ ├── styles.scss
│ └── main.ts
├── angular.json
├── package.json
└── README.md
```

## Getting Started

Prerequisites

- Node.js (v20+ recommended)
- Angular CLI (v22+)

## Installation & Development

Clone the repository and install dependencies:

```bash
git clone https://github.com/wixhub/bio-stream.git
cd bio-stream
npm install
```

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
