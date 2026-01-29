# G-Splits - Guinness Splits Rating App

A mobile-first web application where users can upload photos of themselves sharing Guinness pints with friends, receive AI-generated ratings and humorous feedback, and compete on various leaderboards.

## Features

- 🍺 Upload photos of Guinness splits
- 🤖 AI-powered ratings and witty feedback using Claude
- 🏆 Multiple leaderboards (Best Split, Average Rating, Most Active)
- 💬 Comment on splits
- 👤 User profiles with statistics
- 📱 Mobile-first responsive design

## Tech Stack

- **Frontend**: Next.js 14+, React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **AI**: Anthropic Claude API (Vision)
- **Storage**: Railway Volumes
- **Hosting**: Railway

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL database

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd guinness-splits
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your values:
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
- `NEXTAUTH_URL`: Your app URL (http://localhost:3000 for development)
- `ANTHROPIC_API_KEY`: Your Anthropic API key

4. Set up the database:
```bash
npx prisma db push
npx prisma generate
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to Railway

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login to Railway:
```bash
railway login
```

3. Initialize Railway project:
```bash
railway init
```

4. Add PostgreSQL database:
```bash
railway add
# Select PostgreSQL
```

5. Set environment variables in Railway dashboard:
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (your Railway app URL)
- `ANTHROPIC_API_KEY`
- `UPLOAD_DIR=/app/uploads`

6. Create a volume for uploads:
- Go to Railway dashboard
- Add a volume mounted at `/app/uploads`

7. Deploy:
```bash
git push
```

## Project Structure

```
guinness-splits/
├── app/
│   ├── (auth)/          # Authentication pages
│   ├── (app)/           # Main app pages
│   ├── api/             # API routes
│   └── layout.tsx       # Root layout
├── components/          # React components
│   ├── ui/              # Reusable UI components
│   └── ...
├── lib/                 # Utility libraries
│   ├── db.ts            # Prisma client
│   ├── auth.ts          # NextAuth config
│   ├── claude.ts        # Claude AI integration
│   └── storage.ts       # File upload handling
├── prisma/
│   └── schema.prisma    # Database schema
└── public/
    └── uploads/         # Uploaded images
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/[...nextauth]` - NextAuth handlers

### Splits
- `GET /api/splits` - Get splits feed
- `GET /api/splits/[id]` - Get single split
- `POST /api/splits/upload` - Upload new split

### Comments
- `POST /api/comments` - Create comment
- `DELETE /api/comments/[id]` - Delete comment

### Leaderboard
- `GET /api/leaderboard` - Get leaderboard

### Users
- `GET /api/users/[username]` - Get user profile
- `GET /api/users/me` - Get current user
- `PATCH /api/users/me` - Update profile

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- AI powered by [Anthropic Claude](https://www.anthropic.com/)
- Hosted on [Railway](https://railway.app/)
