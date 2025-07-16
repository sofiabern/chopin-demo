# Chopin Demo: Decentralized Speed Test

This project is a demonstration of the Chopin framework, showcasing how to build a decentralized application that allows users to record and query internet speed test results at specific geographic locations. The data is stored in a local SQLite database and is intended to be validated by a Chopin Oracle, leveraging the Celestia blockchain layer.

## Features

- **Speed Test:** Integrates a self-hosted OpenSpeedTest widget to measure download speed, upload speed, and ping.
- **Geolocation:** Uses the browser's Geolocation API to capture the user's current latitude and longitude.
- **Data Storage:** Saves speed test results along with location data to a local SQLite database via a Next.js API route.
- **Frontend:** A responsive Next.js application built with TypeScript and styled with Tailwind CSS.
- **Backend:** A simple Next.js API route that acts as a Backend-for-Frontend (BFF) to interact with the SQLite database.

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Speed Test Widget:** [OpenSpeedTest](https://openspeedtest.com/) (self-hosted)
- **Database:** [SQLite](https://www.sqlite.org/index.html)
- **Blockchain (planned):** [Celestia](https://celestia.org/) via Chopin Framework
- **Validation (planned):** Chopin Oracle

## Getting Started

Follow these instructions to get the project up and running on your local machine.

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18 or later)
- [npm](https://www.npmjs.com/)
- [Docker](https://www.docker.com/)

### 1. Clone the Repository

```bash
# Clone this repository to your local machine
git clone <repository-url>
cd demo
```

### 2. Install Dependencies

Install the necessary Node.js packages for the Next.js application.

```bash
npm install
```

### 3. Run the OpenSpeedTest Server

The speed test widget is served from a self-hosted Docker container. This command will start the container, publish the necessary ports, and mount the local source code. This allows for live modifications to the widget's code without rebuilding the container.

```bash
sudo docker run --restart=unless-stopped --name openspeedtest -d -p 8080:3000 -p 8081:3001 -v "$(pwd)/public/openspeedtest-custom/index.html:/var/www/html/index.html" -v "$(pwd)/public/openspeedtest-custom/hosted.html:/var/www/html/hosted.html" openspeedtest/latest
```

- The speed test widget will be available at `http://localhost:8080`.
- The `-v` flags mount the custom `index.html` and `hosted.html` files into the container. This allows you to modify the widget's behavior without rebuilding the Docker image.

### 4. Run the Next.js Application

Start the main application's development server.

```bash
npm run dev
```

- The application will be available at `http://localhost:3000`.
- Open `http://localhost:3000/speed-test` in your browser to use the application.

## Project Structure

- `src/app/page.tsx`: The main entry point of the application.
- `src/app/speed-test/page.tsx`: The main page for the speed test functionality.
- `src/app/api/speed-test/route.ts`: The API route for saving and retrieving speed test data.
- `public/openspeedtest-custom/`: Contains the customized HTML files for the self-hosted OpenSpeedTest widget.
- `speed-tests.db`: The SQLite database file where results are stored (will be created automatically).
