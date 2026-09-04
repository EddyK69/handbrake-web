import type { ConfigType } from '@handbrake-web/shared/types/config';
import { TranscodeStage } from '@handbrake-web/shared/types/transcode';
import { QueueStatus } from '@handbrake-web/shared/types/queue';
import mqtt, { type MqttClient } from 'mqtt';
import logger from 'logging';
import { GetQueue, GetQueueStatus } from './queue';

type MqttConfig = ConfigType['mqtt'];

type SensorDefinition = {
	id: string;
	name: string;
	topicSuffix: string;
	icon?: string;
	unit?: string;
	deviceClass?: string;
	stateClass?: string;
};

const haDevice = {
	identifiers: ['handbrake-web'],
	name: 'HandBrake Web',
	manufacturer: 'HandBrake Web',
	model: 'Transcode Queue',
};

const sensors: SensorDefinition[] = [
	{ id: 'queue_status', name: 'Queue Status', topicSuffix: 'queue/status', icon: 'mdi:tray-full' },
	{
		id: 'queue_total',
		name: 'Queue Total Jobs',
		topicSuffix: 'queue/total',
		icon: 'mdi:format-list-numbered',
		unit: 'jobs',
		stateClass: 'measurement',
	},
	{
		id: 'queue_waiting',
		name: 'Queue Waiting Jobs',
		topicSuffix: 'queue/waiting',
		icon: 'mdi:clock-outline',
		unit: 'jobs',
		stateClass: 'measurement',
	},
	{
		id: 'queue_active',
		name: 'Queue Active Jobs',
		topicSuffix: 'queue/active',
		icon: 'mdi:cog-sync',
		unit: 'jobs',
		stateClass: 'measurement',
	},
	{
		id: 'queue_finished',
		name: 'Queue Finished Jobs',
		topicSuffix: 'queue/finished',
		icon: 'mdi:check-circle-outline',
		unit: 'jobs',
		stateClass: 'measurement',
	},
	{
		id: 'current_job_name',
		name: 'Current Job',
		topicSuffix: 'queue/current-job/name',
		icon: 'mdi:movie-open-outline',
	},
	{
		id: 'current_job_progress',
		name: 'Current Job Progress',
		topicSuffix: 'queue/current-job/progress',
		icon: 'mdi:progress-clock',
		unit: '%',
		stateClass: 'measurement',
	},
	{
		id: 'current_job_eta',
		name: 'Current Job ETA',
		topicSuffix: 'queue/current-job/eta',
		icon: 'mdi:timer-sand',
		unit: 's',
		deviceClass: 'duration',
		stateClass: 'measurement',
	},
	{
		id: 'current_job_fps',
		name: 'Current Job FPS',
		topicSuffix: 'queue/current-job/fps',
		icon: 'mdi:speedometer',
		unit: 'fps',
		stateClass: 'measurement',
	},
];

let client: MqttClient | null = null;
let activeConfig: MqttConfig | null = null;

function getTopic(baseTopic: string, suffix: string) {
	return `${baseTopic}/${suffix}`;
}

function getAvailabilityTopic(baseTopic: string) {
	return getTopic(baseTopic, 'status');
}

// Init/Connection -----------------------------------------------------------------------------------
export async function HandleMqttConfigUpdate(config: ConfigType) {
	const mqttConfig = config.mqtt;
	const isUnchanged = JSON.stringify(mqttConfig) === JSON.stringify(activeConfig);

	if (isUnchanged && (client?.connected || !mqttConfig.enabled)) {
		return;
	}

	await DisconnectMqtt();
	activeConfig = mqttConfig;

	if (!mqttConfig.enabled) {
		logger.info('[server] [mqtt] The MQTT integration is disabled.');
		return;
	}

	if (!mqttConfig.host) {
		logger.warn(
			"[server] [mqtt] [warn] MQTT is enabled but no broker host has been configured."
		);
		return;
	}

	ConnectMqtt(mqttConfig);
}

