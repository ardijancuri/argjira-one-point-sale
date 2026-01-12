# Argjira CRM - POS & Inventory Management System

A comprehensive CRM and Point of Sale system built with React, Express, and PostgreSQL. Designed for jewelry stores and small businesses that need inventory management, invoicing, and sales tracking.

## 🚀 Features

- **📊 Dashboard**: Real-time business metrics and analytics
- **🛒 Point of Sale (POS)**: Fast checkout with multiple payment methods
- **📦 Inventory Management**: Track stock with weighted average pricing
- **🧾 Invoicing**: Create, edit, and print professional invoices (PDF)
- **👥 Client Management**: Organize customers and suppliers
- **💰 Financial Tracking**: Cash management and payment records
- **⚙️ Gold Processing**: 4-phase workflow for jewelry manufacturing
- **📱 Responsive Design**: Works on desktop and mobile devices

## 📸 Screenshots

*(Add screenshots of your application here after deployment)*

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **TailwindCSS** - Styling
- **React Router** - Navigation
- **React Query** - Data fetching and caching
- **Chart.js** - Charts and graphs
- **Axios** - HTTP client
- **Lucide React** - Icons

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **PostgreSQL** - Database
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **PDFKit** - PDF generation

### Deployment
- **Vercel** - Hosting (Frontend & Backend)
- **Supabase** - PostgreSQL database

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ (local) or Supabase account (production)
- Git

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR-USERNAME/argjira-crm.git
cd argjira-crm
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
cd ..
```

Or use the convenience script:

```bash
npm run install:all
```

### 3. Setup Database

#### Option A: Local PostgreSQL

```bash
# Create database
createdb argjira_crm

# Run migrations
psql -d argjira_crm -f database/migrations/001_initial_schema.sql
```

#### Option B: Supabase (Recommended for Production)

1. Create account at [Supabase](https://supabase.com)
2. Create new project
3. Go to SQL Editor
4. Copy and run `database/migrations/001_initial_schema.sql`

### 4. Configure Environment Variables

#### Backend (backend/.env)

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=argjira_crm
DB_USER=postgres
DB_PASSWORD=your-password

JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRES_IN=7d

NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

See [ENV_SETUP.md](ENV_SETUP.md) for detailed configuration guide.

### 5. Start Development Servers

```bash
# Start both frontend and backend
npm run dev
```

Or start separately:

```bash
# Terminal 1 - Backend (port 3000)
cd backend
npm run dev

# Terminal 2 - Frontend (port 5173)
cd frontend
npm run dev
```

### 6. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000/api
- **Default Login**:
  - Username: `admin`
  - Password: `admin123`

⚠️ **Change the default password after first login!**

## 📦 Project Structure

```
argjira-crm/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   ├── contexts/        # React contexts
│   │   └── App.jsx          # Main app component
│   ├── package.json
│   └── vite.config.js
│
├── backend/                 # Express backend
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Custom middleware
│   │   ├── utils/          # Utilities
│   │   └── server.js       # Server entry point
│   └── package.json
│
├── database/               # Database files
│   ├── migrations/        # SQL migration files
│   └── seeds/             # Seed data scripts
│
├── api/                   # Vercel serverless functions
├── vercel.json            # Vercel configuration
├── package.json           # Root package.json
└── DEPLOYMENT.md          # Deployment guide
```

## 🚢 Deployment

**Recommended**: Deploy Frontend and Backend separately for better performance.

### Quick Deploy (5 minutes)

See [QUICK_DEPLOY.md](QUICK_DEPLOY.md) for the fastest deployment guide.

### Complete Deployment Guide

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed step-by-step instructions.

### Deployment Overview

1. **Setup Supabase**:
   - Create project at [Supabase](https://supabase.com)
   - Run `database/migrations/001_initial_schema.sql` in SQL Editor
   - Copy connection credentials

2. **Deploy Backend to Vercel**:
   - Import GitHub repo
   - Set Root Directory to `./backend`
   - Configure environment variables
   - Deploy

3. **Deploy Frontend to Vercel**:
   - Import same GitHub repo (as new project)
   - Set Root Directory to `./frontend`
   - Set `VITE_API_URL` to backend URL
   - Deploy

4. **Update Backend CORS**:
   - Add frontend URL to backend `FRONTEND_URL` env var
   - Redeploy backend

5. **Test Deployment**:
   - Visit frontend URL
   - Login with admin/admin123
   - Change default password

## 🔐 Security

### Production Checklist

- [ ] Change default admin password
- [ ] Generate secure JWT_SECRET (32+ characters)
- [ ] Use strong database password
- [ ] Enable HTTPS (automatic with Vercel)
- [ ] Set proper CORS origins
- [ ] Regular database backups
- [ ] Keep dependencies updated

### Password Security

Passwords are hashed using bcrypt with 10 rounds. JWT tokens expire after 7 days by default.

## 📖 API Documentation

### Base URL
- Development: `http://localhost:3000/api`
- Production: `https://your-app.vercel.app/api`

### Authentication

All API requests (except login/register) require JWT token:

```javascript
Authorization: Bearer <token>
```

### Main Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | User login |
| GET | `/dashboard` | Dashboard stats |
| GET | `/clients` | List clients |
| POST | `/clients` | Create client |
| GET | `/stock` | List stock items |
| POST | `/stock` | Add stock item |
| GET | `/invoices` | List invoices |
| POST | `/invoices` | Create invoice |
| GET | `/invoices/:id/pdf` | Download invoice PDF |
| POST | `/fiscal-sales` | Process POS sale |
| GET | `/fiscal-sales/today` | Today's sales |

See individual route files in `backend/src/routes/` for full API details.

## 🧪 Testing

```bash
# Backend tests (if implemented)
cd backend
npm test

# Frontend tests (if implemented)
cd frontend
npm test
```

## 📝 Database Schema

The database includes these main tables:

- `users` - User accounts and authentication
- `clients` - Customers and suppliers
- `stock_items` - Inventory items
- `invoices` & `invoice_items` - Invoicing
- `fiscal_sales` & `fiscal_sale_items` - POS transactions
- `purchases` - Purchase records
- `productions` - Production orders
- `processing_records` - 4-phase gold processing
- `cash_transactions` - Cash flow tracking
- `company_settings` - Business configuration

See `database/migrations/001_initial_schema.sql` for complete schema.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👥 Authors

- Your Name - Initial work

## 🙏 Acknowledgments

- Built for jewelry retail businesses
- Inspired by modern POS systems
- Uses best practices for web security

## 📞 Support

For issues and questions:

1. Check [DEPLOYMENT.md](DEPLOYMENT.md) for deployment issues
2. Check [ENV_SETUP.md](ENV_SETUP.md) for configuration help
3. Review server logs in Vercel dashboard
4. Check browser console for frontend errors

## 🗺️ Roadmap

- [ ] Email notifications
- [ ] Barcode scanning
- [ ] Multi-language support
- [ ] Advanced reporting
- [ ] Mobile app
- [ ] Receipt printer integration
- [ ] Backup/restore features
- [ ] Role-based permissions

## 📊 Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## 💡 Tips

- Use Chrome for best PDF generation support
- Regular database backups recommended
- Monitor Supabase usage on free tier
- Keep dependencies updated for security
- Use strong passwords for all accounts

---

**Made with ❤️ for small businesses**

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)
