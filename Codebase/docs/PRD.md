# Requirements Document

## 1. Application Overview

### 1.1 Application Name
AcadFlow

### 1.2 Application Description
A modern, clean, and student-friendly web application designed to help university students manage their assignments, collaborate on team projects, track activities, and get AI-powered assistance for learning and content analysis.

## 2. Users and Usage Scenarios

### 2.1 Target Users
University students

### 2.2 Core Usage Scenarios
- Managing solo assignments and team projects with deadline tracking
- Collaborating with team members on group projects
- Getting AI assistance for studying and understanding course materials
- Analyzing draft work before submission to improve quality
- Tracking progress and activities across all academic tasks

## 3. Page Structure and Functionality

### 3.1 Overall Structure
```
AcadFlow Application
â”œâ”€â”€ Sign In Page
â”œâ”€â”€ Forgot Password Page
â”œâ”€â”€ Reset Password Confirmation Page
â”œâ”€â”€ Reset Password Page
â”œâ”€â”€ Fixed Left Sidebar Navigation
â”‚   â”œâ”€â”€ Dashboard
â”‚   â”œâ”€â”€ My Assignments
â”‚   â”œâ”€â”€ Team Projects
â”‚   â”œâ”€â”€ My Files
â”‚   â”œâ”€â”€ AI Assistant
â”‚   â”œâ”€â”€ AI Analyzer
â”‚   â”œâ”€â”€ Activity Log
â”‚   â””â”€â”€ Theme Settings
â”œâ”€â”€ Dashboard Page
â”œâ”€â”€ My Assignments Page
â”œâ”€â”€ Team Projects Page
â”œâ”€â”€ My Files Page
â”œâ”€â”€ AI Assistant Page
â”œâ”€â”€ AI Analyzer Page
â”œâ”€â”€ Activity Log Page
â””â”€â”€ Theme Settings Page
    â”œâ”€â”€ Basic Tab
    â””â”€â”€ Cinematic Themes Tab
```

### 3.2 Sign In Page
- Display username and password input fields
- Provide Sign In button
- Display Forgot password? link below password field
- Clicking Forgot password? link navigates to Forgot Password Page
- Use minimal aesthetic with airy whitespace and restrained design

### 3.3 Forgot Password Page
- Display username input field with label Enter your username
- Provide Send Reset Email button
- When user submits username, system derives email address by appending @miaoda.com to username
- System sends password reset email via Supabase to derived email address
- After sending email, navigate to Reset Password Confirmation Page
- Use minimal aesthetic with airy whitespace and restrained design
- No decorative colors

### 3.4 Reset Password Confirmation Page
- Display confirmation message: Password reset email sent. Please check your inbox.
- Provide Return to Sign In link
- Use minimal aesthetic with airy whitespace and restrained design

### 3.5 Reset Password Page
- Accessed via redirect link from password reset email
- Display new password input field
- Display confirm password input field
- Provide Reset Password button
- After successful password reset, navigate to Sign In Page
- Use minimal aesthetic with airy whitespace and restrained design
- No decorative colors

### 3.6 Fixed Left Sidebar Navigation
- Display navigation menu with 8 main sections in order: Dashboard, My Assignments, Team Projects, My Files, AI Assistant, AI Analyzer, Activity Log, Theme Settings
- Highlight current active page
- Remain fixed and visible across all pages

### 3.7 Dashboard Page
- Display upcoming deadlines section showing assignments and projects due soon
- Show progress overview with separate tracking for solo assignments and team projects
- Present quick stats including total tasks, completed tasks, in-progress tasks, and overdue items
- Display rank bar showing current user rank and badge earned
- Rank bar includes visual progress indicator showing points earned toward next rank
- Display current badge icon alongside or within rank bar component
- Provide Share to LinkedIn button allowing users to share their current rank and badge as achievement post
- Use cards layout with clean spacing and modern design

### 3.8 My Assignments Page
- Display list of all solo assignments
- Show assignment details: title, course, due date, priority, weightage, status
- Support status categories: Queue, In Progress, Review, Completed
- Provide Add Assignment button with two input methods:
  - Manual Add: Form with fields for title, course, due date, priority, weightage, description
  - Smart Paste: Text input area where users paste content from Teams, WhatsApp, or Email, and AI automatically extracts and fills title, due date, and description
- Allow editing and deleting assignments
- Display activity tracking information showing who viewed, opened, or edited each assignment with timestamps

### 3.9 Team Projects Page
- Display list of all team projects
- Show project details: title, course, due date, priority, weightage, status, team members
- Support status categories: Queue, In Progress, Review, Completed
- Provide Add Team Project button with two input methods:
  - Manual Add: Form with fields for title, course, due date, priority, weightage, description, and invite members by email
  - Smart Paste: Text input area where users paste content and AI automatically extracts project information
