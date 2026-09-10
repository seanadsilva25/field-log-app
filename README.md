# Offline-First Field Log

A React Native + TypeScript mobile application designed for field agents who need to create customer logs in areas with unreliable or unavailable network connectivity.

The application follows an **offline-first approach**: logs are persisted locally first and synchronized automatically when network connectivity becomes available.

## Features

* Create field logs with:

  * Customer Name
  * Log Notes
  * Timestamp
  * Optional image
* Offline-first local persistence using AsyncStorage
* Pending Sync status for offline submissions
* Automatic synchronization when connectivity is restored
* FIFO synchronization of pending logs
* Sync Failed state with Retry Sync
* Developer Offline Mode toggle for testing
* Persistence across application restarts
* 100+ historical logs
* Optimized FlatList rendering
* Loading and empty states
* Image selection using Expo Image Picker

## Tech Stack

* React Native
* Expo
* TypeScript
* AsyncStorage
* React Native NetInfo
* Expo Image Picker
* React Query

## Project Structure

```text
field-log-app/
│
├── src/
│   ├── components/
│   ├── hooks/
│   ├── screens/
│   │   └── HomeScreen.tsx
│   ├── services/
│   │   ├── mockApi.ts
│   │   ├── seedData.ts
│   │   ├── storage.ts
│   │   └── syncEngine.ts
│   └── types/
│       └── log.ts
│
├── App.tsx
├── package.json
└── README.md
```

## Setup Instructions

### Prerequisites

Make sure you have installed:

* Node.js
* npm
* Expo Go on an Android or iOS device
* Git

### 1. Clone the repository

```bash
git clone https://github.com/seanadsilva25/field-log-app.git
```

Replace `YOUR-USERNAME` with the GitHub username that owns this repository.

### 2. Open the project

```bash
cd field-log-app
```

### 3. Install dependencies

```bash
npm install
```

### 4. Start the Expo development server

```bash
npx expo start
```

### 5. Run on a phone

Install **Expo Go** on the mobile device.

Make sure the computer and phone are connected to the same network, then scan the QR code shown by Expo.

The application will open in Expo Go.

## How to Test the Offline-First Flow

### Test 1 — Offline submission

1. Open the application.
2. Turn **Offline Mode ON**.
3. Enter a customer name.
4. Enter log notes.
5. Optionally attach an image.
6. Press **Submit Log**.
7. The log should immediately appear as:

```text
⟳ Pending Sync
```

The log is stored locally before synchronization is attempted.

### Test 2 — Persistence

1. Create a log while Offline Mode is ON.
2. Close and reopen the application.
3. The previously created log should still be present.
4. Its status should remain:

```text
⟳ Pending Sync
```

This demonstrates local persistence.

### Test 3 — Automatic synchronization

1. Create a log while Offline Mode is ON.
2. Confirm it appears as Pending Sync.
3. Turn **Offline Mode OFF**.
4. When network connectivity is available, the pending log is synchronized automatically.
5. The status changes to:

```text
✓ Synced
```

### Test 4 — Sync failure and retry

The application supports failed synchronization.

When synchronization fails, the log is marked:

```text
⚠ Sync Failed
```

A **Retry Sync** button is displayed.

Pressing Retry Sync changes the log back to the pending state and attempts synchronization again.

> The mock API can be temporarily configured to simulate a failure for testing. The production/demo version of `mockApi.ts` is configured to return successful synchronization responses.

## Persistence Logic

Local persistence is handled by:

```text
src/services/storage.ts
```

The application stores the field logs using AsyncStorage.

The synchronization queue is handled by:

```text
src/services/syncEngine.ts
```

The sync engine:

1. Loads locally stored logs.
2. Finds logs with `pending` status.
3. Sorts them by timestamp.
4. Processes them in FIFO order.
5. Uploads each log through the mock API.
6. Updates successfully synchronized logs to `synced`.
7. Marks failed logs as `failed`.
8. Stops the queue when a synchronization failure occurs so FIFO ordering is preserved.

## Log Statuses

| Status    | Meaning                                               |
| --------- | ----------------------------------------------------- |
| `pending` | Log is stored locally and waiting for synchronization |
| `synced`  | Log has been successfully synchronized                |
| `failed`  | Synchronization failed and the log can be retried     |

## Performance

The historical logs are rendered using React Native's `FlatList`.

The implementation includes:

* `keyExtractor`
* `getItemLayout`
* Memoized log items using `React.memo`
* Efficient list rendering for 100+ records

## Developer Offline Mode

The application includes an in-app **Offline Mode** toggle.

This allows the offline-first workflow to be demonstrated without physically disconnecting the device from the network.

When enabled:

```text
Offline Mode → Forced Offline
```

New logs remain in Pending Sync until Offline Mode is disabled.

## Image Support

Users can optionally select an image from the device using Expo Image Picker.

The selected image is displayed in the form and associated with the field log.

## Demo Flow

The recommended demonstration flow is:

```text
Offline Mode ON
        ↓
Create Field Log
        ↓
Saved Locally
        ↓
Pending Sync
        ↓
Restart Application
        ↓
Log Still Present
        ↓
Offline Mode OFF
        ↓
Automatic Synchronization
        ↓
✓ Synced
```

Failure handling:

```text
Pending Sync
      ↓
Synchronization Fails
      ↓
⚠ Sync Failed
      ↓
Retry Sync
      ↓
✓ Synced
```

