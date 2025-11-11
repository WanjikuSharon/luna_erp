# Luna Industries ERP

A comprehensive Enterprise Resource Planning (ERP) system built for Luna Industries, designed to streamline operations, production, and inventory management with AI-powered assistance.

## 🌟 Features

### Operations Management
- **Material Requests**: Create and track requests for raw materials and packaging materials
- **Delivery Verification**: Verify delivered materials against requests with document upload support
- **Vendor Management**: Maintain comprehensive vendor database and track supplier relationships
- **Stock Updates**: Automated inventory updates upon delivery verification
- **Request History**: Complete audit trail of all material requests and their status

### Production Management
- **Production Batches**: Create and manage production batches with detailed input/output tracking
- **Recipe Management**: Define and maintain product recipes with precise material requirements
- **Production Input Tracking**: Record raw materials and packaging materials consumed in manufacturing
- **Production Output Recording**: Track finished products with automatic inventory updates
- **Real-time Production Monitoring**: Monitor active production processes and material flow
- **Batch Analytics**: Track production efficiency and material utilization

### Sales Management
- **Van Stock Management**: Track stock allocated to sales vans with stock-in/stock-out operations
- **Daily Sales Reports**: Generate and submit comprehensive daily sales reports by salesperson
- **Sales Ledger**: Maintain detailed ledger of all sales transactions with financial tracking
- **Salesperson Management**: Manage sales team profiles and performance tracking
- **Van Stock Monitoring**: Real-time visibility of inventory in sales vans
- **Sales Activity Logs**: Complete history of all sales operations and transactions

### Inventory Management
- **Multi-Category Inventory**: Separate tracking for raw materials, packaging materials, and finished products
- **Real-time Stock Levels**: Live inventory updates across all categories
- **Stock Movement History**: Complete audit trail of all inventory transactions
- **Low Stock Alerts**: Automated notifications for items below threshold levels
- **Inventory Reports**: Comprehensive reporting on stock levels and movement

### AI-Powered Features
- **Inventory Update AI Tool**: Generative AI-powered tool that intelligently handles inventory discrepancies
- **Discrepancy Analysis**: Automatically identifies and explains differences between input and output quantities
- **Historical Data Analysis**: Reviews previous inventory information to provide context-aware suggestions
- **Smart Suggestions**: AI-driven recommendations for inventory adjustments and optimization

### Admin Dashboard
- **Comprehensive Monitoring**: Read-only access to all ERP data across all modules
- **User Activity Tracking**: Monitor all actions performed by operations, production, and sales users
- **System-wide Oversight**: Complete visibility into operations, production, sales, and inventory
- **Activity Logs**: Separate activity logs for each department (operations, production, sales, admin)
- **User Management**: Manage user accounts, roles, and permissions

### Security & Access Control
- **Role-Based Access Control**: Granular permissions for admins, operations, production, and sales personnel
- **Secure Authentication**: Firebase Authentication with password reset and account recovery
- **Data Protection**: Firestore security rules ensuring data access based on user roles
- **Active User Management**: Account activation/deactivation controls

### Additional Features
- **Email Notifications**: Automated alerts for critical events and updates
- **Document Management**: Upload and manage delivery notes, production documents, and sales records
- **Real-time Updates**: Live data synchronization across all modules
- **Profile Management**: User profile customization and settings
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Dark Mode Support**: Theme toggle for comfortable viewing

## 🎨 Design System

