# GCT UI (VLM NIGHTLY) - Dockerized

This repository contains a Dockerized version of the GCT UI (VLM NIGHTLY) application.

## Features

- Web-based UI for interacting with LM Studio
- Notes functionality with Markdown support
- AI-powered chat interface
- Containerized for easy deployment

## Prerequisites

- Docker
- Docker Compose (optional, but recommended)

## Quick Start

### Using Docker Compose (Recommended)

1. Clone this repository
2. Navigate to the repository directory
3. Run the application:

```bash
# For Docker Compose V2 (recommended)
docker compose up -d

# For older Docker Compose V1 (if the above doesn't work)
docker-compose up -d
```

4. Access the application in your browser at: `http://localhost:9091`

### Using Docker directly

1. Build the Docker image:

```bash
docker build -t gct-ui-vlm .
```

2. Run the container:

```bash
docker run -d -p 9091:9091 --name gct-ui-vlm gct-ui-vlm
```

3. Access the application in your browser at: `http://localhost:9091`

## Configuration

### Configuration Options

The application supports the following environment variables for configuration:

- `API_URL`: The base URL for the LM Studio API (default: `http://192.168.1.7:4545`)
- `API_TIMEOUT`: Timeout in milliseconds for API requests (default: `30000`)
- `MAX_RETRIES`: Maximum number of retry attempts for failed API requests (default: `3`)

**Important Note:** If you see a 404 error in the browser console, it likely means the LM Studio backend is not running at the configured address. Make sure your LM Studio application is running and accessible at the configured URL.

You can change these settings by modifying the environment variables in the `docker-compose.yml` file:

```yaml
environment:
  - API_URL=http://your-lm-studio-api:4545
  - API_TIMEOUT=60000
  - MAX_RETRIES=5
```

Or when running with Docker directly:

```bash
docker run -d -p 9091:9091 \
  -e API_URL=http://your-lm-studio-api:4545 \
  -e API_TIMEOUT=60000 \
  -e MAX_RETRIES=5 \
  --name gct-ui-vlm gct-ui-vlm
```

## Troubleshooting

### Connection Issues

1. **404 Error in Console**: If you see a "Failed to load resource: the server responded with a status of 404 (Not Found)" error in your browser console, check that:
   - LM Studio is running on your machine
   - The API URL in the configuration matches where LM Studio is serving its API
   - Your firewall or network settings allow connections to the LM Studio API

2. **Docker Compose Command Not Working**: If you encounter errors with `docker-compose`, try using the Docker Compose V2 command format: `docker compose` (without the hyphen).

## Development

For development purposes, you can uncomment the volume mounts in the `docker-compose.yml` file to enable live updates without rebuilding the container:

```yaml
volumes:
  - ./index.html:/usr/share/nginx/html/index.html
  - ./script.js:/usr/share/nginx/html/script.js
  - ./notes.js:/usr/share/nginx/html/notes.js
  - ./styles.css:/usr/share/nginx/html/styles.css
  - ./config.template.js:/usr/share/nginx/html/config.template.js
  - ./css:/usr/share/nginx/html/css
  - ./js:/usr/share/nginx/html/js
```

### Configuration System

The application uses a two-part configuration system:

1. **Environment Variables**: Set through Docker environment variables
2. **Configuration Template**: The `config.template.js` file contains the configuration logic

When the container starts:
1. Environment variables are injected into the `config.js` file
2. The content of `config.template.js` is appended to `config.js`
3. The resulting file provides a complete configuration system with environment variable support

This approach allows for flexible configuration while maintaining the application's configuration logic.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
