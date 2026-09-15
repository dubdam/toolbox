import { randomUUID } from 'node:crypto';
import { getDb } from './db';
import type { ToolSlug } from '$lib/tools';
import type { Job, JobStatus } from '$lib/job';

export type { Job, JobStatus };

export function createJob(tool: ToolSlug): Job {
	const now = new Date().toISOString();
	const job: Job = {
		id: randomUUID(),
		tool,
		status: 'queued',
		progress: 0,
		message: null,
		output_path: null,
		created_at: now,
		updated_at: now
	};
	getDb()
		.query(
			`INSERT INTO jobs (id, tool, status, progress, message, output_path, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.run(
			job.id,
			job.tool,
			job.status,
			job.progress,
			job.message,
			job.output_path,
			job.created_at,
			job.updated_at
		);
	return job;
}

export function getJob(id: string): Job | null {
	return (getDb().query(`SELECT * FROM jobs WHERE id = ?`).get(id) as Job | null) ?? null;
}

export function updateJob(
	id: string,
	patch: Partial<Pick<Job, 'status' | 'progress' | 'message' | 'output_path'>>
): Job | null {
	const current = getJob(id);
	if (!current) return null;
	const next: Job = {
		...current,
		...patch,
		updated_at: new Date().toISOString()
	};
	getDb()
		.query(
			`UPDATE jobs SET status = ?, progress = ?, message = ?, output_path = ?, updated_at = ? WHERE id = ?`
		)
		.run(next.status, next.progress, next.message, next.output_path, next.updated_at, id);
	return next;
}
