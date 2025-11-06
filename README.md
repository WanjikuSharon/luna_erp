# Luna Industries ERP

A comprehensive Enterprise Resource Planning (ERP) system built for Luna Industries, designed to streamline operations, production, and inventory management with AI-powered assistance.

## 🌟 Features

### Raw Material Management
- **Material Requests**: Operation managers can request delivery of raw materials needed for production
- **Delivery Verification**: Verify delivered materials against requests and upload delivery notes
- **Stock Updates**: Add verified materials to existing inventory with automatic tracking

### Production Management
- **Production Input Tracking**: Record raw materials used in manufacturing
- **Production Output Recording**: Track quantity of products produced with automatic inventory updates
- **Real-time Production Monitoring**: Track production processes and material flow

### AI-Powered Inventory Management
- **Inventory Update AI Tool**: Generative AI-powered tool that intelligently handles inventory discrepancies
- **Discrepancy Analysis**: Automatically identifies and explains differences between input and output quantities
- **Historical Data Analysis**: Reviews previous inventory information to provide context-aware suggestions

### Admin Dashboard
- **Comprehensive Monitoring**: Read-only access to all ERP data
- **User Activity Tracking**: Monitor all actions performed by operation and production users
- **System-wide Oversight**: Complete visibility into operations, production, and inventory

### Additional Features
- **Role-Based Access Control**: Separate permissions for admins, operations, and production personnel
- **Email Notifications**: Automated alerts for critical events and updates
- **Document Management**: Upload and manage delivery notes and production documents
- **Real-time Updates**: Live data synchronization across all modules

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
- Firebase account with Firestore database
- Google AI API key for Genkit integration

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
```

4. Initialize Firebase:
- Place your `serviceAccountKey.json` in the project root
- Configure Firestore rules using the provided `firestore.rules`

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
│   │   │   ├── admin/         # Admin dashboard
│   │   │   ├── inventory/     # Inventory management
│   │   │   ├── operations/    # Operations management
│   │   │   └── production/    # Production tracking
│   │   ├── api/               # API routes
│   │   └── login/             # Authentication pages
│   ├── ai/                    # Genkit AI flows
│   │   └── flows/             # AI workflow definitions
│   ├── components/            # React components
│   │   ├── ui/                # shadcn/ui components
│   │   ├── layout/            # Layout components
│   │   ├── operations/        # Operations-specific components
│   │   └── production/        # Production-specific components
│   ├── firebase/              # Firebase configuration
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utility functions and types
│   └── services/              # Business logic services
├── docs/                      # Documentation
└── scripts/                   # Utility scripts
```

## 🔐 User Roles

- **Admin**: Full read-only access to monitor all system activities
- **Operations Manager**: Request materials, verify deliveries, update stock
- **Production Personnel**: Record production inputs and outputs

## 🛠 Tech Stack

- **Framework**: Next.js 15 (with App Router)
- **UI Library**: React 18
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **AI Integration**: Google Genkit with Gemini AI
- **Form Management**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Icons**: Lucide React

## 📝 Scripts

- `npm run dev` - Start development server on port 9002
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm run genkit:dev` - Start Genkit development server
- `npm run genkit:watch` - Start Genkit with auto-reload

## 📄 License

Private - Luna Industries

## 🤝 Contributing

This is a private enterprise system. For internal development guidelines, please refer to the project documentation in the `docs/` directory.
