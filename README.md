# 🎤 Aura Voice AI - Frontend

Frontend application for Aura Voice AI - Create and train your own personalized voice chatbot.

## 🚀 Features

- **Voice Chat Interface** - Natural voice conversations with AI
- **User Profiles** - Explore and interact with different AI personalities
- **Training Dashboard** - Train your AI with text, files, and voice samples
- **Widget Generator** - Embeddable chatbot code for websites
- **Real-time Updates** - Live chat status and training progress
- **Multi-tenant Support** - Secure user isolation and data management

## 🛠️ Tech Stack

- **React 18** - Modern frontend framework
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls
- **Supabase** - Real-time database and authentication
- **Modern CSS** - Responsive design with CSS Grid/Flexbox

## 📋 Prerequisites

- **Node.js** (version 16 or higher)
- **npm** (version 8 or higher)
- **Supabase account** (for database and real-time features)

## ⚡ Quick Start

### 1. Clone and Setup
```bash
git clone <your-repo-url>
cd aura-frontend
npm install
```

### 2. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your actual values
nano .env
```

Required environment variables:
- `REACT_APP_API_BASE_URL` - Your FastAPI backend URL
- `REACT_APP_SUPABASE_URL` - Your Supabase project URL  
- `REACT_APP_SUPABASE_ANON_KEY` - Your Supabase anonymous key

### 3. Development Server
```bash
npm start
```

The app will open at `http://localhost:3000`

### 4. Production Build
```bash
npm run build
npm run serve
```

## 🔧 Available Scripts

- `npm start` - Run development server
- `npm run build` - Build for production
- `npm test` - Run test suite
- `npm run serve` - Serve production build locally

## 📁 Project Structure

```
aura-frontend/
├── public/                 # Static assets
│   ├── index.html         # HTML template
│   └── manifest.json      # PWA manifest
├── src/                   # Source code
│   ├── components/        # React components
│   │   ├── auth/         # Login/Register
│   │   ├── dashboard/    # User dashboard
│   │   ├── explore/      # User exploration
│   │   └── common/       # Shared components
│   ├── hooks/            # Custom React hooks
│   ├── services/         # API services
│   ├── styles/           # CSS files
│   ├── utils/            # Utility functions
│   ├── App.js            # Main app component
│   └── index.js          # App entry point
├── .env                  # Environment variables
├── .env.example          # Environment template
└── package.json          # Dependencies
```

## 🔌 API Integration

The frontend connects to your FastAPI backend running at:
- **Production**: `https://api.iaura.ai`
- **Development**: `http://localhost:8000`

### Key API Endpoints
- `POST /auth/login` - User authentication
- `GET /users` - List all users
- `GET /users/{slug}` - Get user by slug
- `POST /chatbot/train` - Train AI model
- `POST /voice/chat/{slug}` - Voice chat endpoint

## 🗄️ Database Integration

Uses Supabase for:
- **Real-time chat updates**
- **Live training progress**  
- **File upload status**
- **Dashboard metrics**

The app works with your existing FastAPI + Supabase architecture.

## 🎨 Customization

### Colors and Styling
- Main styles in `src/styles/globals.css`
- Component-specific styles in respective folders
- CSS custom properties for easy theme changes

### Configuration
- Feature flags in `.env` file
- UI settings (pagination, refresh rates) configurable
- Debug mode for development

## 📱 PWA Support

The app includes Progressive Web App features:
- **Offline functionality** (service worker)
- **Install prompt** on mobile devices
- **App-like experience** on phones/tablets

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel --prod
```

### Netlify
```bash
npm run build
# Upload build/ folder to Netlify
```

### Traditional Hosting
```bash
npm run build
# Upload build/ folder to your web server
```

## 🔒 Security

- Environment variables for sensitive data
- HTTPS required for production
- Supabase Row Level Security (RLS) policies
- Input validation and sanitization

## 🐛 Troubleshooting

### Common Issues

**1. npm install fails**
```bash
# Clear npm cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**2. Environment variables not loading**
- Ensure variables start with `REACT_APP_`
- Restart development server after changing .env
- Check .env file is in project root

**3. API connection issues**
- Verify backend is running
- Check CORS settings on backend
- Confirm API URL in .env file

**4. Supabase connection problems**
- Verify Supabase URL and key in .env
- Check Supabase project is active
- Ensure RLS policies allow access

## 📝 Development Guidelines

### Code Style
- Use functional components with hooks
- Follow React best practices
- Keep components small and focused
- Use descriptive variable names

### File Organization
- Group related components in folders
- Keep styles close to components
- Use absolute imports for common utilities
- Maintain clean separation of concerns

### Performance
- Lazy load routes and heavy components
- Optimize images and assets
- Use React.memo for expensive renders
- Monitor bundle size with build analyzer

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Create GitHub issues for bugs and feature requests
- **Questions**: Contact the development team

## 🔄 Changelog

### Version 0.1.0 (Initial Release)
- ✅ User authentication system
- ✅ Voice chat interface
- ✅ AI training dashboard  
- ✅ Widget code generator
- ✅ Responsive design
- ✅ Supabase integration
- ✅ PWA support

---

**Built with ❤️ by the Aura Team**