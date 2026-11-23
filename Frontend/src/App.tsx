
import { useEffect, useState, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { getCurrentUser } from "./holidayApi";
import Login from "./pages/Login";
import Accountant from "./pages/Accountant";
import Employee from "./pages/Employee";
import Admin from "./pages/Admin";

function ProtectedRoute({ children, role }: { children: ReactNode; role: "Employee" | "Accountant" | "Admin" }) {
    const [userRole, setUserRole] = useState<string | null>(null);
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        getCurrentUser().then(user => {
            setUserRole(user?.role ?? null);
            setChecked(true);
        });
    }, []);

    if (!checked) return <p>Loading...</p>;
    if (!userRole) return <Navigate to="/login" replace />;
    return userRole === role ? children : <Navigate to={`/${userRole.toLowerCase()}`} replace />;
}

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/login" element={<Login />} />
                <Route path="/accountant" element={<ProtectedRoute role="Accountant"><Accountant /></ProtectedRoute>} />
                <Route path="/employee" element={<ProtectedRoute role="Employee"><Employee /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute role="Admin"><Admin /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
