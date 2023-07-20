import { get, post, del } from 'httpie'
import  { SNSClient, PublishCommand } from '@aws-sdk/client-sns'

const REGION = 'us-east-1'
const sns = new SNSClient({ region: REGION })

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

let block = ''
if (tasks.length) {
	for (const { content, description, due } of tasks) {
		block += content
		if (description) block += ('\n' + description)
		if (due) {
			block += '\ndue:'
			const { datetime, string, is_recurring } = due
			if (string) block += ('\n    string: ' + string)
			if (datetime) block += ('\n    datetime: ' + datetime)
			if (is_recurring) block += ('\n    recurring: true')
		}
		block += '\n\n\n\n'
	}
}

let sent
try {
	const data = await sns.send(new PublishCommand({
		Message: block,
		TopicArn: 'arn:aws:sns:us-east-1:190776193724:from-todoist-to-email',
	}))
	console.log('Sent!', JSON.stringify(data, undefined, 4))
	sent = true
} catch (error) {
	console.log('Error!', JSON.stringify(error, undefined, 4))
	console.error(error)
}

if (sent) {
	for (const { id } of tasks) {
		await todoist.tasks.del(id)
	}
	console.log('All old tasks deleted')
}
