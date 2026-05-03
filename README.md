# Bagdja Login - Centralized Authentication Service

Centralized login service for all Bagdja applications. Provides a unified authentication experience similar to Google OAuth account picker.

## Features

- **Centralized Login**: Single login page for all Bagdja applications
- **Account Picker**: Google-like UI showing previously used accounts
- **Multiple Auth Methods**: Email/password and Google OAuth
- **Secure Redirects**: Validates redirect URLs to prevent open redirect vulnerabilities
- **Bagdja Branding**: Uses Bagdja color scheme and branding

## Flow

1. User clicks login in any Bagdja application (e.g., `store.bagdja.com`)
2. Application redirects to: `login.bagdja.com?redirect_url=https://store.bagdja.com/auth/callback`
3. User sees account picker (if previously logged in) or login form
4. After successful login, user is redirected to `redirect_url?token=JWT_TOKEN`
5. Application receives token and stores it in its own private cookie

## Getting Started

### Prerequisites

- Node.js 18+ and npm (or yarn/pnpm)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
   
   Copy the example file and create `.env.local`:
   ```bash
   cp env.example .env.local
   ```
   
   Or create `.env.local` manually with the following variables:
   ```env
   # Auth Service API Base URL
   NEXT_PUBLIC_AUTH_API=https://auth.bagdja.com
   
   # Server-side Client App Credentials (DO NOT prefix with NEXT_PUBLIC_)
   # Used by this Next.js app on the server to obtain an x-api-token.
   BAGDJA_CLIENT_APP_ID=user-console
   BAGDJA_CLIENT_APP_SECRET=your_client_app_secret
   
   # Optional: Frontend URL (for development)
   # NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
   ```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
bagdja-login/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Login page (account picker)
│   │   ├── register/
│   │   │   └── page.tsx        # Registration page
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── page.tsx    # OAuth callback handler
│   │   └── globals.css          # Global styles with Bagdja branding
│   ├── lib/
│   │   ├── api.ts              # API client for auth service
│   │   └── auth.ts             # Auth utilities (redirect URL handling)
│   ├── types/
│   │   └── index.ts            # TypeScript types
│   └── ui/
│       ├── button.tsx          # Button component
│       └── input.tsx           # Input component
├── package.json
├── tsconfig.json
├── next.config.ts
├── env.example
├── .gitignore
└── README.md
```

## Usage in Applications

To use this login service in your application:

1. Redirect users to login page with `redirect_url`:
```javascript
const loginUrl = `https://login.bagdja.com?redirect_url=${encodeURIComponent('https://yourapp.bagdja.com/auth/callback')}`;
window.location.href = loginUrl;
```

2. Handle callback in your application:
```javascript
// In your /auth/callback route
const token = searchParams.get('token');
if (token) {
  // Store token in your application's private cookie
  setAccessToken(token);
  // Redirect to dashboard
  router.push('/dashboard');
}
```

## Security

- Redirect URLs are validated to only allow `*.bagdja.com` domains or `localhost` (for development)
- Tokens are passed via URL parameters (applications should store them securely)
- Each application maintains its own private cookies (no shared storage)

## Technologies

- **Next.js 16.1.1** - React framework
- **React 19.2.3** - UI library
- **TypeScript 5** - Type safety
- **Tailwind CSS 4** - Styling

## License

Private project for Bagdja Digital
