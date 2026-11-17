
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Accountant from "./pages/Accountant";
import Employee from "./pages/Employee";
import Admin from "./pages/Admin";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/login" element={<Login />} />
                <Route path="/accountant" element={<Accountant />} />
                <Route path="/employee" element={<Employee />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
