import { Routes, Route } from "react-router-dom";

import Login from "../pages/Login/Login";
import Dashboard from "../pages/Dashboard/Dashboard";
import Courses from "../pages/courses/Courses";
import Flashcards from "../pages/Flashcards/Flashcards";
import Quiz from "../pages/Quiz/Quiz";
import Planning from "../pages/Planning/Planning";
import Todo from "../pages/Todo/Todo";
import AppLayout from "../layouts/AppLayout";
import { Navigate } from "react-router-dom";
import VerifyEmail from "../pages/VerifyEmail/VerifyEmail";
import ResetPassword from "../pages/ResetPassword/ResetPassword";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
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
      
    </Route>
  </Routes>
);
}
export default AppRoutes;



