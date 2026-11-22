
import { useEffect, useState, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { getCurrentUser } from "./api";
import Login from "./pages/Login";
import Accountant from "./pages/Accountant";
import Employee from "./pages/Employee";
import Admin from "./pages/Admin";

function ProtectedRoute({ children }: { children: ReactNode }) {
    const [authenticated, setAuthenticated] = useState<boolean | null>(null);

    useEffect(() => {
        getCurrentUser().then(user => setAuthenticated(Boolean(user)));
    }, []);

    if (authenticated === null) return <p>Loading...</p>;
    return authenticated ? children : <Navigate to="/login" replace />;
}

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/login" element={<Login />} />
                <Route path="/accountant" element={<ProtectedRoute><Accountant /></ProtectedRoute>} />
                <Route path="/employee" element={<ProtectedRoute><Employee /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
