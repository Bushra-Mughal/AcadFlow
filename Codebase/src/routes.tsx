import Dashboard from './pages/Dashboard';
import Assignments from './pages/Assignments';
import AssignmentDetail from './pages/AssignmentDetail';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Files from './pages/Files';
import AIAssistant from './pages/AIAssistant';
import Achievements from './pages/Achievements';
import ThemeCustomization from './pages/ThemeCustomization';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import type { ReactNode } from 'react';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  /** Accessible without login. Routes without this flag require authentication. Has no effect when RouteGuard is not in use. */
  public?: boolean;
}

export const routes: RouteConfig[] = [
  {
    name: 'Login',
    path: '/login',
    element: <Login />,
    public: true,
    visible: false,
  },
  {
    name: 'Signup',
    path: '/signup',
    element: <Signup />,
    public: true,
    visible: false,
  },
  {
    name: 'Forgot Password',
    path: '/forgot-password',
    element: <ForgotPassword />,
    public: true,
    visible: false,
  },
  {
    name: 'Reset Password',
    path: '/reset-password',
    element: <ResetPassword />,
    public: true,
    visible: false,
  },
  {
    name: 'AI Assistant',
    path: '/',
    element: <AIAssistant />,
  },
  {
    name: 'Dashboard',
    path: '/dashboard',
    element: <Dashboard />,
  },
  {
    name: 'My Assignments',
    path: '/assignments',
    element: <Assignments />,
  },
  {
    name: 'Assignment Detail',
    path: '/assignments/:id',
    element: <AssignmentDetail />,
    visible: false,
  },
  {
    name: 'Team Projects',
    path: '/projects',
    element: <Projects />,
  },
  {
    name: 'Project Detail',
    path: '/projects/:id',
    element: <ProjectDetail />,
    visible: false,
  },
  {
    name: 'My Files',
    path: '/files',
    element: <Files />,
  },
  {
    name: 'Achievements',
    path: '/achievements',
    element: <Achievements />,
  },
  {
    name: 'Theme Customization',
    path: '/theme',
    element: <ThemeCustomization />,
  },
];



