import mqtt, { MqttClient } from 'mqtt';

const MQTT_BROKERS = [
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://broker.emqx.io:8084/mqtt',
];

const TOPIC_PREFIX = 'privledger/sync';

/**
 * Creates an MQTT connection with automatic broker fallback
 */
export async function connectMqttWithFallback(): Promise<MqttClient> {
  let lastError: unknown = null;

  for (const brokerUrl of MQTT_BROKERS) {
    try {
      const client = await new Promise<MqttClient>((resolve, reject) => {
        const timeout = setTimeout(() => {
          try { clientInstance.end(true); } catch {}
          reject(new Error(`MQTT connection to ${brokerUrl} timed out.`));
        }, 6000);

        const clientInstance = mqtt.connect(brokerUrl, {
          clientId: `lk_${Math.random().toString(16).slice(2, 10)}`,
          clean: true,
          connectTimeout: 5000,
          reconnectPeriod: 0, // No background reconnects needed for ephemeral sync
        });

        clientInstance.on('connect', () => {
          clearTimeout(timeout);
          resolve(clientInstance);
        });

        clientInstance.on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      return client;
    } catch (err) {
      lastError = err;
      console.warn(`Failed to connect to broker ${brokerUrl}, trying fallback...`, err);
    }
  }

  throw lastError || new Error('All MQTT signaling brokers were unreachable.');
}

/**
 * Step 1 (Host): Publishes encrypted offer with retain=true, listens for answer
 */
export async function startMqttHostSignaling(
  roomId: string,
  encryptedOffer: string,
  onEncryptedAnswerReceived: (encryptedAnswer: string) => void
): Promise<{ close: () => void }> {
  const client = await connectMqttWithFallback();
  const offerTopic = `${TOPIC_PREFIX}/${roomId}/offer`;
  const answerTopic = `${TOPIC_PREFIX}/${roomId}/answer`;

  // 1. Subscribe to Answer topic
  await new Promise<void>((resolve, reject) => {
    client.subscribe(answerTopic, { qos: 1 }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // 2. Publish Offer (retained so joiner gets it immediately on subscribe)
  await new Promise<void>((resolve, reject) => {
    client.publish(offerTopic, encryptedOffer, { qos: 1, retain: true }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  client.on('message', (topic, message) => {
    if (topic === answerTopic) {
      const payloadStr = message.toString();
      onEncryptedAnswerReceived(payloadStr);

      // Clean up retained offer message on broker
      try {
        client.publish(offerTopic, '', { retain: true, qos: 1 });
      } catch {}
    }
  });

  return {
    close: () => {
      try {
        // Clear retained topic before closing
        client.publish(offerTopic, '', { retain: true, qos: 1 });
        client.end(true);
      } catch {}
    },
  };
}

/**
 * Step 2 (Joiner): Subscribes to offer, decrypts it, generates answer and publishes it back
 */
export async function startMqttJoinerSignaling(
  roomId: string,
  onOfferReceived: (encryptedOffer: string) => Promise<string>
): Promise<{ close: () => void }> {
  const client = await connectMqttWithFallback();
  const offerTopic = `${TOPIC_PREFIX}/${roomId}/offer`;
  const answerTopic = `${TOPIC_PREFIX}/${roomId}/answer`;

  let processed = false;

  await new Promise<void>((resolve, reject) => {
    client.subscribe(offerTopic, { qos: 1 }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  client.on('message', async (topic, message) => {
    if (topic === offerTopic && !processed) {
      const encryptedOffer = message.toString();
      if (!encryptedOffer.trim()) return; // Ignored cleared message
      processed = true;

      try {
        const encryptedAnswer = await onOfferReceived(encryptedOffer);

        // Publish answer back to host
        client.publish(answerTopic, encryptedAnswer, { qos: 1 }, (err) => {
          if (err) console.error('Failed to publish answer to MQTT:', err);
        });
      } catch (err) {
        console.error('Error handling offer from MQTT:', err);
      }
    }
  });

  return {
    close: () => {
      try {
        client.end(true);
      } catch {}
    },
  };
}
