import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

import AppLayout from "../layouts/AppLayout";
import { Navigate } from "react-router-dom";

const Login = lazy(() => import("../pages/Login/Login"));
const Dashboard = lazy(() => import("../pages/Dashboard/Dashboard"));
const Courses = lazy(() => import("../pages/courses/Courses"));
const Flashcards = lazy(() => import("../pages/Flashcards/Flashcards"));
const Quiz = lazy(() => import("../pages/Quiz/Quiz"));
const Planning = lazy(() => import("../pages/Planning/Planning"));
const Todo = lazy(() => import("../pages/Todo/Todo"));
const VerifyEmail = lazy(() => import("../pages/VerifyEmail/VerifyEmail"));
const ResetPassword = lazy(() => import("../pages/ResetPassword/ResetPassword"));
const Forum = lazy(() => import("../pages/Forum/Forum")); 

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppRoutes() {
  const defaultRoute = localStorage.getItem("token") ? "/dashboard" : "/";

  return (
  <Suspense fallback={<div className="min-h-screen grid place-items-center font-bold text-[#8B6CF6]">Chargement...</div>}>
  <Routes>
    <Route path="/" element={<Login />} />
    <Route path="/verify-email/:uid/:token" element={<VerifyEmail />} />
    <Route path = "/verify-email/:uid/:token/" element={<VerifyEmail />} />
    <Route path = "/reset-password/:uid/:token" element={<ResetPassword />} />
    <Route path = "/reset-password/:uid/:token/" element={<ResetPassword />} />
    
    <Route
      element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }
    > 
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/courses" element={<Courses />} />
      <Route path="/flashcards" element={<Flashcards />} />
      <Route path="/quiz" element={<Quiz />} />
      <Route path="/planning" element={<Planning />} />
      <Route path="/todo" element={<Todo />} />
      <Route path="/forum" element={<Forum />} />
    </Route>
    <Route path="*" element={<Navigate to={defaultRoute} replace />} />
  </Routes>
  </Suspense>
);
}
export default AppRoutes;

