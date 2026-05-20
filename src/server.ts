import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { FirebaseAudioStorage, FirestoreTranscriptJobsRepository, initializeFirebase } from './firebase.js';
import { LineHttpClient } from './lineClient.js';
import { OpenAITranscriber } from './openaiTranscriber.js';

const config = loadConfig();
initializeFirebase(config);

const app = createApp({
  config,
  lineClient: new LineHttpClient(config.lineChannelAccessToken),
  jobs: new FirestoreTranscriptJobsRepository(),
  transcriber: new OpenAITranscriber(config.openaiApiKey, config.openaiTranscriptionModel),
  audioStorage: config.storeAudio ? new FirebaseAudioStorage() : undefined
});

app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
});
