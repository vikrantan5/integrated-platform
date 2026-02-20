# HireAI - Integrated Job Portal + AI Interview Platform

A full-stack Next.js application that combines job portal functionality with AI-powered interview assessment.

## 🚀 Features

### For Job Seekers
- **Browse Jobs**: Search and filter job postings by location, tech stack, and status
- **Apply to Jobs**: One-click application submission with optional AI interview
- **AI Interviews**: Take AI-generated interviews tailored to job requirements
- **Interview Feedback**: Receive detailed AI analysis with scores and recommendations
- **Application Tracking**: Monitor all applications and interview statuses
- **Dashboard**: View statistics, pending interviews, and performance history

### For Recruiters
- **Company Management**: Create and manage company profiles
- **Job Posting**: Post jobs with tech stack requirements for AI interview generation
- **Application Management**: View all applicants with AI interview scores
- **AI Analytics**: Review candidate performance with detailed feedback reports
- **Dashboard**: Track jobs, applications, and hiring metrics

### AI Features
- **Smart Question Generation**: AI creates interview questions based on:
  - Job title and role
  - Required tech stack
  - Experience level
  - Job description
- **Intelligent Feedback**: AI analyzes responses and provides:
  - Overall score (0-100)
  - Category scores (Technical, Problem Solving, Communication, Experience)
  - Strengths and areas for improvement
  - Final assessment

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Authentication**: Firebase Auth
- **Database**: Firestore
- **AI**: Google Gemini 3 Flash (via Emergent LLM Key)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui + Radix UI
- **Notifications**: Sonner

## 📁 Project Structure

```
/app
├── (auth)/                 # Authentication pages
│   ├── sign-in/
│   └── sign-up/
├── (jobseeker)/           # Job seeker pages
│   └── jobseeker/
│       ├── jobs/          # Browse and view jobs
│       ├── applications/  # My applications
│       └── dashboard/     # Job seeker dashboard
├── (recruiter)/           # Recruiter pages
│   └── recruiter/
│       ├── dashboard/     # Recruiter dashboard
│       ├── companies/     # Manage companies
│       ├── jobs/          # Manage jobs
│       │   └── new/       # Post new job
│       └── applications/  # View applications
└── interview/             # Interview pages
    └── [id]/
        ├── page.tsx       # Take interview
        └── feedback/      # View feedback
```

## 🔧 Setup & Configuration

### Environment Variables
All environment variables are configured in `.env.local`:
- Firebase credentials (provided)
- Emergent LLM Key for Gemini AI (configured)
- VAPI tokens (mocked for now)

### Running the Application

```bash
# Install dependencies
cd /app/integrated-platform
yarn install

# Run development server
yarn dev

# Build for production
yarn build

# Start production server
yarn start
```

## 📊 Database Schema (Firestore)

### Collections:
1. **users**: User profiles (jobseekers & recruiters)
2. **companies**: Company information
3. **jobs**: Job postings with tech stack
4. **applications**: Job applications linked to interviews
5. **interviews**: AI-generated interview sessions
6. **feedbacks**: AI analysis of interview performance

## 🎯 User Flows

### Job Seeker Flow:
1. Sign up / Sign in
2. Browse jobs → Apply
3. Modal: "Take AI Interview Now" or "Schedule Later"
4. Complete AI interview (mocked voice, type answers)
5. Receive AI feedback with scores
6. Track applications in dashboard

### Recruiter Flow:
1. Sign up / Sign in as recruiter
2. Create company profile
3. Post job with tech stack
4. AI auto-generates interview questions
5. View applications with AI scores
6. Accept/Reject candidates
7. Monitor hiring metrics in dashboard

## 🤖 AI Integration

### Gemini AI Features:
- **Question Generation**: `lib/ai.ts` → `generateInterviewQuestions()`
- **Feedback Analysis**: `lib/ai.ts` → `generateInterviewFeedback()`
- **API**: Uses Emergent LLM Key for seamless integration

### Mocked Features (For Now):
- **VAPI Voice Interview**: Currently type-based, can be integrated with real VAPI when keys are available

## 🔐 Authentication

- Firebase Authentication handles user management
- Role-based access (jobseeker / recruiter)
- Automatic redirection based on user role
- Protected routes for authenticated users only

## 📝 API Actions

Server actions handle all data operations:
- `lib/actions/auth.action.ts`: Authentication
- `lib/actions/job.action.ts`: Job & company management
- `lib/actions/application.action.ts`: Application handling
- `lib/actions/interview.action.ts`: Interview & feedback

## 🎨 UI Components

Using shadcn/ui components:
- Button, Input, Form, Label, Textarea
- Select, Card, Dialog, Badge, Tabs
- Progress, Toast (Sonner)

Custom components:
- Navbar (role-based navigation)
- JobCard (job listings display)
- ApplicationCard (application tracking)

## 🚦 Testing Features

All interactive elements include `data-testid` attributes for testing:
- Forms and inputs
- Buttons and actions
- Dynamic content displays
- Navigation elements

## 📈 Performance

- Build size optimized
- Server-side rendering for dynamic routes
- Static generation for auth pages
- Efficient data fetching with Firebase

## 🔮 Future Enhancements

- Real VAPI integration for voice interviews
- Resume parsing and analysis
- Email notifications
- Advanced analytics dashboard
- Video interview support
- Multi-language support

## 📞 Support

For issues or questions about:
- Firebase configuration
- Gemini AI integration
- VAPI setup
- Deployment

Contact the development team or refer to the integration playbooks.

---

Built with ❤️ using Next.js, Firebase, and AI
