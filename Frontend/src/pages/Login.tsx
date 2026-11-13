import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
    const [role, setRole] = useState("Employee");
    const navigate = useNavigate();

    return (
        <div className="login">
            <h1>Log in</h1>

            <button onClick={() => setRole("Employee")}>Employee</button>
            <button onClick={() => setRole("Accountant")}>Accountant</button>

            <label>Email</label>
            <input type="email" placeholder="Email" />

            <label>Password</label>
            <input type="password" placeholder="Password" />

            <button onClick={() =>
                navigate(role === "Accountant" ? "/accountant" : "/employee")
            }>
                Enter dashboard
            </button>
        </div>
    );
}

export default Login;