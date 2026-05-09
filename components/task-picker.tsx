import { CheckCircle2, FileCode2, UserRoundCheck } from "lucide-react";
import type { DemoState } from "@/lib/types";

export function TaskPicker({ state }: { state: DemoState }) {
  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>Starter Task</h2>
          <p className="panel-subtitle">Calibrated to Sam’s current context and support graph.</p>
        </div>
        <span className="status-chip">{state.task.issueId}</span>
      </header>
      <div className="panel-body">
        <article className="task-row">
          <div className="task-title">
            <strong>{state.task.title}</strong>
            <span className="tag">{state.task.status}</span>
          </div>
          <p>{state.profile.summary}</p>
          <div className="tag-list">
            <span className="tag">
              <UserRoundCheck size={12} /> {state.task.owner}
            </span>
            {state.task.files.map((file) => (
              <span className="tag" key={file}>
                <FileCode2 size={12} /> {file}
              </span>
            ))}
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${state.task.progress}%` }} />
          </div>
          <div className="tag-list">
            {state.task.whyMatched.map((reason) => (
              <span className="tag" key={reason}>
                <CheckCircle2 size={12} /> {reason}
              </span>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
