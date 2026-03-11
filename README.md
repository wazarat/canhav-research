# CanHav Research Website

A professional, high-tech website for CanHav Research built with **Next.js** (frontend) and **Python FastAPI** (backend). Features a sleek blue and black theme with modern UI components and interactive elements.

## 🚀 Tech Stack

### Frontend
- **Next.js 14** - React framework with TypeScript
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client for API calls
- **React Hooks** - State management

### Backend
- **FastAPI** - Modern Python web framework
- **Pydantic** - Data validation and serialization
- **Uvicorn** - ASGI server
- **CORS** - Cross-origin resource sharing

## 📁 Project Structure

```
canhav-research/
├── components/           # React components
│   └── Layout.tsx       # Main layout component
├── pages/               # Next.js pages
│   ├── _app.tsx        # App configuration
│   ├── index.tsx       # Homepage
│   └── contact.tsx     # Contact page
├── styles/              # CSS styles
│   └── globals.css     # Global styles with Tailwind
├── backend/             # Python FastAPI backend
│   ├── main.py         # Main FastAPI application
│   ├── requirements.txt # Python dependencies
│   └── .env.example    # Environment variables template
├── package.json         # Node.js dependencies
├── tailwind.config.js   # Tailwind configuration
├── tsconfig.json        # TypeScript configuration
└── README.md           # This file
```

## 🛠️ Setup Instructions

### Prerequisites
- **Node.js** (v18 or higher)
- **Python** (v3.8 or higher)
- **npm** or **yarn**
- **pip** (Python package manager)

### Frontend Setup (Next.js)

1. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to `http://localhost:3000`

### Backend Setup (Python FastAPI)

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create a virtual environment (recommended):**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

5. **Start the FastAPI server:**
   ```bash
   python main.py
   ```
   
   Or using uvicorn directly:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

6. **API Documentation:**
   - Swagger UI: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`

## 🌟 Features

### Frontend Features
- **Responsive Design** - Works on all device sizes
- **Modern UI** - Glassmorphism effects and smooth animations
- **Professional Theme** - Blue and black color scheme
- **Interactive Navigation** - Smooth hover effects and transitions
- **Contact Form** - Integrated with backend API
- **TypeScript** - Type-safe development

### Backend Features
- **RESTful API** - Clean and organized endpoints
- **Data Validation** - Pydantic models for request/response validation
- **CORS Support** - Cross-origin requests enabled
- **Contact Form Handler** - Processes and stores contact submissions
- **Health Checks** - API health monitoring endpoints
- **File Persistence** - Contact data saved to JSON files

## 📋 Available Scripts

### Frontend Scripts
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Backend Scripts
```bash
python main.py                    # Start FastAPI server
uvicorn main:app --reload        # Start with auto-reload
pip install -r requirements.txt  # Install dependencies
```

## 🔗 API Endpoints

### Public Endpoints
- `GET /` - Root endpoint
- `GET /api/health` - Health check
- `POST /api/contact` - Submit contact form
- `GET /api/research/stats` - Research statistics
- `GET /api/market-map` - Market map data

### Admin Endpoints
- `GET /api/contacts` - View all contact submissions

## 🎨 Design Features

### Color Scheme
- **Primary Blue**: `#2563eb`
- **Secondary Blue**: `#1d4ed8`
- **Dark Background**: `#0f172a`
- **Darker Background**: `#0a0f1f`

### UI Components
- **Glassmorphism Cards** - Translucent containers with backdrop blur
- **Gradient Text** - Eye-catching blue gradient text effects
- **Animated Blobs** - Floating background elements
- **Smooth Transitions** - 200-300ms duration animations
- **Hover Effects** - Interactive button and link states

## 🚀 Deployment

### Frontend Deployment (Vercel/Netlify)
1. Build the project: `npm run build`
2. Deploy the `out` or `.next` folder
3. Set environment variables for API endpoints

### Backend Deployment (Railway/Heroku/DigitalOcean)
1. Install dependencies: `pip install -r requirements.txt`
2. Set environment variables
3. Run: `uvicorn main:app --host 0.0.0.0 --port $PORT`

## 🔧 Configuration

### Environment Variables

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Backend (.env):**
```env
ENVIRONMENT=development
API_HOST=0.0.0.0
API_PORT=8000
ALLOWED_ORIGINS=http://localhost:3000
```

## 📞 Contact Form Integration

The contact form on the frontend automatically connects to the Python backend:

1. **User fills out form** on `/contact` page
2. **Form data sent** to `POST /api/contact` endpoint
3. **Backend validates** data using Pydantic models
4. **Data stored** in JSON file (can be extended to database)
5. **Success/error response** sent back to frontend
6. **User sees confirmation** message

## 🛡️ Security Features

- **CORS Protection** - Configured allowed origins
- **Data Validation** - Pydantic models prevent invalid data
- **Error Handling** - Graceful error responses
- **Input Sanitization** - Email validation and required fields

## 📈 Future Enhancements

- **Database Integration** - PostgreSQL/MongoDB for data persistence
- **Authentication** - User login and admin panel
- **Email Notifications** - Automated email responses
- **Analytics** - User behavior tracking
- **CMS Integration** - Content management system
- **SEO Optimization** - Meta tags and structured data

## Data Audit (March 2026)

The Ethereum Market Map data has been audited and corrected:

- **516 entities** across **7 sectors** and **36 subsectors**, fully mapped with sector/subsector assignments
- Corrected sector names (e.g. "DeFi Systems Architecture" standardized) and subsector names (truncations fixed)
- Supabase schema migration available in `supabase/migrations/003_add_entity_sector_mapping.sql` — adds `sector_id`/`subsector_id` foreign keys to the `entities` table and populates them for all 516 entities
- Full gap analysis and deduplication reports in `docs/`
  - `docs/gap_analysis.md` — Supabase vs Google Drive comparison
  - `docs/dedup_report.md` — Deduplication analysis of cross-sector entity references

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

**CanHav Research** - Making understanding and building with ethereum easier for founders, operators, and researchers.
