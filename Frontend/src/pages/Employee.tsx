
import { useNavigate } from "react-router-dom";

const accounts = ["Weeks 1–5", "Week 6"];
const rows = ["Accrued holiday", "Used holiday", "Total holiday left"];

function Employee() {
    const navigate = useNavigate();

    return (
        <div style={{ padding: "24px 4%", background: "#f5f6f2", minHeight: "100vh" }}>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 20, marginBottom: 60 }}>
                John Carter　 Employee
                <button onClick={() => navigate("/")}>Sign out</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>

                <div style={{ background: "white", padding: 24 }}>
                    <h2>Book holiday</h2>

                    <label>Holiday account
                        <select style={{ display: "block", width: "100%", padding: 12 }}>
                            {accounts.map(a => <option key={a}>{a}</option>)}
                        </select>
                    </label>

                    <div style={{ display: "flex", gap: 12, margin: "24px 0" }}>
                        <input type="date" />
                        <input type="date" />
                    </div>

                    <button>Submit request</button>
                </div>

                {accounts.map(a => (
                    <div key={a} style={{ background: "white", padding: 24 }}>
                        <h2>{a} Holiday</h2>

                        {rows.map(r => (
                            <div key={r} style={{ padding: "16px 0", borderBottom: "1px solid #ddd" }}>
                                {r}
                                <div style={{ marginTop: 12 }}>
                                    Hours —　 Days —　 DKK —
                                </div>
                            </div>
                        ))}

                        <p>Eligible date of use　—</p>
                    </div>
                ))}
            </div>

            <div style={{ background: "white", marginTop: 24, padding: 24 }}>
                <h2>Request history</h2>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", padding: 12 }}>
                    {["Request ID", "Account / dates", "Status", "Submitted date", "Decision date"].map(x => (
                        <span key={x}>{x}</span>
                    ))}
                </div>
            </div>

        </div>
    );
}

export default Employee;
