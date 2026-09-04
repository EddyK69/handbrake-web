import { ConfigType } from '@handbrake-web/shared/types/config';
import { useContext } from 'react';
import NumberInput from '~components/base/inputs/number';
import TextInput from '~components/base/inputs/text';
import ToggleInput from '~components/base/inputs/toggle';
import Section from '~components/root/section';
import { SettingsContext } from '~pages/settings/context';
import styles from './styles.module.scss';

export default function SettingsMqtt() {
	const { currentConfig, setCurrentConfig } = useContext(SettingsContext)!;

	const updateMqttConfigProperty = <K extends keyof ConfigType['mqtt']>(
		key: K,
		value: ConfigType['mqtt'][K]
	) => {
		setCurrentConfig({ ...currentConfig, mqtt: { ...currentConfig.mqtt, [key]: value } });
	};

	return (
		<Section heading='MQTT (Home Assistant)' className={styles['mqtt']}>
			<ToggleInput
				id='mqtt-enabled-toggle'
				label='Enable MQTT'
				checked={currentConfig.mqtt.enabled}
				onChange={(event) => updateMqttConfigProperty('enabled', event.target.checked)}
			/>
			<TextInput
				id='mqtt-host-input'
				label='Broker Host'
				value={currentConfig.mqtt.host}
				onChange={(event) => updateMqttConfigProperty('host', event.target.value)}
				disabled={!currentConfig.mqtt.enabled}
			/>
			<NumberInput
				id='mqtt-port-input'
				label='Broker Port'
				value={currentConfig.mqtt.port}
				onChange={(event) =>
					updateMqttConfigProperty('port', parseInt(event.target.value))
				}
				disabled={!currentConfig.mqtt.enabled}
			/>
			<TextInput
				id='mqtt-username-input'
				label='Username'
				value={currentConfig.mqtt.username}
				onChange={(event) => updateMqttConfigProperty('username', event.target.value)}
				disabled={!currentConfig.mqtt.enabled}
			/>
			<TextInput
				id='mqtt-password-input'
				label='Password'
				type='password'
				value={currentConfig.mqtt.password}
				onChange={(event) => updateMqttConfigProperty('password', event.target.value)}
				disabled={!currentConfig.mqtt.enabled}
			/>
			<TextInput
				id='mqtt-base-topic-input'
				label='Base Topic'
				value={currentConfig.mqtt['base-topic']}
				onChange={(event) => updateMqttConfigProperty('base-topic', event.target.value)}
				disabled={!currentConfig.mqtt.enabled}
			/>
			<ToggleInput
				id='mqtt-discovery-enabled-toggle'
				label='Enable Home Assistant Discovery'
				checked={currentConfig.mqtt['discovery-enabled']}
				onChange={(event) =>
					updateMqttConfigProperty('discovery-enabled', event.target.checked)
				}
				disabled={!currentConfig.mqtt.enabled}
			/>
			<TextInput
				id='mqtt-discovery-prefix-input'
				label='Discovery Prefix'
				value={currentConfig.mqtt['discovery-prefix']}
				onChange={(event) =>
					updateMqttConfigProperty('discovery-prefix', event.target.value)
				}
				disabled={!currentConfig.mqtt.enabled || !currentConfig.mqtt['discovery-enabled']}
			/>
		</Section>
	);
}
