import admin from 'firebase-admin';
import type { AppConfig, AudioStorage, TranscriptJobCreateInput, TranscriptJobsRepository, TranscriptJobUpdateInput } from './types.js';

export function initializeFirebase(config: AppConfig): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const credential = loadCredential();
  return admin.initializeApp({
    credential,
    storageBucket: config.firebaseStorageBucket
  });
}

export class FirestoreTranscriptJobsRepository implements TranscriptJobsRepository {
  private readonly collection = admin.firestore().collection('transcriptJobs');

  async createJob(input: TranscriptJobCreateInput): Promise<string> {
    const ref = await this.collection.add(toFirestoreData(input));
    return ref.id;
  }

  async updateJob(jobId: string, input: TranscriptJobUpdateInput): Promise<void> {
    await this.collection.doc(jobId).set(toFirestoreData(input), { merge: true });
  }
}

export class FirebaseAudioStorage implements AudioStorage {
  async saveAudio(messageId: string, audio: Buffer, contentType: string): Promise<string> {
    const path = `line-audio/${messageId}.m4a`;
    const file = admin.storage().bucket().file(path);
    await file.save(audio, {
      contentType,
      resumable: false,
      metadata: {
        cacheControl: 'private, max-age=0'
      }
    });
    return path;
  }
}

function loadCredential(): admin.credential.Credential {
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (base64) {
    const serviceAccount = JSON.parse(Buffer.from(base64, 'base64').toString('utf8')) as admin.ServiceAccount;
    return admin.credential.cert(serviceAccount);
  }

  return admin.credential.applicationDefault();
}

function toFirestoreData(input: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}
