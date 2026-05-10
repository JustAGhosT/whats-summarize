# ConvoLens Backend

A robust backend service for processing and summarizing WhatsApp chat exports. Built with Node.js, TypeScript, Express, and TypeORM. (Formerly WhatsSummarize.)

## ✨ Features

- **RESTful API**: Comprehensive endpoints for user management, group management, and message processing
- **Authentication**: JWT-based authentication with refresh tokens
- **File Processing**: Parse and process WhatsApp chat export files
- **Database**: SQLite with TypeORM for data persistence
- **Real-time Updates**: WebSocket support for real-time notifications
- **Type Safety**: Full TypeScript support
- **Logging**: Structured logging with Winston
- **API Documentation**: Auto-generated with Swagger/OpenAPI
- **Validation**: Request validation using class-validator
- **Security**: Helmet, CORS, rate limiting, and security headers
- **Testing**: Jest unit and integration tests
- **Docker Support**: Containerized deployment

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm 9+ or yarn 1.22+
- SQLite3 (for development)
- (Optional) Docker & Docker Compose

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/JustAGhosT/whats-summarize.git
   cd whats-summarize/apps/api
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration (see [Configuration](#-configuration)).

4. Initialize the database:
   ```bash
   npm run migration:run
   # or
   yarn migration:run
   ```

### Running the Application

#### Development
```bash
# Start in development mode with hot-reload
npm run dev
# or
yarn dev
```

#### Production
```bash
# Build the application
npm run build

# Start in production mode
npm start
# or
yarn start
```

#### Using Docker
```bash
# Build and start containers
docker-compose up --build

# In development with hot-reload
docker-compose -f docker-compose.dev.yml up --build
```

## 🔧 Configuration

Configuration is managed through environment variables. Copy `.env.example` to `.env` and update the values:

```env
# Server
NODE_ENV=development
PORT=3001
HOST=0.0.0.0
API_PREFIX=/api

# Database
DB_TYPE=sqlite
DATABASE_PATH=./data/database.sqlite

# Authentication
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=1d
REFRESH_TOKEN_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3000
```

## 🗝️ Authentication

The API uses JWT for authentication. Include the JWT token in the `Authorization` header:

```
Authorization: Bearer <your_jwt_token>
```

## 📚 API Documentation

API documentation is available at `/api-docs` when running in development mode.

## 🧪 Testing

```bash
# Run tests
npm test
# or
yarn test

# Run tests with coverage
npm test:coverage
# or
yarn test:coverage
```

## 🛠️ Development

### Code Style

This project uses ESLint and Prettier for code style. Run the following commands to check and fix code style:

```bash
# Check for style issues
npm run lint

# Automatically fix style issues
npm run lint:fix

# Format code
npm run format
```

### Git Hooks

This project uses Husky for Git hooks. Pre-commit and pre-push hooks are configured to run linting and tests.

## 📦 Deployment

### Docker

Build and run using Docker:

```bash
docker build -t convolens-api .
docker run -p 3001:3001 convolens-api
```

### Environment Variables for Production

In production, make sure to set the following environment variables:

```env
NODE_ENV=production
JWT_SECRET=your_secure_random_string_here
DB_SYNCHRONIZE=false
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [TypeORM](https://typeorm.io/)
- [Express](https://expressjs.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [Jest](https://jestjs.io/)
- [Winston](https://github.com/winstonjs/winston)
   ```

## Available Scripts

- `dev`: Start development server with hot-reload
- `build`: Compile TypeScript to JavaScript
- `start`: Start production server
- `test`: Run tests
- `lint`: Run ESLint
- `format`: Format code with Prettier

## API Documentation

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/profile` - Get current user profile

### Groups

- `GET /api/groups` - List all groups
- `POST /api/groups` - Create a new group
- `GET /api/groups/:id` - Get group details
- `PUT /api/groups/:id` - Update group
- `DELETE /api/groups/:id` - Delete group
- `GET /api/groups/:id/messages` - Get group messages

### Messages

- `GET /api/messages` - List all messages
- `POST /api/messages` - Send a new message
- `GET /api/messages/:id` - Get message details
- `DELETE /api/messages/:id` - Delete message

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3001 |
| `NODE_ENV` | Environment | development |
| `JWT_SECRET` | JWT secret key | - |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:3000 |
| `DB_TYPE` | Database type | sqlite |
| `DB_DATABASE` | Database file | database.sqlite |
| `WHATSAPP_HEADLESS` | Run browser in headless mode | false |
| `LOG_LEVEL` | Logging level | info |

## Project Structure

```text
backend/
├── src/
│   ├── api/            # API routes and controllers
│   ├── config/         # Configuration files
│   ├── db/             # Database entities and migrations
│   ├── middleware/     # Express middleware
│   ├── services/       # Business logic
│   ├── sockets/        # WebSocket handlers
│   ├── utils/          # Utility functions
│   ├── whatsapp/       # WhatsApp client
│   ├── app.ts          # Express app setup
│   └── index.ts        # Server entry point
├── tests/             # Test files
├── logs/              # Log files
├── .env.example       # Environment variables example
└── package.json
```

## Deployment

1. Set `NODE_ENV=production` in your environment
2. Build the application:

   ```bash
   npm run build
   ```

3. Start the production server:

   ```bash
   npm start
   ```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/yourusername/whatsapp-monitor/blob/main/LICENSE) file for details.
