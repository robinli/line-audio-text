# LINE Audio Transcript Webhook

Node.js + TypeScript service for Zeabur. It receives LINE Official Account webhooks, validates the LINE signature with the raw request body, handles audio messages, downloads LINE audio content, transcribes it with OpenAI Speech-to-Text, stores transcript jobs in Firebase Firestore, optionally saves audio to Firebase Storage, and sends the transcript back to the LINE user.

## Endpoints

- `GET /health` returns `{ "ok": true }`
- `POST /webhook` receives LINE webhook events

## Default Behavior

`LINE_REPLY_MODE=two_step` is the default:

1. Reply immediately with `收到音訊，正在轉錄中。`
2. Process the audio in the background
3. Push the transcript to the LINE user when complete

Set `LINE_REPLY_MODE=single_reply` only for testing or short synchronous processing. In that mode the service waits for transcription and uses the LINE reply token for the final transcript.

## Firestore

Transcript jobs are stored in the `transcriptJobs` collection.

Typical fields:

- `eventId`
- `messageId`
- `userId`
- `sourceType`
- `status`: `processing`, `completed`, or `failed`
- `transcript`
- `errorMessage`
- `audioStoragePath`
- `createdAt`
- `updatedAt`
- `completedAt`
- `failedAt`

If transcription fails, the service updates the job with `status = failed`.

## Environment Variables

Copy `.env.example` to `.env` for local development.

Required:

- `LINE_CHANNEL_SECRET`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `OPENAI_API_KEY`
- Firebase credentials using either:
  - `FIREBASE_SERVICE_ACCOUNT_BASE64`
  - `GOOGLE_APPLICATION_CREDENTIALS`

Optional:

- `PORT`, defaults to `3000`
- `LINE_REPLY_MODE`, defaults to `two_step`
- `OPENAI_TRANSCRIPTION_MODEL`, defaults to `gpt-4o-mini-transcribe`
- `STORE_AUDIO`, defaults to `false`
- `FIREBASE_STORAGE_BUCKET`, required only when `STORE_AUDIO=true`

## Local Development

```bash
npm install
npm run dev
```

Run tests:

```bash
npm test
```

Build:

```bash
npm run build
```

Start compiled server:

```bash
npm start
```

## Zeabur Deployment

Use the included `Dockerfile`.

Set the same environment variables in Zeabur. Zeabur provides `PORT`; the server reads it automatically.

For Firebase on Zeabur, base64 encode the service account JSON and set it as `FIREBASE_SERVICE_ACCOUNT_BASE64`.

Example:

```bash
base64 -w 0 service-account.json
```

On Windows PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("service-account.json"))
```

## LINE Webhook Setup

Set the LINE Official Account webhook URL to:

```text
https://YOUR-ZEABUR-DOMAIN/webhook
```

Enable webhook events in the LINE Developers Console.
