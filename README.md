# Chopin Demo: Decentralized Speed Test

This project is a demonstration of the Chopin framework, showcasing how to build a decentralized application that allows users to record and query internet speed test results. The application integrates a self-hosted OpenSpeedTest widget, captures results via `postMessage` communication, and saves them to a local database.

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Speed Test Widget:** [OpenSpeedTest](https://openspeedtest.com/) (self-hosted in Docker)
- **Database:** [SQLite](https://www.sqlite.org/index.html)
- **Containerization:** [Docker](https://www.docker.com/)
- **Blockchain (planned):** [Celestia](https://celestia.org/) via Chopin Framework
- **Validation (planned):** Chopin Oracle

## Features

- **Reliable Speed Tests:** Integrates a self-hosted OpenSpeedTest widget running in a custom Docker container.
- **Seamless Iframe Communication:** Uses the `postMessage` API for robust communication between the Next.js parent page and the speed test iframe.
- **Geolocation:** Captures the user's location via the browser's Geolocation API.
- **Local Data Persistence:** Saves speed test results to a local SQLite database via a Next.js API route.
- **Custom Docker Image:** Ensures a consistent and reliable environment for the speed test widget by baking in all modifications.

## Getting Started

Follow these instructions to get the project up and running on your local machine.

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18 or later)
- [npm](https://www.npmjs.com/)
- [Docker](https://www.docker.com/)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd demo
```

### 2. Install Dependencies

Install the necessary Node.js packages for the Next.js application.

```bash
npm install
```

### 3. Build the Custom Speed Test Image

The OpenSpeedTest widget runs in a custom Docker container with our modifications baked in. Build the image using the provided Dockerfile.

```bash
docker build -f speedtest-server/Dockerfile -t custom-speedtest .
```

### 4. Run the Speed Test Container

Run the custom Docker container you just built. This will expose the necessary ports for the widget to function.

```bash
docker run -d --name speedtest-server -p 8080:3000 -p 8443:3001 custom-speedtest
```

- The speed test widget will now be running and accessible to the Next.js application.
- To stop the container, run `docker stop speedtest-server`.

### 5. Run the Next.js Application

Start the main application's development server.

```bash
npm run dev
```

- The application will be available at `http://localhost:3000`.
- Open `http://localhost:3000/speed-test` in your browser to use the application.

## Project Structure

- `src/app/speed-test/page.tsx`: The main page for the speed test functionality, handling UI and iframe communication.
- `src/app/api/speed-test/route.ts`: The API route for saving and retrieving speed test data from the database.
- `public/openspeedtest-custom/`: Contains the source code for our modified OpenSpeedTest widget files.
- `speedtest-server/Dockerfile`: The Dockerfile used to build our custom speed test server image.
- `speedtest.db`: The SQLite database file where results are stored (created automatically).