- **Primary Color**: Golden Yellow (#FFD700) - Evoking the warmth and richness of the Kenyan landscape
- **Background**: Light Sky Blue (#E1F5FE) - A desaturated, calming backdrop
- **Accent Color**: Light Orange (#FFB347) - Analogous to gold, representing energy and vibrancy
- **Typography**: 
  - Headlines: 'Playfair' (serif) for a high-end feel
  - Body Text: 'PT Sans' (sans-serif) for readability
- **UI Elements**: Icons representing local Kenyan culture, industries, and landscapes
- **Responsive Design**: Optimized for all screen sizes with subtle transitions and animations

## 🚀 Getting Started

### Prerequisites
- Node.js 20 or higher
- npm (comes with Node.js)
- Firebase account with:
  - Firestore database
  - Firebase Authentication enabled
  - Firebase Storage enabled
- Google AI API key for Genkit integration
- Gmail account for email notifications (optional)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd luna_erp
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file with your Firebase and Google AI credentials:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
GOOGLE_GENAI_API_KEY=your_google_ai_api_key

# Optional: For email notifications
EMAIL_USER=your_gmail_address
EMAIL_PASS=your_gmail_app_password

# Optional: For Cloudinary image uploads
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

4. Initialize Firebase:
- Place your `serviceAccountKey.json` in the project root (for server-side Firebase Admin SDK)
- Configure Firestore rules using the provided `firestore.rules`
- Deploy Firestore rules: `firebase deploy --only firestore:rules`

5. Seed initial data (optional):
```bash
npm run seed-products
```

### Development

Run the development server:
```bash
npm run dev
```

The application will be available at [http://localhost:9002](http://localhost:9002)

### AI Development

To work with Genkit AI flows:
```bash
npm run genkit:dev
```

Or with auto-reload:
```bash
npm run genkit:watch
```

### Production Build

```bash
npm run build
npm start
```

## 📁 Project Structure

```
luna_erp/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── (app)/             # Protected app routes
│   │   │   ├── admin/         # Admin dashboard and user management
│   │   │   ├── inventory/     # Inventory management (raw materials, packaging, products)
│   │   │   ├── operations/    # Operations management (requests, deliveries, vendors)
│   │   │   ├── production/    # Production tracking (batches, recipes, inputs/outputs)
│   │   │   ├── sales/         # Sales management (van stock, reports, ledger)
│   │   │   ├── profile/       # User profile management
│   │   │   └── settings/      # Application settings
│   │   ├── api/               # API routes
│   │   │   └── genkit/        # Genkit AI API endpoints
│   │   ├── login/             # Authentication pages
│   │   ├── forgot-password/   # Password recovery
│   │   └── reset-password/    # Password reset
│   ├── ai/                    # Genkit AI flows
│   │   ├── genkit.ts          # AI configuration
│   │   └── flows/             # AI workflow definitions
│   ├── components/            # React components
│   │   ├── ui/                # shadcn/ui components
│   │   ├── layout/            # Layout components (navigation, user menu)
│   │   ├── operations/        # Operations-specific components
│   │   ├── production/        # Production-specific components
│   │   └── reports/           # Reporting components
│   ├── firebase/              # Firebase configuration
│   │   ├── config.ts          # Firebase client config
│   │   ├── server-init.ts     # Firebase admin SDK
│   │   └── firestore/         # Firestore utilities
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utility functions and types
│   └── services/              # Business logic services
│       ├── activity_logger.ts # Activity logging service
│       ├── email_service.ts   # Email notification service
│       ├── inventory_service.ts # Inventory operations
│       └── user_service.ts    # User management
├── docs/                      # Documentation
├── scripts/                   # Utility scripts
└── public/                    # Static assets
```

## 🔐 User Roles

- **Admin**: Full read-only access to monitor all system activities, user management, and system configuration
- **Operations Manager**: Request materials, verify deliveries, manage vendors, update stock
- **Production Personnel**: Create production batches, manage recipes, record production inputs and outputs
- **Sales Personnel**: Manage van stock, submit daily sales reports, maintain sales ledger

## 🛠 Tech Stack

- **Framework**: Next.js 15 (with App Router and Turbopack)
- **UI Library**: React 18
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage (for document uploads)
- **Authentication**: Firebase Auth
- **AI Integration**: Google Genkit with Gemini AI
- **Form Management**: React Hook Form + Zod validation
- **Charts & Analytics**: Recharts
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Image Management**: Cloudinary
- **Type Safety**: TypeScript 5
- **Development**: ESLint, Turbopack, tsx

## 📝 Scripts

- `npm run dev` - Start development server on port 9002 (with Turbopack)
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint for code quality checks
- `npm run typecheck` - Run TypeScript type checking
- `npm run genkit:dev` - Start Genkit development server for AI flows
- `npm run genkit:watch` - Start Genkit with auto-reload for AI development

## 🚀 Deployment

### Firebase Hosting (Recommended)

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase in your project:
```bash
firebase init
```

4. Build and deploy:
```bash
npm run build
firebase deploy
```

### Other Platforms

The application can be deployed to any platform that supports Next.js 15:
- Vercel (automatic deployment)
- Netlify
- AWS Amplify
- Google Cloud Run
- Docker containers

Refer to [Next.js deployment documentation](https://nextjs.org/docs/deployment) for platform-specific instructions.

## � Key Workflows

### Operations Workflow
1. Create material request for raw materials or packaging
2. Submit request with vendor and quantity details
3. Receive delivery and verify against request
4. Upload delivery note documentation
5. Materials automatically added to inventory

### Production Workflow
1. Create product recipe with required materials
2. Initiate production batch
3. Record materials consumed (inputs)
4. Record finished products (outputs)
5. System updates inventory automatically
6. AI analyzes any discrepancies

### Sales Workflow
1. Allocate stock to sales van (stock-out)
2. Sales team operates with van inventory
3. Submit daily sales reports
4. Record transactions in sales ledger
5. Return unsold stock (stock-in)
6. Track van stock levels in real-time

## 🔒 Security Features

- **Firebase Authentication**: Secure user authentication with email/password
- **Role-Based Access**: Granular permissions based on user roles
- **Firestore Security Rules**: Database-level security enforcing access controls
- **Protected Routes**: Client-side route protection for authenticated users
- **Secure API Endpoints**: Server-side validation of user permissions
- **Activity Logging**: Complete audit trail of all user actions
- **Password Recovery**: Secure password reset flow

## 🐛 Troubleshooting

### Common Issues

**Firebase Connection Errors**
- Verify environment variables are correctly set in `.env.local`
- Ensure Firebase project has Firestore and Authentication enabled
- Check that `serviceAccountKey.json` is in the project root

**Build Errors**
- Run `npm run typecheck` to identify TypeScript errors
- Clear Next.js cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules package-lock.json && npm install`

**Genkit AI Errors**
- Verify `GOOGLE_GENAI_API_KEY` is set correctly
- Check API key has access to Gemini AI
- Ensure Genkit dependencies are up to date

**Permission Denied Errors**
- Check user role assignments in Firestore `users` collection
- Verify Firestore security rules are deployed
- Ensure user account is marked as `isActive: true`

## 📈 Future Enhancements

- Advanced analytics and reporting dashboards
- Mobile application for field operations
- Barcode/QR code scanning for inventory
- Multi-location warehouse management
- Automated reorder point calculations
- Integration with accounting software
- Real-time notifications via push/SMS
- Export functionality for reports (PDF/Excel)

## �📄 License

Private - Luna Industries

## 🤝 Contributing

This is a private enterprise system. For internal development guidelines, please refer to the project documentation in the `docs/` directory.
