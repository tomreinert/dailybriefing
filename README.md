# Daily Briefing App

A personalized daily briefing service that combines your calendar events, custom notes, and email content into AI-generated summaries delivered on your schedule.

## Features

- **Calendar Integration**: Connect your Google Calendar to include upcoming events
- **Custom Notes**: Add and manage personal notes, talking points, and task lists
- **Email Parsing**: Receive and process emails at your unique inbound address
- **AI-Generated Briefings**: Combine all sources into personalized daily summaries
- **Scheduled Delivery**: Automated email delivery at your preferred time
- **Test Mode**: Preview briefings in the UI before scheduling

## Quick Start

1. **Setup Environment**
   ```bash
   cp .env.example .env.local
   ```
   
   Update `.env.local` with your API keys:
   - **Supabase**: Project URL and anon key from [your project settings](https://app.supabase.com/project/_/settings/api)
   - **OpenAI**: API key from [OpenAI platform](https://platform.openai.com/api-keys)
   - **Postmark**: Server token from your Postmark account
   - **Google OAuth**: Client ID and secret from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - **Supabase Service Role**: Service role key for backend operations
   - **Cron Secret**: Generate a random string for securing scheduled endpoints

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Run Development Server**
   ```bash
   pnpm dev
   ```

## Setup Requirements

- **Supabase Project**: Create at [database.new](https://database.new)
- **Google OAuth**: Required for calendar access and user authentication
- **OpenAI API Key**: For AI briefing generation
- **Postmark Account**: For email delivery and inbound parsing

## How It Works

1. **Sign up** with your Google account
2. **Connect calendars** you want included in briefings
3. **Add custom notes** and talking points
4. **Get your unique email address** for forwarding important emails
5. **Set your delivery schedule** and test your first briefing
6. **Receive daily briefings** automatically via email