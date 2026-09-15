import type { ToolSlug } from './tools';

export type JobStatus = 'queued' | 'running' | 'done' | 'error';

export interface Job {
	id: string;
	tool: ToolSlug;
	status: JobStatus;
	progress: number;
	message: string | null;
	output_path: string | null;
	created_at: string;
	updated_at: string;
}
