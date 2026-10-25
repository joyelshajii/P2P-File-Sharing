# PeerLink — P2P File Sharing Network
> **Computer Networks Group Project — BitTorrent-Inspired Peer-to-Peer File Transfer System**

PeerLink is an interactive web-based demonstration of a decentralized peer-to-peer file distribution protocol built for computer networks demonstrations. It proves how files are partitioned into uniform cryptographic chunks, negotiated across swarm peers, transferred over direct WebRTC DataChannels or deterministic simulation, and reconstructed client-side with SHA-256 integrity verification—all with **zero file data stored on a central server**.

---

## 1. Key Computer Networks Concepts Demonstrated

- **Peer-to-Peer (P2P) Architecture**: Symmetrical nodes acting simultaneously as downloaders (leechers) and uploaders (seeders), eliminating central server bandwidth bottlenecks.
- **Piece Segmentation (Chunking)**: Files are partitioned into uniform 256 KiB blocks for parallelized, multi-source retrieval.
- **Swarm Peer Discovery**: Rendezvous and peer registry brokered via a lightweight Socket.IO tracker without passing file data through the server.
- **Signaling vs. Data Plane Separation**: Signaling (SDP Offer/Answer & ICE Candidates) runs out-of-band via WebSockets; actual binary payloads travel strictly peer-to-peer across SCTP/DTLS `RTCDataChannel`s.
- **Bitfield Maps**: Each peer advertises piece availability through an interactive bitfield array.
- **Cryptographic Integrity (SHA-256)**: Web Crypto API computes root and chunk hashes to isolate tampered or corrupted chunks and guarantee 100% bit-exact reconstruction.
- **Malicious Peer Tamper Rejection**: Live presentation demonstration of bit-flip corruption detection and recovery from redundant peers.

---

## 2. Technology Stack

- **Frontend**: React 19 + TypeScript + Vite 8
- **Styling**: Tailwind CSS v4 + Monospaced Terminal Design System (`IBM Plex Mono`, `#000000`, `#66ff66`, `#255325`)
- **Icons**: Lucide React
- **P2P Transport**: WebRTC `RTCDataChannel` (Ordered, binary ArrayBuffer)
- **Signaling & Discovery**: Node.js + Express + Socket.IO
- **Cryptography**: Native Web Crypto API (`crypto.subtle.digest('SHA-256')`)

---

## 3. System Requirements

- **Node.js**: v18.0.0 or higher (Tested on Node.js v22.17.1)
- **Package Manager**: npm 9.0+ or npm 10+
- **Browser**: Any modern browser (Google Chrome, Brave, Microsoft Edge, Mozilla Firefox, Safari)

---

## 4. Quick Start & Setup

### Clone and Install Dependencies
From the project root:

```bash
# 1. Install root, client, and server dependencies
npm install
npm --prefix client install
npm --prefix server install
```

### Run the Application

You can start both frontend and backend concurrently with a single command from the root directory:

```bash
# Starts both the Client (port 5173) and Signaling Server (port 9001)
npm run dev:all
```

Or run them individually in separate terminal windows:

```bash
# Terminal 1: Signaling Tracker Server
npm run dev:server
# Running at: http://localhost:9001 (Health check: http://localhost:9001/health)

# Terminal 2: Web Client
npm run dev:client
# Running at: http://localhost:5173
```

Open your browser and navigate to: **`http://localhost:5173`**

---

## 5. Demonstration Modes

### Mode A: Deterministic Multi-Peer Simulation (Recommended for Single-Laptop College Presentation)
* **Goal**: Guaranteed, deterministic, offline demonstration that works with zero external Wi-Fi or complex network setup.
* **How it works**:
  1. Click **`[ ► START DEMO ]`** on the top navigation bar.
  2. The system loads a 12-chunk educational BitStream file (`PeerLink_RFC_Protocol_Spec_2026.txt`).
  3. 3 simulated peers connect:
     - **Node-Alpha [US-East]**: provides chunks `[0, 3, 6, 9]`
     - **Node-Beta [EU-Central]**: provides chunks `[1, 4, 7, 10]`
     - **Node-Gamma [AP-South]**: provides chunks `[2, 5, 8, 11]`
  4. The **Transfer Inspector** visualizes pieces arriving concurrently from each remote peer.
  5. The chunks are concatenated, digested with SHA-256, and verified.
  6. Click **`[ DOWNLOAD & SAVE RECONSTRUCTED FILE TO DISK ]`** to save the verified file locally.
