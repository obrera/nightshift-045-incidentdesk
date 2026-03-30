import { useEffect, useState } from "react";
import type { IncidentDetail, Severity, Status } from "@/lib/types";

interface IncidentFormValues {
  title: string;
  service: string;
  severity: Severity;
  status: Status;
  owner: string;
  summary: string;
  impact: string;
  startedAt: string;
  slaTargetAt: string;
  tags: string;
}

const initialValues: IncidentFormValues = {
  title: "",
  service: "",
  severity: "sev2",
  status: "open",
  owner: "",
  summary: "",
  impact: "",
  startedAt: new Date().toISOString().slice(0, 16),
  slaTargetAt: new Date(Date.now() + 60 * 60_000).toISOString().slice(0, 16),
  tags: "",
};

export function IncidentForm({
  incident,
  onSubmit,
  onCancel,
}: {
  incident?: IncidentDetail | null;
  onSubmit: (values: Omit<IncidentFormValues, "tags"> & { tags: string[] }) => Promise<void>;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState(initialValues);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!incident) {
      setValues(initialValues);
      return;
    }

    setValues({
      title: incident.title,
      service: incident.service,
      severity: incident.severity,
      status: incident.status,
      owner: incident.owner,
      summary: incident.summary,
      impact: incident.impact,
      startedAt: new Date(incident.startedAt).toISOString().slice(0, 16),
      slaTargetAt: new Date(incident.slaTargetAt).toISOString().slice(0, 16),
      tags: incident.tags.join(", "),
    });
  }, [incident]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        ...values,
        startedAt: new Date(values.startedAt).toISOString(),
        slaTargetAt: new Date(values.slaTargetAt).toISOString(),
        tags: values.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
      if (!incident) {
        setValues(initialValues);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Title" value={values.title} onChange={(value) => setValues({ ...values, title: value })} />
        <Input label="Service" value={values.service} onChange={(value) => setValues({ ...values, service: value })} />
        <Select
          label="Severity"
          value={values.severity}
          options={["sev1", "sev2", "sev3", "sev4"]}
          onChange={(value) => setValues({ ...values, severity: value as Severity })}
        />
        <Select
          label="Status"
          value={values.status}
          options={["open", "investigating", "mitigated", "resolved"]}
          onChange={(value) => setValues({ ...values, status: value as Status })}
        />
        <Input label="Owner" value={values.owner} onChange={(value) => setValues({ ...values, owner: value })} />
        <Input label="Tags" value={values.tags} onChange={(value) => setValues({ ...values, tags: value })} />
        <Input
          label="Started at"
          type="datetime-local"
          value={values.startedAt}
          onChange={(value) => setValues({ ...values, startedAt: value })}
        />
        <Input
          label="SLA target"
          type="datetime-local"
          value={values.slaTargetAt}
          onChange={(value) => setValues({ ...values, slaTargetAt: value })}
        />
      </div>
      <TextArea label="Summary" value={values.summary} onChange={(value) => setValues({ ...values, summary: value })} />
      <TextArea label="Impact" value={values.impact} onChange={(value) => setValues({ ...values, impact: value })} />
      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
          disabled={saving}
          type="submit"
        >
          {saving ? "Saving..." : incident ? "Update incident" : "Create incident"}
        </button>
        {onCancel ? (
          <button
            className="rounded-full border border-white/15 px-5 py-2 text-sm text-slate-200 transition hover:border-white/30"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="space-y-2 text-sm text-slate-300">
      <span>{label}</span>
      <input
        className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none ring-0 transition focus:border-accent"
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2 text-sm text-slate-300">
      <span>{label}</span>
      <textarea
        className="min-h-28 w-full rounded-3xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-accent"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2 text-sm text-slate-300">
      <span>{label}</span>
      <select
        className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-accent"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
