import { useEffect, useState, type FormEvent } from "react";
import {
    createRulePreset, getRulePresets, getSystemParameters, saveSystemParameters,
    type HolidayRuleSettings, type RulePreset, type SystemParameter
} from "../holidayApi";

const numericFields = {
    weeks1To5DaysPerMonth: "Weeks 1–5 holiday days earned per month",
    week6DaysPerMonth: "Week 6 holiday days earned per month",
    mainHolidayNoticeMonths: "Main holiday notice (months)",
    otherHolidayNoticeMonths: "Other holiday notice (months)"
} as const;

type NumericKey = keyof typeof numericFields;

const defaultSettings: HolidayRuleSettings = {
    weeks1To5DaysPerMonth: 2.08,
    week6DaysPerMonth: 0.42,
    mainHolidayNoticeMonths: 3,
    otherHolidayNoticeMonths: 1,
    transfersEnabled: true
};

const defaultPreset: RulePreset = {
    id: "business-esbjerg",
    name: "Business Esbjerg defaults",
    settings: defaultSettings
};

const historyLabels: Record<string, string> = {
    ...numericFields,
    transfersEnabled: "Allow holiday transfer"
};

function settingsAtDate(parameters: SystemParameter[], date: string): HolidayRuleSettings {
    const applicable = parameters.filter(row => row.effectiveFrom <= date);
    const latestDate = applicable.reduce(
        (latest, row) => row.effectiveFrom > latest ? row.effectiveFrom : latest,
        ""
    );
    const settings = { ...defaultSettings };
    for (const row of applicable.filter(item => item.effectiveFrom === latestDate)) {
        if (row.key === "weeks1To5DaysPerMonth" && typeof row.value === "number")
            settings.weeks1To5DaysPerMonth = row.value;
        if (row.key === "week6DaysPerMonth" && typeof row.value === "number")
            settings.week6DaysPerMonth = row.value;
        if (row.key === "mainHolidayNoticeMonths" && typeof row.value === "number")
            settings.mainHolidayNoticeMonths = row.value;
        if (row.key === "otherHolidayNoticeMonths" && typeof row.value === "number")
            settings.otherHolidayNoticeMonths = row.value;
        if (row.key === "transfersEnabled" && typeof row.value === "boolean")
            settings.transfersEnabled = row.value;
    }
    return settings;
}

export default function Presets({ onClose }: { onClose: () => void }) {
    const [presets, setPresets] = useState<RulePreset[]>([]);
    const [presetId, setPresetId] = useState(defaultPreset.id);
    const [presetName, setPresetName] = useState("");
    const [presetMessage, setPresetMessage] = useState("");
    const [settings, setSettings] = useState(defaultSettings);
    const [effectiveFrom, setEffectiveFrom] = useState("");
    const [parameters, setParameters] = useState<SystemParameter[]>([]);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const availablePresets = [defaultPreset, ...presets];

    useEffect(() => {
        void Promise.all([getRulePresets(), getSystemParameters()])
            .then(([savedPresets, savedParameters]) => {
                setPresets(savedPresets);
                setParameters(savedParameters);
                const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Copenhagen" });
                setSettings(settingsAtDate(savedParameters, today));
            })
            .catch(error => setLoadError(error instanceof Error ? error.message : "Could not load holiday rules."))
            .finally(() => setLoading(false));
    }, []);

    async function savePreset() {
        const name = presetName.trim();
        if (!name || !Object.values(settings).every(value =>
            typeof value === "boolean" || (Number.isFinite(value) && value >= 0))) {
            return setPresetMessage("Enter a name and valid values for each setting.");
        }
        try {
            const preset = await createRulePreset(name, settings);
            setPresets(current => [...current, preset]);
            setPresetId(preset.id);
            setPresetName("");
            setPresetMessage("Preset saved.");
        } catch (error) {
            setPresetMessage(error instanceof Error ? error.message : "Could not save preset.");
        }
    }

    async function saveRules(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Copenhagen" });
        if (effectiveFrom <= today) {
            return setMessage("Choose a future start date.");
        }
        try {
            const saved = await saveSystemParameters(effectiveFrom, settings);
            setParameters(current => [...current, ...saved]);
            setMessage("Rule set saved.");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Could not save rules.");
        }
    }

    return (
        <div className="modal-overlay">
            <div className="modal presets-modal" role="dialog" aria-modal="true" aria-labelledby="presets-title">
                <h3 id="presets-title">Holiday presets</h3>
                <p>Presets and effective-dated rules are saved on the server.</p>
                {loading && <p role="status">Loading holiday rules...</p>}
                {loadError && <p role="alert">{loadError}</p>}
                {!loading && !loadError && <>
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
                        {(Object.keys(numericFields) as NumericKey[]).map(key => (
                            <label key={key}>
                                {numericFields[key]}{" "}
                                <input type="number" min="0" step="0.01" required value={settings[key]}
                                    onChange={event => {
                                        setSettings({ ...settings, [key]: event.target.valueAsNumber });
                                        setPresetId("");
                                    }} />
                            </label>
                        ))}
                        <label>
                            <input type="checkbox" checked={settings.transfersEnabled}
                                onChange={event => setSettings({ ...settings, transfersEnabled: event.target.checked })} />
                            Allow holiday transfer
                        </label>
                        <label>
                            Preset name{" "}
                            <input value={presetName} onChange={event => setPresetName(event.target.value)} />
                        </label>
                        <button className="admin-button" type="button" onClick={() => void savePreset()}>Save as preset</button>
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
                                    {parameters.map(({ key, value, effectiveFrom: date }) => (
                                        <tr key={key + date}>
                                            <td>{date}</td><td>{historyLabels[key] ?? key}</td>
                                            <td>{typeof value === "boolean" ? (value ? "Yes" : "No") : value}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </details>
                    )}
                </>}
            </div>
        </div>
    );
}