- Display project members list for each project
- Show activity tracking visible to all team members, indicating who viewed, opened, or edited the project with timestamps
- Allow editing and deleting projects

### 3.10 My Files Page
- Display all uploaded files organized by type: PDFs, PPTs, images, notes, documents
- Provide Create Folder button to create new folders for organizing files
- Support nested folder structure allowing folders within folders
- Allow users to move files into folders via drag-and-drop or move action
- Display folder hierarchy with expandable/collapsible folder tree
- Support file upload functionality
- Allow file preview and download
- Show file metadata: name, upload date, size, associated assignment or project

### 3.11 AI Assistant Page
- Provide chat interface for 24/7 AI Tutor
- AI can access and read all uploaded files from My Files
- Users can ask questions related to assignments, concepts, and course materials
- Display conversation history
- AI responses formatted with clean structure using headings, bullet lists, and numbered steps where appropriate
- Output avoids excessive punctuation such as ellipses, em-dashes, or mid-sentence breaks
- Focus on readability and clear presentation

### 3.12 AI Analyzer Page
- Provide input area for users to upload or paste draft work: text, documents, code, reports
- After submission, AI performs thorough analysis and displays:
  - Grammar and spelling mistakes with specific examples
  - Structural weaknesses and suggestions
  - Content quality feedback
  - Suggestions for improvement
  - Clarity and flow rating
  - Plagiarism or AI-generated content risk level
  - Overall score out of 100
  - Ready to Submit recommendation: Yes or No with reasoning
- At the end of analysis, recommend best free tools for deeper checking: Grammarly, QuillBot, ZeroGPT, Scribbr
- Display results in organized sections with constructive and helpful tone

### 3.13 Activity Log Page
- Display chronological list of all activities across assignments and team projects
- Show activity details: user name, action type (viewed, opened, edited), timestamp, related assignment or project
- Support filtering by date range, user, or activity type

### 3.14 Theme Settings Page
- Display two tabs: Basic and Cinematic Themes
- Allow users to switch between tabs
- Active theme settings apply app-wide across all pages

#### 3.14.1 Basic Tab
- Retain all existing theme controls including color pickers, preset themes, and customization options
- When Basic theme is active, no animated background effects are displayed

#### 3.14.2 Cinematic Themes Tab
- Display list of cinematic theme presets with preview cards
- Provide at least 5 cinematic theme options:
  - The Matrix: deep black and green color palette, monospace font, falling green code rain animation in background, sharp button edges
  - Interstellar: dark navy and gold color palette, cinematic wide fonts, slow drifting star particles animation, subtle wormhole glow effect
  - Tron Legacy: black and cyan neon color palette, sharp geometric shapes, grid lines animation in background, glowing borders
  - Blade Runner 2049: orange and teal noir color palette, hazy glow effects, dust particle animation, serif fonts
  - Inception: deep blue and silver color palette, rotating geometric shapes animation in background, layered shadows
- Each cinematic theme changes entire UI including background, cards, text, buttons, borders, button shapes, font sizes, and font weights
- Each cinematic theme includes animated background layer with abstract geometric shapes, particles, code patterns, or ambient moving objects
- Animated background layer is fixed and runs app-wide when cinematic theme is active
- Animations include only abstract elements: geometric shapes, particles, code rain, grid lines, stars, dust, rotating shapes
- No human figures, no character illustrations, no girl images in any animation
- Each cinematic theme includes customization panel with controls for:
  - Primary accent color picker
  - Background intensity slider (controls density of animations)
  - Animation speed selector: slow, medium, fast
  - Font style override dropdown
- Switching from Cinematic Themes back to Basic removes all animated background effects

## 4. Business Rules and Logic

### 4.1 Password Reset Flow
- User clicks Forgot password? link on Sign In Page
- User enters username on Forgot Password Page
- System derives email address by appending @miaoda.com to entered username
- System sends password reset email to derived email address using Supabase
- User receives email with password reset link
- User clicks link in email and is redirected to Reset Password Page
- User enters new password and confirms password
- System validates password match and updates password
- User is redirected to Sign In Page to sign in with new password

### 4.2 Assignment and Project Status Flow
- New items default to Queue status
- Users can manually change status to In Progress, Review, or Completed
- Status changes are tracked in activity log

### 4.3 Team Collaboration Rules
- Team members invited by email receive access to the specific team project
- All team members can view, edit, and track activities for shared projects
- Activity tracking is visible to all project members in real-time

### 4.4 Activity Tracking Logic
- System automatically records when a user views, opens, or edits an assignment or project
- Activity entries include user name and timestamp
- Activities are displayed in format: Viewed by: Ali (2 hours ago), Sara (Yesterday)

