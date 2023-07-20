import { get, post, del } from 'httpie'

const { TODOIST_API_KEY } = process.env
if (!TODOIST_API_KEY) {
	console.error('Must set env vars: TODOIST_API_KEY')
	process.exit(1)
}

const unwrap = response => response.data
const errorHandler = path => err => {
	console.error('Error while calling API:', path)
	console.error('status:', err.statusCode)
	console.log('data:', JSON.stringify(err, undefined, 4))
	process.exit(1)
}
const api = {
	get: async path => get('https://api.todoist.com' + path, {
		headers: { Authorization: 'Bearer ' + process.env.TODOIST_API_KEY },
	}).then(unwrap).catch(errorHandler(path)),
	del: async path => del('https://api.todoist.com' + path, {
		headers: { Authorization: 'Bearer ' + process.env.TODOIST_API_KEY },
	}).then(unwrap).catch(errorHandler(path)),
}
const todoist = {
	tasks: {
		get: async () => api.get('/rest/v2/tasks'),
		del: async taskId => api.del(`/rest/v2/tasks/${taskId}`)
	}
}

const tasks = await todoist.tasks.get()

let block = 'todoist:\n  date: ' + new Date().toISOString() + '\n  inbox:'
if (tasks.length) {
	for (const { id, content, description, due } of tasks) {
		block += ('\n    - content: ' + content)
		if (description) block += ('\n      description: ' + description)
		if (due) {
			block += '\n      due:'
			const { datetime, string, is_recurring } = due
			if (string) block += ('\n        string: ' + string)
			if (datetime) block += ('\n        datetime: ' + datetime)
			if (is_recurring) block += ('\n        recurring: true')
		}
	}
}

console.log('========== OUTPUT ==========\n' + block)
