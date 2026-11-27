import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../holidayApi";

function Login() {
    const [form, setForm] = useState({ email: "", password: "" });
    const [message, setMessage] = useState("");
    const navigate = useNavigate();

    const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
        setForm({ ...form, [e.target.name]: e.target.value });

    const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setMessage("");
        try {
            const user = await login(form.email, form.password);
            if (!user) return setMessage("Invalid email or password.");
            navigate(`/${user.role.toLowerCase()}`);
        } catch (error) {
            console.error("Login error:", error);
            setMessage("Something went wrong. Please try again.");
        }
    };

    return (
        <form className="login" onSubmit={handleLogin}>
            <h1>Log in</h1>

            <label>Email</label>
            <input name="email" type="email" placeholder="Email"
                   value={form.email} onChange={handleChange} />

            <label>Password</label>
            <input name="password" type="password" placeholder="Password"
                   value={form.password} onChange={handleChange} />

            {message && <p className="login-error" role="alert">{message}</p>}
            <button type="submit">Enter dashboard</button>
        </form>
    );
}

export default Login;
