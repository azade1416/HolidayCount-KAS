import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../mockApi";

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const navigate = useNavigate();

    const handleLogin = async () => {
        try {
            const user = await login(email, password);

            if (!user) {
                alert("Invalid email or password.");
                return;
            }

            const destinations: Record<string, string> = {
                Accountant: "/accountant",
                Admin: "/admin",
                Employee: "/employee"
            };
            navigate(destinations[user.role] ?? "/employee");

        } catch (error) {
            console.error("Login error:", error);
            alert("Something went wrong. Please try again.");
        }
    };

    return (
        <div className="login">
            <h1>Log in</h1>

            <label>Email</label>
            <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />

            <label>Password</label>
            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />

            <button onClick={handleLogin}>
                Enter dashboard
            </button>
        </div>
    );
}

export default Login;