* **Corrupt Chunk Test (Professor Showstopper)**:
  - Toggle **`[ ACTIVATE CORRUPT TEST ]`** in the Transfer Inspector.
  - Piece #4 is intentionally corrupted by Node-Beta with a bit-flip.
  - The inspector flags the piece in **RED**, logs `INTEGRITY TAMPER DETECTED`, discards the bad chunk, and fetches a clean copy from redundant seeder Node-Alpha!

### Mode B: Real WebRTC P2P Mode (Multi-Tab / Multi-Laptop Demonstration)
* **Goal**: Demonstrate true browser-to-browser SCTP/DTLS DataChannel file transfer.
* **How it works**:
  1. Ensure the signaling server is running (`npm run dev:server`).
  2. Open two separate browser windows (or tabs) at `http://localhost:5173`.
  3. Window 1 generates a unique Peer ID (e.g., `PEER-A1B2`) and Window 2 generates another (e.g., `PEER-C3D4`).
  4. Both peers discover each other via Socket.IO tracker signaling.
  5. In Window 1: Go to **`[02_SWARM_FILES]`** and select any file from your computer using the local file picker. PeerLink chunks it into 256 KiB pieces and announces the metadata.
  6. In Window 2: Switch to `[ REAL WEBRTC ]` mode. You will see Window 1's file announced in the swarm list.
  7. Click **`[ DOWNLOAD ]`**. Chunks transfer directly across the WebRTC DataChannel without ever touching the Node.js server.
  8. Reassemble and verify the file in Window 2!

---

## 6. College Presentation Step-by-Step Script

Here is an effective 3-minute demonstration script for your Computer Networks viva / group presentation:

1. **Introduction (30s)**:
   - *"Hello everyone. For our Computer Networks project, we developed PeerLink, an educational demonstration of peer-to-peer file sharing inspired by BitTorrent."*
   - Show the **Network Dashboard**: point out the local peer identity, online peers, and live topology visualization.
   - Explain the key separation: *"The Socket.IO server on port 9001 only acts as a signaling tracker for peer discovery. It never stores or routes file contents."*

2. **The Piece Transfer & Swarm Demonstration (60s)**:
   - Click **`[ ► START DEMO ]`**.
   - The UI automatically navigates to **`[05_TRANSFER_INSPECTOR]`**.
   - Point out the 12-piece bitfield grid:
     - *"Here is our file split into twelve 256 KiB chunks. Notice how Node-Alpha provides chunks 0, 3, 6, 9; Node-Beta provides chunks 1, 4, 7, 10; and Node-Gamma provides chunks 2, 5, 8, 11 in parallel."*
     - Show the pause, resume, and speed controls (`1x`, `2x`, `5x`).

3. **Cryptographic Verification & Tamper Resistance (60s)**:
   - Once all chunks arrive, highlight the **ROOT SHA-256 INTEGRITY VERIFIED** banner:
     - *"All 12 chunks were stitched into memory. Using the Web Crypto API, the computed hash matches the root manifest."*
   - Click **`[ ACTIVATE CORRUPT TEST ]`** and re-run:
     - *"Watch what happens when a malicious peer tampers with Chunk #4: our client detects the hash mismatch, discards the corrupt data, and automatically recovers it from a clean seeder."*
   - Click **`[ DOWNLOAD & SAVE RECONSTRUCTED FILE TO DISK ]`** to open the real generated file.

4. **Architecture & Theory Wrap-Up (30s)**:
   - Switch to **`[06_ARCHITECTURE_LAB]`**.
   - Point out the Client-Server vs. P2P comparison matrix:
     - *"In client-server, server bandwidth is O(N). In P2P, the upload capacity scales with the swarm size."*

---

## 7. Troubleshooting

- **Port 9001 in use**: Set `PORT=9002` in `server/src/index.ts` or terminate existing process:
  ```powershell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 9001).OwningProcess | Stop-Process
  ```
- **Execution Policy on Windows PowerShell**:
  If PowerShell blocks `npm`, run `npm.cmd` or start via Command Prompt (`cmd.exe`).
- **Offline Presentation Mode**:
  If presenting in an auditorium without Wi-Fi, PeerLink's Simulation Mode is 100% self-contained and requires no network connection.
