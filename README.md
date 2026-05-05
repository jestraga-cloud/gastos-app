# 💰 Gastos App

A modern expense tracking and budget management application for personal and household finances. Track spending, visualize expenses by category, manage recurring bills, and stay within budget with real-time analytics.

## Features

- 📊 **Expense Tracking** - Record expenses with categories, descriptions, and necessity flags
- 💵 **Budget Management** - Set monthly budgets and track spending against your limit
- 📈 **Analytics & Reports** - Visualize expenses with charts and trends
- 🔄 **Recurring Expenses** - Automatically add monthly bills and subscriptions
- 🏠 **Shared Households** - Track expenses for multiple people with filtering
- 📥 **Export Data** - Download expenses as CSV or Excel for external analysis
- 🔐 **Secure Authentication** - User accounts with Supabase Auth
- 🌙 **Dark Mode** - Eye-friendly interface
- ⚡ **Real-time Sync** - Changes update instantly across devices
- 📱 **Responsive Design** - Works seamlessly on desktop, tablet, and mobile

## Categories

- 🍕 Food & Dining
- 🚗 Transport
- 🏠 Utilities & Housing
- 🛍️ Shopping
- 💊 Health & Wellness
- 🎬 Entertainment
- Other

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Authentication**: [Supabase Auth](https://supabase.com/docs/guides/auth)
- **Charts**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account with PostgreSQL database
- Email account for authentication

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/jestraga-cloud/gastos-app.git
   cd gastos-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Update `.env.local` with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Initialize the database**
   
   Run the migration script in your Supabase dashboard:
   - Copy the SQL from `supabase-migration.sql`
   - Go to Supabase SQL Editor
   - Paste and execute

5. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development

### Available Scripts

```bash
npm run dev       # Development server
npm run build     # Build for production
npm start         # Start production server
npm lint          # Run linting
```

## Project Structure

```
gastos-app/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Main dashboard
│   ├── login/             # Authentication pages
│   └── components/        # Page-specific components
├── lib/                   # Utilities and helpers
├── public/                # Static assets
├── supabase-migration.sql # Database schema
└── styles/                # Global CSS
```

## Key Features

### Dashboard
- Overview of monthly spending
- Budget progress bar with color indicators (green/yellow/red)
- Quick stats: total spent, remaining budget

### Expense Entry
- Fast entry form with category selector
- Optional descriptions
- Mark as necessary/unnecessary

### Reports
- Pie charts by category
- Monthly spending trends
- Custom date filtering
- Top expenses analysis

### Recurring Expenses
- Set monthly bills
- Auto-populate on specific dates
- Easy enable/disable toggle

### Household Sharing
- Filter by user
- Shared budget management
- Multi-user support

## Budget Alerts

Status indicators:
- 🟢 **Green** - Under 75% of budget
- 🟡 **Yellow** - 75-95% of budget (warning)
- 🔴 **Red** - Over budget

## Tips for Financial Management

1. Categorize consistently for better analytics
2. Add descriptions for future reference
3. Set realistic budgets based on average spending
4. Review monthly to identify patterns
5. Use recurring expenses to automate fixed costs
6. Export regularly to keep backups

## Deployment

Deploy to [Vercel](https://vercel.com/):

```bash
vercel deploy
```

## Data Privacy

- All data stored securely in Supabase PostgreSQL
- Authentication via Supabase Auth
- No third-party tracking
- You own your financial data

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers

## Contributing

Found a bug or have a feature idea? Open an issue or submit a pull request!

## Roadmap

- [ ] Bill splitting
- [ ] Savings goals
- [ ] Investment tracking
- [ ] Mobile app
- [ ] Bank integration
- [ ] AI categorization
- [ ] Tax reports
- [ ] Multi-currency

## License

ISC

## Author

Jairo Straga

---

**Take control of your finances. Track every peso, achieve every goal.** 💰📊
