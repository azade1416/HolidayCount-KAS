import { useState } from "react";
import CreateEmployee from "./CreateEmployee";
import { useNavigate } from "react-router-dom";

type Request = {
    id: string;
    employee: string;
    dates: string;
    status: string;
    submittedDate: string;
};

function Accountant() {
    const [showModal, setShowModal] = useState(false);
    const navigate = useNavigate();

    const requests: Request[] = [];
    const history: Request[] = [];

    return (
        <div className="dashboard">
            <div className="header">
                <p>Accountant</p>
                <button onClick={() => navigate("/login")}>
                    Sign out
                </button>
                <button onClick={() => setShowModal(true)}>Create Employee Account</button>
                <button>Final Settlement</button>
            </div>

            {showModal && <CreateEmployee onClose={() => setShowModal(false)} />}

            {[["Requests", requests], ["Completed History", history]].map(([title, data]) => (
                <div className="section">
                    <h2>{title}</h2>
                    {(data as Request[]).map((r) => (
                        <div className="table-row" key={r.id}>
                            <p>{r.id}</p>
                            <p>{r.employee}</p>
                            <p>{r.dates}</p>
                            <p>{r.status}</p>
                            <p>{r.submittedDate}</p>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

export default Accountant;