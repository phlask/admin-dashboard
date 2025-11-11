# PHLask Admin Dashboard - Setup Guide

## Authentication Setup

This admin dashboard uses Supabase for authentication. Follow these steps to get started:

### 1. Install Dependencies

First, install the required npm packages:

```bash
npm install
# or
pnpm install
# or
yarn install
```

### 2. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up or log in
2. Click "New Project"
3. Fill in your project details:
   - Project name (e.g., "PHLask Admin")
   - Database password (save this securely)
   - Region (choose closest to your users)
4. Wait for the project to be created (this takes about 2 minutes)

### 3. Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys")

### 4. Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### 5. Create Admin Users in Supabase

1. In your Supabase dashboard, go to **Authentication** → **Users**
2. Click "Add user" → "Create new user"
3. Enter the email and password for your admin user
4. Click "Create user"

The user will be created without needing email confirmation (you can enable this later if needed).

### 6. Run the Development Server

```bash
npm run dev
# or
pnpm run dev
```

The app will be available at http://localhost:5174

### 7. Test the Login

1. Visit http://localhost:5174
2. Click "Sign In"
3. Enter the email and password you created in Supabase
4. You should be redirected to the dashboard

## Application Structure

```
app/
├── lib/
│   └── supabase.ts              # Supabase client configuration
├── contexts/
│   └── AuthContext.tsx          # Authentication context and hooks
├── components/
│   └── ProtectedRoute.tsx       # Protected route wrapper
├── routes/
│   ├── home.tsx                 # Landing page
│   ├── login.tsx                # Login page
│   └── dashboard.tsx            # Protected dashboard page
└── root.tsx                     # Root layout with AuthProvider
```

## Features

- **User Authentication**: Email/password login via Supabase Auth
- **Protected Routes**: Dashboard is only accessible to authenticated users
- **Session Management**: Automatic session persistence and refresh
- **Auto-redirect**: Logged-in users are automatically redirected to dashboard
- **Sign Out**: Users can sign out from the dashboard

## Next Steps

Now that authentication is set up, you can:

1. **Add more admin users** in Supabase Authentication panel
2. **Connect to your PHLask data** by configuring Supabase database tables
3. **Add resource management features** to the dashboard
4. **Implement Row Level Security (RLS)** in Supabase to protect your data
5. **Add role-based permissions** to differentiate between admin levels

## Security Considerations

- The `.env` file is gitignored and should never be committed
- The Supabase anon key is safe to expose in client-side code
- Implement Row Level Security (RLS) policies in Supabase for data protection
- Consider enabling email confirmation for production use
- Add rate limiting and additional security measures as needed

## Troubleshooting

### "Missing Supabase environment variables" error
- Make sure your `.env` file exists and contains the correct values
- Restart the development server after adding environment variables

### Login not working
- Verify the user exists in Supabase Authentication panel
- Check the browser console for error messages
- Ensure your Supabase URL and anon key are correct

### Session not persisting
- Check browser console for errors
- Clear browser local storage and try again
- Verify Supabase project is active and accessible

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [React Router Documentation](https://reactrouter.com/)
