type Props = {
    onClose: () => void;
};

function CreateEmployee({ onClose }: Props) {
    return (
        <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header">
                    <h3>Create employee account</h3>
                </div>
                

                <form onSubmit={(e) => {
                    e.preventDefault();
                    onClose();
                }}>
                    <label>Full name</label>
                    <input type="text" required />

                    <label>Email</label>
                    <input type="email" required />

                    <label>Password</label>
                    <input type="password" required />

                    <label>Role</label>
                    <select>
                        <option>Full-time salaried employee</option>
                        <option> Part-time salaried employee</option>
                            <option>Hourly worker</option>
                                <option>Paid intern</option>
                        <option>Accountant</option>
                    </select>

                    <div className="modal-buttons">
                        <button type="button" onClick={onClose}>Cancel</button>
                        <button type="submit">Create account</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CreateEmployee;