### 4.5 AI Assistant Access
- AI Assistant has read access to all files uploaded in My Files section
- AI can reference file content when answering user questions

### 4.6 AI Analyzer Scoring
- Overall score calculated out of 100 based on grammar, structure, content quality, clarity, and originality
- Ready to Submit recommendation given as Yes or No with clear reasoning
- Feedback tone must be constructive, helpful, and not harsh

### 4.7 Deadline Notifications
- System sends notifications for upcoming deadlines
- Notifications appear for assignments and projects due within 24 hours, 3 days, and 1 week

### 4.8 Progress Calculation
- Solo progress calculated as: (Completed Assignments / Total Assignments) Ã— 100
- Team progress calculated as: (Completed Team Projects / Total Team Projects) Ã— 100
- Overall progress shown on Dashboard with visual indicators

### 4.9 Folder Management Rules
- Users can create folders and nested subfolders in My Files
- Files can be moved into folders
- Deleting a folder prompts user to confirm; all files and subfolders within are deleted or moved to parent location based on user choice

### 4.10 Point System Rules
- Users earn points for completing various actions:
  - Submitting assignment before deadline: 50 points
  - Submitting assignment on deadline day: 30 points
  - Completing assignment after deadline: 10 points
  - Changing assignment status to Completed: 20 points
  - Completing team project before deadline: 70 points
  - Completing team project on deadline day: 50 points
  - Inviting team member to project: 15 points
  - Updating project status to In Progress or Review: 10 points
  - Uploading file to My Files: 5 points
  - Editing file or assignment: 5 points
  - Using AI Assistant for study help: 10 points per session
  - Using AI Analyzer and receiving Ready to Submit: Yes: 25 points
- Points are displayed in user profile and contribute to rank progression
- Users can view detailed point history showing how points were earned

### 4.11 Ranking System Rules
- Ranks are awarded based on cumulative points with progressively increasing thresholds:
  - Rank 1 (Beginner): 0-100 points
  - Rank 2 (Learner): 101-250 points
  - Rank 3 (Achiever): 251-500 points
  - Rank 4 (Expert): 501-1000 points
  - Rank 5 (Master): 1001-2000 points
  - Rank 6 (Champion): 2001-4000 points
  - Rank 7 (Legend): 4001+ points
- Each rank has associated badge icon
- Rank bar on Dashboard displays current rank, badge, points earned, and points needed for next rank
- Rank bar uses improved visual design with gradient colors, progress animation, and clear labeling

### 4.12 Achievement Badge and LinkedIn Sharing
- Current rank and badge are displayed on Dashboard within or alongside rank bar component
- Users can click Share to LinkedIn button to post achievement
- Shared post includes rank name, badge icon, and total points earned
- Sharing action generates formatted LinkedIn post content

### 4.13 Theme Application Rules
- Selected theme applies immediately across entire application
- Theme settings persist across user sessions
- When Basic theme is active, application displays standard UI without animated backgrounds
- When Cinematic theme is active, animated background layer runs continuously in fixed background layer across all pages
- Switching between themes updates all UI elements including colors, fonts, button shapes, and animations
- Cinematic theme customization settings (accent color, background intensity, animation speed, font style) apply only to active cinematic theme
- Customization changes take effect immediately

## 5. Exceptions and Boundary Cases

| Scenario | Handling |
|----------|----------|
| User enters non-existent username on Forgot Password Page | System still sends confirmation message to avoid revealing whether username exists |
| Password reset email not received | User can return to Forgot Password Page and request new reset email |
| Password reset link expired | System displays error message and provides link to request new reset email |
| User enters mismatched passwords on Reset Password Page | System displays error message and prompts user to re-enter matching passwords |
| User pastes unstructured text in Smart Paste | AI attempts best-effort extraction; if unable to identify key fields, prompts user to use manual add or provide clearer text |
| No files uploaded when using AI Assistant | AI Assistant responds based on general knowledge and informs user that no files are available for reference |
| User uploads unsupported file type | System displays error message and lists supported file types |
| Team member email does not exist | System sends invitation email; if email bounces, notifies project creator |
| AI Analyzer receives empty or very short input | System prompts user to provide sufficient content for meaningful analysis |
| Multiple users edit same project simultaneously | System saves all changes with timestamps and shows activity log entries for each edit |
| User tries to delete assignment with activity history | System allows deletion and archives activity log entries |
| User tries to delete folder containing files | System prompts user to confirm deletion and choose whether to delete all contents or move files to parent folder |
| User tries to move folder into its own subfolder | System prevents action and displays error message |
| User reaches maximum rank | Rank bar displays Legend status and continues to show total points earned without further rank progression |
| LinkedIn sharing fails due to network error | System displays error message and allows user to retry |
| User switches theme while animations are running | System smoothly transitions to new theme and stops previous animations |
| User sets background intensity to maximum | System ensures animations remain performant and do not impact application responsiveness |

