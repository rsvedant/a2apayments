This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environment Variables

### Required Environment Variables

Create a `.env.local` file in the root directory with the following variables:

#### Convex Configuration
- `NEXT_PUBLIC_CONVEX_URL` - Your Convex deployment URL
- `SITE_URL` - Your site URL (e.g., `http://localhost:3000` for development)
- `BETTER_AUTH_SECRET` - Secret key for Better Auth encryption (generate with `openssl rand -base64 32`)

#### GitHub OAuth (for GitHub sign-in)
- `GITHUB_CLIENT_ID` - GitHub OAuth App Client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth App Client Secret

### Setting Convex Environment Variables

Set Convex-specific environment variables using the Convex CLI:

```bash
npx convex env set SITE_URL http://localhost:3000
npx convex env set GITHUB_CLIENT_ID your_client_id_here
npx convex env set GITHUB_CLIENT_SECRET your_client_secret_here
```

## GitHub OAuth Setup

To enable GitHub sign-in, you need to create a GitHub OAuth App:

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the application details:
   - **Application name**: Your app name (e.g., "AgentSale")
   - **Homepage URL**: Your app URL (e.g., `http://localhost:3000` for dev)
   - **Authorization callback URL**: 
     - Development: `http://localhost:3000/api/auth/callback/github`
     - Production: `https://yourdomain.com/api/auth/callback/github`
4. Click "Register application"
5. Copy the **Client ID** and generate a **Client Secret**
6. Add these values to your `.env.local` file and Convex environment variables (see above)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
