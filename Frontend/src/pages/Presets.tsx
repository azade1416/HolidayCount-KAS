import { useState, type FormEvent } from "react";

const fields = {
    weeks1To5HoursPerYear: "Weeks 1–5 entitlement (full-time hours per year)",
    week6HoursPerYear: "Week 6 entitlement (full-time hours per year)",
    mainHolidayNoticeMonths: "Main holiday notice (months)",
    otherHolidayNoticeMonths: "Other holiday notice (months)"
};

type Key = keyof typeof fields;
type Settings = Record<Key, number>;
type Parameter = { key: string; value: number | boolean; effectiveFrom: string };
type RulePreset = { id: string; name: string; settings: Settings };

const defaultPreset: RulePreset = {
    id: "business-esbjerg",
    name: "Business Esbjerg defaults",
    settings: { weeks1To5HoursPerYear: 185, week6HoursPerYear: 37, mainHolidayNoticeMonths: 3, otherHolidayNoticeMonths: 1 }
};

const historyLabels: Record<string, string> = {
    ...fields,
    weeks1To5DaysPerMonth: "Weeks 1–5 days earned per month",
    week6HoursPerMonth: "Week 6 hours earned per month",
    week6Enabled: "Enable Week 6",
    transfersEnabled: "Allow holiday transfer"
};

const rulesKey = "holidaycount.systemParameters";
const presetsKey = "holidaycount.namedRulePresets";
const keys = Object.keys(fields) as Key[];

function readSaved<T>(key: string): T[] {
    return JSON.parse(localStorage.getItem(key) ?? "[]");
}

export default function Presets({ onClose }: { onClose: () => void }) {
    const [presets, setPresets] = useState(() => readSaved<RulePreset>(presetsKey));
    const [presetId, setPresetId] = useState(defaultPreset.id);
    const [presetName, setPresetName] = useState("");
    const [presetMessage, setPresetMessage] = useState("");
    const [settings, setSettings] = useState(defaultPreset.settings);
    const [effectiveFrom, setEffectiveFrom] = useState("");
    const [parameters, setParameters] = useState(() => readSaved<Parameter>(rulesKey));
    const [message, setMessage] = useState("");
    const availablePresets = [defaultPreset, ...presets];

    function savePreset() {
        const name = presetName.trim();
        if (!name || !keys.every(key => Number.isFinite(settings[key]) && settings[key] >= 0)) {
            return setPresetMessage("Enter a name and a valid value for each setting.");
        }
        try {
            const saved = readSaved<RulePreset>(presetsKey);
            if ([defaultPreset, ...saved].some(preset => preset.name.toLowerCase() === name.toLowerCase())) {
                setPresets(saved);
                return setPresetMessage("A preset with that name already exists.");
            }
            const preset = { id: crypto.randomUUID(), name, settings };
            const next = [...saved, preset];
            localStorage.setItem(presetsKey, JSON.stringify(next));
            setPresets(next);
            setPresetId(preset.id);
            setPresetName("");
            setPresetMessage("Preset saved.");
        } catch {
            setPresetMessage("Could not save the preset in this browser.");
        }
    }

    function saveRules(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Copenhagen" });
        if (effectiveFrom <= today) {
            return setMessage("Choose a future start date.");
        }
        try {
            const saved = readSaved<Parameter>(rulesKey);
            if (saved.some(row => row.effectiveFrom === effectiveFrom && keys.some(key => key === row.key))) {
                setParameters(saved);
                return setMessage("A rule set is already saved for that date.");
            }
            const next = [...saved, ...keys.map(key => ({ key, value: settings[key], effectiveFrom }))];
            localStorage.setItem(rulesKey, JSON.stringify(next));
            setParameters(next);
            setMessage("Rule set saved in this browser.");
        } catch {
            setMessage("Could not save rules in this browser.");
        }
    }

    return (
        <div className="modal-overlay">
            <div className="modal presets-modal" role="dialog" aria-modal="true" aria-labelledby="presets-title">
                <h3 id="presets-title">Holiday presets</h3>
                <p>Preview only. Presets and rules are saved in this browser.</p>
                <label>
                    Load preset{" "}
                    <select value={presetId} onChange={event => {
                        const selected = availablePresets.find(preset => preset.id === event.target.value);
                        if (!selected) return;
                        setPresetId(selected.id);
                        setSettings(selected.settings);
                        setPresetMessage("");
                        setMessage("");
                    }}>
                        <option value="" disabled>Choose a preset</option>
                        {availablePresets.map(preset => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
                    </select>
                </label>
                <form onSubmit={saveRules}>
                    <h3>System parameters</h3>
                    {keys.map(key => (
                        <label key={key}>
                            {fields[key]}{" "}
                            <input type="number" min="0" step="any" required value={Number.isNaN(settings[key]) ? "" : settings[key]}
                                onChange={event => {
                                    setSettings({ ...settings, [key]: event.target.valueAsNumber });
                                    setPresetId("");
                                }} />
                        </label>
                    ))}
                    <p>Enter 0 hours for Week 6 to disable it.</p>
                    <label>
                        Preset name{" "}
                        <input value={presetName} onChange={event => setPresetName(event.target.value)} />
                    </label>
                    <button className="admin-button" type="button" onClick={savePreset}>Save as preset</button>
                    {presetMessage && <p role="status">{presetMessage}</p>}
                    <label>
                        Effective from{" "}
                        <input type="date" required value={effectiveFrom}
                            onChange={event => setEffectiveFrom(event.target.value)} />
                    </label>
                    {message && <p role="status">{message}</p>}
                    <div className="modal-buttons">
                        <button className="admin-button" type="submit">Save rules</button>
                        <button className="admin-button" type="button" onClick={onClose}>Close</button>
                    </div>
                </form>
                {parameters.length > 0 && (
                    <details>
                        <summary>Saved rule history</summary>
                        <table className="table">
                            <thead><tr><th>Effective from</th><th>Setting</th><th>Value</th></tr></thead>
                            <tbody>
                                {parameters.map(({ key, value, effectiveFrom }) => (
                                    <tr key={key + effectiveFrom}>
                                        <td>{effectiveFrom}</td><td>{historyLabels[key] ?? key}</td>
                                        <td>{typeof value === "boolean" ? (value ? "Yes" : "No") : value}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </details>
                )}
            </div>
        </div>
    );
}