## 6. Acceptance Criteria

1. Sign In Page displays username and password fields with Forgot password? link
2. Clicking Forgot password? link navigates to Forgot Password Page
3. Forgot Password Page displays username input field and Send Reset Email button
4. System derives email address by appending @miaoda.com to entered username
5. System sends password reset email via Supabase to derived email address
6. After sending email, user is navigated to Reset Password Confirmation Page
7. Reset Password Confirmation Page displays confirmation message and Return to Sign In link
8. Password reset email contains link to Reset Password Page
9. Reset Password Page displays new password and confirm password fields with Reset Password button
10. System validates password match and updates password
11. After successful password reset, user is redirected to Sign In Page
12. Forgot password flow uses minimal aesthetic with airy whitespace, restrained design, and no decorative colors
13. Application displays fixed left sidebar navigation on all pages with 8 menu items in order: Dashboard, My Assignments, Team Projects, My Files, AI Assistant, AI Analyzer, Activity Log, Theme Settings
14. Theme Settings page displays two tabs: Basic and Cinematic Themes
15. Basic tab retains all existing theme controls and functionality
16. Cinematic Themes tab displays at least 5 cinematic theme presets: The Matrix, Interstellar, Tron Legacy, Blade Runner 2049, Inception
17. Each cinematic theme changes entire UI color palette, button shapes, font sizes, and font weights
18. Each cinematic theme includes animated background layer with abstract geometric shapes, particles, or code patterns
19. Animated backgrounds contain no human figures, no character illustrations, no girl images
20. Each cinematic theme includes customization panel with controls for primary accent color, background intensity, animation speed, and font style override
21. Selecting a cinematic theme applies animations app-wide in fixed background layer
22. Switching from Cinematic Themes to Basic removes all animated background effects
23. Theme settings persist across user sessions
24. Dashboard shows upcoming deadlines, progress overview for solo and team work, quick stats, rank bar with current rank and badge, and Share to LinkedIn button
25. Rank bar displays current rank name, badge icon, points earned, and visual progress indicator toward next rank with improved design
26. Share to LinkedIn button generates formatted achievement post including rank, badge, and total points
27. My Assignments page allows adding assignments via manual form and Smart Paste with AI auto-fill
28. Team Projects page allows adding projects, inviting members by email, and displays member list
29. Activity tracking automatically records and displays view, open, and edit actions with user names and timestamps
30. All team members can see activity log for shared team projects
31. My Files page displays uploaded files organized by type and includes Create Folder button
32. Users can create folders and nested subfolders in My Files
33. Users can move files into folders via drag-and-drop or move action
34. Folder hierarchy displays with expandable/collapsible tree structure
35. My Files supports upload, preview, and download functionality
36. AI Assistant provides chat interface with clean, structured output using headings, bullet lists, and numbered steps
37. AI Assistant output avoids excessive punctuation and focuses on readability
38. AI Assistant can answer questions based on uploaded files
39. AI Analyzer thoroughly analyzes submitted work and provides grammar check, structural feedback, content quality assessment, clarity rating, plagiarism risk level, overall score out of 100, and Ready to Submit recommendation
40. AI Analyzer recommends free tools: Grammarly, QuillBot, ZeroGPT, Scribbr at end of analysis
41. Activity Log page displays chronological list of all activities with filtering options
42. System sends notifications for upcoming deadlines
43. Progress indicators display completion percentages with visual elements
44. Point system awards points for time management actions, project management actions, and task completion as defined in business rules
45. Users can view detailed point history showing how points were earned
46. Ranking system uses progressively increasing point thresholds for each rank level
47. Design follows modern, minimal style with deep blue and purple accents, clean cards, and good spacing
48. Application is intuitive and easy to use for university students

## 7. Out of Scope for This Release

- Calendar integration with external platforms
- Mobile native applications
- Real-time chat between team members
- Video or audio file support in AI Assistant
- Advanced plagiarism detection beyond risk level indication
- Export functionality for reports or analytics
- Integration with university learning management systems
- Gamification features beyond ranking and badges such as leaderboards or challenges
- Offline mode support
- Automated point deduction for late submissions
- Social features such as following other users or public profiles
- Custom cinematic theme creation by users
- Importing or exporting theme configurations
- Theme marketplace or sharing themes with other users
- Two-factor authentication
- Password strength requirements or validation rules
- Account recovery via security questions

