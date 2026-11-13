type Account = {
    id: string;
    title: string;
    accrued: string[];
    used: string[];
    left: string[];
    eligible: string;
};

type Request = {
    id: string;
    account: string;
    dates: string;
    status: string;
    submitted: string;
    decision: string;
};

function Employee() {
    const accounts: Account[] = [];
    const history: Request[] = [];

    return (
        <div className="dashboard">
            <div className="header">
                <p>Employee</p>
                <button>Sign out</button>
            </div>

            <div className="employee-grid">
                <div className="section">
                    <h2>Book holiday</h2>
                    <label>Holiday account</label>
                    <select />
                    <label>Start date</label>
                    <input type="date" />
                    <label>End date</label>
                    <input type="date" />
                    <button>Submit request</button>
                </div>

                {accounts.map((account) => (
                    <div className="section" key={account.id}>
                        <h2>{account.title}</h2>
                        <p>Accrued: {account.accrued.join(" | ")}</p>
                        <p>Used: {account.used.join(" | ")}</p>
                        <p>Left: {account.left.join(" | ")}</p>
                        <p>Eligible: {account.eligible}</p>
                    </div>
                ))}
            </div>

            <div className="section">
                <h2>Request history</h2>
                <table>
                    <thead>
                    <tr>
                        <th>Request ID</th>
                        <th>Account / Dates</th>
                        <th>Status</th>
                        <th>Submitted</th>
                        <th>Decision</th>
                    </tr>
                    </thead>
                    <tbody>
                    {history.map((request) => (
                        <tr key={request.id}>
                            <td>{request.id}</td>
                            <td>{request.account} {request.dates}</td>
                            <td>{request.status}</td>
                            <td>{request.submitted}</td>
                            <td>{request.decision}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Employee;