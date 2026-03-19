# PassionSeed - Mockup Documentation

## Overview

This document describes the mockups for PassionSeed's core product features. All mockups are designed for mobile-first (students) with desktop dashboards (parents, counselors).

---

## Tools Selected

| Tool | Purpose | Why |
|------|---------|-----|
| **Figma** | UI/UX Design | Industry standard, collaborative, free tier |
| **v0.dev** | AI-generated prototypes | Rapid prototyping with AI |
| **Replit** | Functional prototypes | Quick deployment, shareable links |

---

## Screen 1: Expert Interview AI Bot

### Purpose
Interface for domain experts to input their knowledge through structured surveys, which AI converts into career quests.

### Key Elements
- **Welcome Screen**: Expert name, domain, estimated time
- **Question Flow**: 10-15 structured questions about their field
- **Progress Bar**: Shows completion status
- **AI Processing**: Visual feedback as AI generates quest
- **Preview**: Expert can review and edit generated quest

### User Flow
```
Expert lands on page → Enters profile info → Answers structured questions → 
AI processes responses → Quest generated → Expert reviews/edits → Publishes
```

### Wireframe Description
- Clean, minimal interface
- One question per screen
- Voice input option for accessibility
- Auto-save progress
- Export as PDF option

---

## Screen 2: Career Quest Interface (Mobile App)

### Purpose
Mobile-first interface for students to browse, start, and complete career quests.

### Key Elements
- **Quest Feed**: Scrollable cards with career categories
- **Quest Detail**: Duration, difficulty, skills learned
- **Progress Tracker**: XP, badges, streaks
- **Interactive Tasks**: Quizzes, simulations, mini-projects
- **Results Screen**: Personalized insights, recommendations

### User Flow
```
Student opens app → Browses quest feed → Selects quest → 
Views intro video → Completes tasks → Earns XP/badges → 
Sees results → Gets career recommendation
```

### Wireframe Description
- Bottom navigation: Home, Explore, Progress, Profile
- Card-based quest display with images
- Gamification elements: XP bar, streak counter
- Dark mode support (Gen Z preference)

---

## Screen 3: Parent Dashboard (LINE Integration)

### Purpose
LINE-based dashboard for parents to track student progress and unlock premium features.

### Key Elements
- **Student Summary**: Name, grade, active quests
- **Progress Report**: Completion rates, time spent
- **Career Insights**: AI-generated recommendations
- **Payment Flow**: PromptPay integration for premium
- **Notifications**: Quest completions, milestones

### User Flow
```
Parent receives LINE notification → Opens dashboard → 
Views student progress → Sees career insights → 
Decides to upgrade → Pays via PromptPay → Accesses premium features
```

### Wireframe Description
- LINE Mini App format
- Simple, text-heavy (parent-friendly)
- Large buttons for key actions
- Thai language primary
- PromptPay QR code integration

---

## Screen 4: Counselor Portal (School Dashboard)

### Purpose
Web dashboard for school counselors to manage students and access insights.

### Key Elements
- **Student List**: Searchable, filterable table
- **Individual Profiles**: Quest history, interests, recommendations
- **Class Overview**: Aggregate data, trends
- **Export Reports**: PDF/Excel for administration
- **Alert System**: Students needing attention

### User Flow
```
Counselor logs in → Views student list → 
Selects student → Reviews profile → 
Sees AI insights → Schedules meeting → 
Exports report for administration
```

### Wireframe Description
- Desktop-first design
- Sidebar navigation
- Data tables with sorting/filtering
- Charts for visual insights
- Bulk actions for efficiency

---

## Screen 5: Onboarding Flow

### Purpose
First-time user experience for students.

### Key Elements
- **Welcome Screen**: Brand intro, value proposition
- **Grade Selection**: M4, M5, M6 (Grade 10-12)
- **Interest Quiz**: Quick assessment of interests
- **First Quest Recommendation**: AI-suggested starting point
- **Profile Setup**: Name, school, goals

### User Flow
```
Student opens app → Sees welcome → Selects grade → 
Takes interest quiz → Gets first quest recommendation → 
Creates profile → Starts first quest
```

---

## Design System

### Colors
| Color | Hex | Usage |
|-------|-----|-------|
| Primary | #6366F1 | Buttons, highlights |
| Secondary | #10B981 | Success, progress |
| Background | #0F172A | Dark mode base |
| Text | #F8FAFC | Primary text |
| Accent | #F59E0B | Warnings, highlights |

### Typography
- **Headings**: Inter Bold
- **Body**: Inter Regular
- **Thai Text**: Sarabun

### Components
- Cards with rounded corners (16px)
- Buttons with subtle shadows
- Progress bars with animations
- Bottom sheet modals

---

## Prototype Links

| Screen | Tool | Status |
|--------|------|--------|
| Expert Interview Bot | Figma | To create |
| Career Quest Mobile | v0.dev | To create |
| Parent Dashboard | Figma | To create |
| Counselor Portal | Figma | To create |

---

## Next Steps

1. Create Figma wireframes for all screens (Week 1)
2. Build interactive prototype in v0.dev (Week 2)
3. User test with 5 students (Week 3)
4. Iterate based on feedback (Week 4)

---

*Last Updated: March 18, 2026*