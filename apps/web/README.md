# ConvoLens - Frontend

This is the frontend for ConvoLens (formerly WhatsSummarize), built with Next.js, TypeScript, and Ant Design. It provides the user interface for uploading messaging exports, monitoring groups, and viewing AI-generated conversation summaries.

## Features

- User authentication (login/register)
- Real-time group monitoring
- Message history
- Responsive design
- Dark/light theme support
- WebSocket integration for real-time updates

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Backend API server (see backend README for setup)

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/whatsapp-group-monitor.git
   cd whatsapp-group-monitor/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure environment variables**
   Create a `.env.local` file in the root of the frontend directory with the following variables:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001/api
   NEXT_PUBLIC_WS_URL=http://localhost:3001
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Available Scripts

- `dev` - Start the development server
- `build` - Create an optimized production build
- `start` - Start the production server
- `lint` - Run ESLint
- `test` - Run tests
- `format` - Format code with Prettier

## Project Structure

```
src/
├── components/         # Reusable UI components
├── contexts/          # React context providers
├── pages/             # Next.js pages
├── services/          # API and service integrations
├── styles/            # Global styles
└── types/             # TypeScript type definitions
```

## Technologies Used

- [Next.js](https://nextjs.org/) - React framework
- [TypeScript](https://www.typescriptlang.org/) - Type checking
- [Ant Design](https://ant.design/) - UI component library
- [Axios](https://axios-http.com/) - HTTP client
- [Socket.IO](https://socket.io/) - Real-time communication
- [date-fns](https://date-fns.org/) - Date utility library

## Deployment

The application is deployed on Azure using Container Apps. See the main repository README for deployment instructions.

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_API_URL` | Base URL for the API | Yes | `http://localhost:3001/api` |
| `NEXT_PUBLIC_WS_URL` | WebSocket server URL | Yes | `http://localhost:3001` |

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Next.js Documentation](https://nextjs.org/docs)
- [Ant Design Documentation](https://ant.design/docs/react/introduce)
- [Socket.IO Documentation](https://socket.io/docs/v4/)