function ConnectMqtt(mqttConfig: MqttConfig) {
	const availabilityTopic = getAvailabilityTopic(mqttConfig['base-topic']);

	logger.info(
		`[server] [mqtt] Connecting to the broker at '${mqttConfig.host}:${mqttConfig.port}'...`
	);

	client = mqtt.connect({
		host: mqttConfig.host,
		port: mqttConfig.port,
		username: mqttConfig.username || undefined,
		password: mqttConfig.password || undefined,
		will: {
			topic: availabilityTopic,
			payload: 'offline',
			qos: 1,
			retain: true,
		},
		reconnectPeriod: 5000,
	});

	client.on('connect', () => {
		logger.info(
			`[server] [mqtt] Connected to the broker at '${mqttConfig.host}:${mqttConfig.port}'.`
		);
		client?.publish(availabilityTopic, 'online', { qos: 1, retain: true });

		if (mqttConfig['discovery-enabled']) {
			PublishDiscoveryConfig(mqttConfig);
		}

		PublishQueueState();
	});

	client.on('error', (err) => {
		logger.error(`[server] [mqtt] [error] ${err.message}`);
	});

	client.on('close', () => {
		logger.info('[server] [mqtt] The connection to the broker has closed.');
	});
}

export async function DisconnectMqtt() {
	if (!client) {
		return;
	}

	const closingClient = client;
	const availabilityTopic = activeConfig
		? getAvailabilityTopic(activeConfig['base-topic'])
		: undefined;

	client = null;

	if (availabilityTopic && closingClient.connected) {
		closingClient.publish(availabilityTopic, 'offline', { qos: 1, retain: true });
	}

	await new Promise<void>((resolve) => closingClient.end(false, {}, () => resolve()));
}

// Discovery -------------------------------------------------------------------------------------
function PublishDiscoveryConfig(mqttConfig: MqttConfig) {
	if (!client) {
		return;
	}

	const baseTopic = mqttConfig['base-topic'];
	const availabilityTopic = getAvailabilityTopic(baseTopic);

	sensors.forEach((sensor) => {
		const discoveryTopic = `${mqttConfig['discovery-prefix']}/sensor/handbrake_web/${sensor.id}/config`;
		const payload = {
			name: sensor.name,
			unique_id: `handbrake_web_${sensor.id}`,
			state_topic: getTopic(baseTopic, sensor.topicSuffix),
			availability_topic: availabilityTopic,
			device: haDevice,
			...(sensor.icon ? { icon: sensor.icon } : {}),
			...(sensor.unit ? { unit_of_measurement: sensor.unit } : {}),
			...(sensor.deviceClass ? { device_class: sensor.deviceClass } : {}),
			...(sensor.stateClass ? { state_class: sensor.stateClass } : {}),
		};

		client?.publish(discoveryTopic, JSON.stringify(payload), { qos: 0, retain: true });
	});

	logger.info('[server] [mqtt] Published Home Assistant discovery configuration.');
}

// State -------------------------------------------------------------------------------------------
export async function PublishQueueState() {
	if (!client?.connected || !activeConfig) {
		return;
	}

	const baseTopic = activeConfig['base-topic'];
	const [queue, status] = await Promise.all([GetQueue(), GetQueueStatus()]);

	const waiting = queue.filter((job) => job.transcode_stage == TranscodeStage.Waiting).length;
	const active = queue.filter(
		(job) =>
			job.transcode_stage == TranscodeStage.Transcoding ||
			job.transcode_stage == TranscodeStage.Scanning
	).length;
	const finished = queue.filter((job) => job.transcode_stage == TranscodeStage.Finished).length;
	const currentJob = queue.find((job) => job.transcode_stage == TranscodeStage.Transcoding);
	const currentJobName = currentJob?.output_path.split(/[\\/]/).pop() ?? '';

	const payloads: Record<string, string> = {
		'queue/status': status != null ? QueueStatus[status].toLowerCase() : 'unknown',
		'queue/total': String(queue.length),
		'queue/waiting': String(waiting),
		'queue/active': String(active),
		'queue/finished': String(finished),
		'queue/current-job/name': currentJobName,
		'queue/current-job/progress': String(currentJob?.transcode_percentage ?? 0),
		'queue/current-job/eta': String(currentJob?.transcode_eta ?? 0),
		'queue/current-job/fps': String(currentJob?.transcode_fps_current ?? 0),
	};

	Object.entries(payloads).forEach(([suffix, payload]) => {
		client?.publish(getTopic(baseTopic, suffix), payload, { qos: 0, retain: true });
	});
}
