import { useEffect, useState, type FormEvent } from "react";
import {
    createRulePreset, getRulePresets, getSystemParameters, saveSystemParameters,
    type RulePreset, type SystemParameter
} from "../holidayApi";

const fields = {
    weeks1To5HoursPerYear: "Weeks 1–5 entitlement (full-time hours per year)",
    week6HoursPerYear: "Week 6 entitlement (full-time hours per year)",
    mainHolidayNoticeMonths: "Main holiday notice (months)",
    otherHolidayNoticeMonths: "Other holiday notice (months)"
};

type Key = keyof typeof fields;

const keys = Object.keys(fields) as Key[];

function activeSettings(parameters: SystemParameter[]): Partial<RulePreset["settings"]> {
    const today = new Date().toISOString().slice(0, 10);
    const settings: Partial<RulePreset["settings"]> = {};
    for (const key of keys) {
        const active = parameters
            .filter(row => row.key === key && row.effectiveFrom <= today)
            .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
        if (typeof active?.value === "number") settings[key] = active.value;
    }
    return settings;
}

function validSettings(settings: Partial<RulePreset["settings"]>) {
    return keys.every(key => {
        const value = settings[key];
        return typeof value === "number" && Number.isFinite(value) && value >= 0;
    });
}

export default function Presets({ onClose }: { onClose: () => void }) {
    const [presets, setPresets] = useState<RulePreset[]>([]);
    const [presetId, setPresetId] = useState("");
    const [presetName, setPresetName] = useState("");
    const [presetMessage, setPresetMessage] = useState("");
    const [settings, setSettings] = useState<Partial<RulePreset["settings"]>>({});
    const [effectiveFrom, setEffectiveFrom] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [saving, setSaving] = useState(false);
    const saveDisabled = loading || !!loadError || saving;

    useEffect(() => {
        void Promise.all([getRulePresets(), getSystemParameters()])
            .then(([savedPresets, savedParameters]) => {
                setPresets(savedPresets);
                setSettings(activeSettings(savedParameters));
            })
            .catch(() => setLoadError("Could not load presets and rules. Close and reopen to retry."))
            .finally(() => setLoading(false));
    }, []);

    async function savePreset() {
        const name = presetName.trim();
        if (!name || !validSettings(settings)) {
            return setPresetMessage("Enter a name and a valid value for each setting.");
        }
        setSaving(true);
        try {
            const preset = await createRulePreset({ name, settings });
            setPresets(current => [...current, preset]);
            setPresetId(preset.id);
            setPresetName("");
            setPresetMessage("Preset saved.");
        } catch (error) {
            setPresetMessage(error instanceof Error ? error.message : "Could not save the preset.");
        } finally {
            setSaving(false);
        }
    }

    async function saveRules(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Copenhagen" });
        if (effectiveFrom <= today) {
            return setMessage("Choose a future start date.");
        }
        if (!validSettings(settings)) {
            return setMessage("Enter a valid value for each setting.");
        }
        const name = presetName.trim() || presets.find(preset => preset.id === presetId)?.name;
        setSaving(true);
        try {
            await saveSystemParameters({ name, settings, effectiveFrom });
            await getRulePresets()
                .then(presets => {
                    setPresets(presets);
                    setMessage("Rule set saved.");
                })
                .catch(() => setMessage("Rule set saved. Reopen Holiday presets to refresh the preset list."));
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Could not save rules.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="modal-overlay">
            <div className="modal presets-modal" role="dialog" aria-modal="true" aria-labelledby="presets-title">
                <h3 id="presets-title">Holiday presets</h3>
                {loading && <p role="status">Loading presets and rules…</p>}
                {loadError && <p role="alert">{loadError}</p>}
                <label>
                    Load preset{" "}
                    <select value={presetId} onChange={event => {
                        const selected = presets.find(preset => preset.id === event.target.value);
                        if (!selected) return;
                        setPresetId(selected.id);
                        setSettings(selected.settings);
                        setPresetMessage("");
                        setMessage("");
                    }}>
                        <option value="" disabled>Choose a preset</option>
                        {presets.map(preset => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
                    </select>
                </label>
                <form onSubmit={saveRules}>
                    <h3>System parameters</h3>
                    {keys.map(key => (
                        <label key={key}>
                            {fields[key]}{" "}
                            <input type="number" min="0" step="any" required value={settings[key] ?? ""}
                                onChange={event => {
                                    setSettings({ ...settings, [key]: event.target.value === "" ? undefined : event.target.valueAsNumber });
                                    setPresetId("");
                                }} />
                        </label>
                    ))}
                    <p>Enter 0 hours for Week 6 to disable it.</p>
                    <label>
                        Preset name{" "}
                        <input value={presetName} onChange={event => setPresetName(event.target.value)} />
                    </label>
                    <button className="admin-button" type="button" disabled={saveDisabled} onClick={savePreset}>Save as preset</button>
                    {presetMessage && <p role="status">{presetMessage}</p>}
                    <label>
                        Effective from{" "}
                        <input type="date" required value={effectiveFrom}
                            onChange={event => setEffectiveFrom(event.target.value)} />
                    </label>
                    {message && <p role="status">{message}</p>}
                    <div className="modal-buttons">
                        <button className="admin-button" type="submit" disabled={saveDisabled}>Save rules</button>
                        <button className="admin-button" type="button" onClick={onClose}>Close</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
