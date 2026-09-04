import type { UnknownConfigType } from '@handbrake-web/shared/types/config';
import logger from 'logging';

export default async function Migration3(config: UnknownConfigType): Promise<UnknownConfigType> {
	// Add mqtt config section
	if (!Object.hasOwn(config, 'mqtt')) {
		logger.info(`[config] [migration-3] Creating the config property 'mqtt'.`);
		config.mqtt = {
			enabled: false,
			host: '',
			port: 1883,
			username: '',
			password: '',
			'base-topic': 'handbrake-web',
			'discovery-enabled': true,
			'discovery-prefix': 'homeassistant',
		};
	}

	return config;
}
