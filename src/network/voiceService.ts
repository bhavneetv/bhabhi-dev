import { multiplayerService } from './multiplayerSync';
import type { Player } from '../types/game';

export type MicMode = 'muted' | 'open' | 'ptt';
export type VoicePermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported';

interface PeerConnectionData {
  pc: RTCPeerConnection;
  audioEl: HTMLAudioElement;
  remoteStream: MediaStream;
  pendingCandidates: RTCIceCandidateInit[];
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' },
  ],
};

class VoiceService {
  private localPlayerId: string | null = null;
  private roomCode: string | null = null;
  private localStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private animationFrameId: number | null = null;

  private micMode: MicMode = 'muted';
  private isPttActive = false;
  private isDeafened = false;
  private permissionState: VoicePermissionState = 'prompt';

  private peers: Map<string, PeerConnectionData> = new Map();
  private earlyCandidates: Map<string, RTCIceCandidateInit[]> = new Map();
  private onLevelCallbacks: Set<(level: number, isSpeaking: boolean) => void> = new Set();
  private onPermissionCallbacks: Set<(state: VoicePermissionState) => void> = new Set();
  private lastSpeakingState = false;
  private speakingThrottleTimer: ReturnType<typeof setTimeout> | null = null;

  public getMicMode(): MicMode {
    return this.micMode;
  }

  public getRoomCode(): string | null {
    return this.roomCode;
  }

  public getIsPttActive(): boolean {
    return this.isPttActive;
  }

  public getIsDeafened(): boolean {
    return this.isDeafened;
  }

  public getPermissionState(): VoicePermissionState {
    return this.permissionState;
  }

  public onLevel(cb: (level: number, isSpeaking: boolean) => void): () => void {
    this.onLevelCallbacks.add(cb);
    return () => this.onLevelCallbacks.delete(cb);
  }

  public onPermission(cb: (state: VoicePermissionState) => void): () => void {
    this.onPermissionCallbacks.add(cb);
    return () => this.onPermissionCallbacks.delete(cb);
  }

  public hasLocalStream(): boolean {
    return this.localStream !== null && this.localStream.getAudioTracks().length > 0;
  }

  /**
   * Initializes voice session for local player in room (without prompting for mic)
   */
  public async init(localPlayerId: string, roomCode: string) {
    this.localPlayerId = localPlayerId;
    this.roomCode = roomCode;
  }

  /**
   * Requests real microphone stream from browser
   */
  public async requestMicrophone(): Promise<boolean> {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.permissionState = 'unsupported';
      this.notifyPermission();
      return false;
    }

    try {
      if (this.localStream) {
        this.localStream.getTracks().forEach((t) => t.stop());
        this.localStream = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      this.localStream = stream;
      this.permissionState = 'granted';
      this.notifyPermission();

      // Configure initial track state according to current mic mode
      this.updateTrackState();

      // Set up AudioContext & Analyser for real-time live voice level
      this.setupAudioAnalysis(stream);

      // Notify other peers that our voice is ready for call negotiation
      if (this.localPlayerId) {
        multiplayerService.broadcast({
          type: 'VOICE_READY',
          fromPlayerId: this.localPlayerId,
        });
      }

      // Re-add tracks to existing peer connections if any
      this.localStream.getAudioTracks().forEach((track) => {
        this.peers.forEach((peerData) => {
          const senders = peerData.pc.getSenders();
          const existingSender = senders.find((s) => s.track?.kind === 'audio');
          if (existingSender) {
            existingSender.replaceTrack(track);
          } else {
            peerData.pc.addTrack(track, this.localStream!);
          }
        });
      });

      return true;
    } catch (err: any) {
      console.warn('[VoiceService] Microphone access not granted or denied:', err);
      this.permissionState = 'denied';
      this.notifyPermission();
      return false;
    }
  }

  /**
   * Set up Web Audio API Analyser to read real live voice amplitude & frequencies
   */
  private setupAudioAnalysis(stream: MediaStream) {
    try {
      if (this.audioContext) {
        this.audioContext.close().catch(() => {});
      }

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.4;

      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      this.sourceNode.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!this.analyser) return;

        this.analyser.getByteFrequencyData(dataArray);

        // Compute average frequency power
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        // Normalize to 0..100
        const normalizedLevel = Math.min(100, Math.round((avg / 128) * 100));

        // Is voice transmitting right now?
        const isMicTransmitting =
          (this.micMode === 'open' && normalizedLevel > 12) ||
          (this.micMode === 'ptt' && this.isPttActive);

        // Notify local visualizer
        this.onLevelCallbacks.forEach((cb) => cb(normalizedLevel, isMicTransmitting));

        // Throttle broadcast of speaking state
        if (isMicTransmitting !== this.lastSpeakingState) {
          this.lastSpeakingState = isMicTransmitting;
          if (this.speakingThrottleTimer) clearTimeout(this.speakingThrottleTimer);
          this.speakingThrottleTimer = setTimeout(() => {
            if (this.localPlayerId) {
              multiplayerService.broadcast({
                type: 'VOICE_STATUS',
                playerId: this.localPlayerId,
                isSpeaking: isMicTransmitting,
                volume: normalizedLevel,
              });
            }
          }, 80);
        }

        this.animationFrameId = requestAnimationFrame(checkVolume);
      };

      if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = requestAnimationFrame(checkVolume);
    } catch (e) {
      console.warn('[VoiceService] AudioContext analysis error:', e);
    }
  }

  /**
   * Sets microphone operation mode: 'muted', 'open', or 'ptt'
   */
  public setMicMode(mode: MicMode) {
    this.micMode = mode;
    this.updateTrackState();
  }

  /**
   * Push to talk trigger (when holding button or Spacebar)
   */
  public setPttActive(active: boolean) {
    if (this.isPttActive === active) return;
    this.isPttActive = active;
    if (this.micMode === 'ptt') {
      this.updateTrackState();
    }
  }

  /**
   * Deafen (mutes all incoming audio from other players)
   */
  public setDeafened(deafened: boolean) {
    this.isDeafened = deafened;
    this.peers.forEach((peerData) => {
      peerData.audioEl.muted = deafened;
    });
  }

  /**
   * Updates audio track enabled state based on mode
   */
  private updateTrackState() {
    if (!this.localStream) return;
    const shouldEnable =
      this.micMode === 'open' || (this.micMode === 'ptt' && this.isPttActive);

    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = shouldEnable;
    });
  }

  /**
   * Sync active players in room to establish P2P WebRTC calls
   */
  public syncPeers(players: Player[]) {
    if (!this.localPlayerId) return;

    const activeRemoteHumans = players.filter(
      (p) => !p.isBot && p.id !== this.localPlayerId && p.isOnline !== false
    );

    // Identify stale peers and close them
    const activeRemoteIds = new Set(activeRemoteHumans.map((p) => p.id));
    this.peers.forEach((_, peerId) => {
      if (!activeRemoteIds.has(peerId)) {
        this.closePeer(peerId);
      }
    });

    // Establish WebRTC calls with other human peers
    // Deterministic initiator rule: Peer with lexicographically higher ID initiates to prevent dual-offer glare
    activeRemoteHumans.forEach((remotePlayer) => {
      if (!this.peers.has(remotePlayer.id)) {
        if (this.localPlayerId! > remotePlayer.id) {
          this.initiateCall(remotePlayer.id);
        }
      }
    });
  }

  /**
   * Initiates outgoing WebRTC call to remote player
   */
  private async initiateCall(remotePlayerId: string) {
    if (!this.localPlayerId || this.peers.has(remotePlayerId)) return;

    try {
      const pc = this.createPeerConnection(remotePlayerId);
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
      });
      await pc.setLocalDescription(offer);

      multiplayerService.broadcast({
        type: 'VOICE_SIGNAL',
        fromPlayerId: this.localPlayerId,
        toPlayerId: remotePlayerId,
        signal: { type: 'offer', sdp: offer },
      });
    } catch (err) {
      console.warn(`[VoiceService] Failed to initiate call to ${remotePlayerId}:`, err);
    }
  }

  /**
   * Handles incoming signaling messages (offer, answer, ice-candidate)
   */
  public async handleVoiceSignal(fromPlayerId: string, signal: any) {
    if (!this.localPlayerId || !signal) return;

    try {
      let peerData = this.peers.get(fromPlayerId);

      if (signal.type === 'offer') {
        if (!peerData) {
          this.createPeerConnection(fromPlayerId);
          peerData = this.peers.get(fromPlayerId)!;
        }

        const pc = peerData.pc;
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

        // Flush early candidates
        const early = this.earlyCandidates.get(fromPlayerId) || [];
        for (const cand of early) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch {}
        }
        this.earlyCandidates.delete(fromPlayerId);

        // Flush queued candidates
        while (peerData.pendingCandidates.length > 0) {
          const cand = peerData.pendingCandidates.shift()!;
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch {}
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        multiplayerService.broadcast({
          type: 'VOICE_SIGNAL',
          fromPlayerId: this.localPlayerId,
          toPlayerId: fromPlayerId,
          signal: { type: 'answer', sdp: answer },
        });
      } else if (signal.type === 'answer') {
        if (peerData) {
          await peerData.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

          const early = this.earlyCandidates.get(fromPlayerId) || [];
          for (const cand of early) {
            try {
              await peerData.pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch {}
          }
          this.earlyCandidates.delete(fromPlayerId);

          while (peerData.pendingCandidates.length > 0) {
            const cand = peerData.pendingCandidates.shift()!;
            try {
              await peerData.pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch {}
          }
        }
      } else if (signal.type === 'candidate' && signal.candidate) {
        if (peerData && peerData.pc.remoteDescription) {
          try {
            await peerData.pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch {}
        } else if (peerData) {
          peerData.pendingCandidates.push(signal.candidate);
        } else {
          const list = this.earlyCandidates.get(fromPlayerId) || [];
          list.push(signal.candidate);
          this.earlyCandidates.set(fromPlayerId, list);
        }
      }
    } catch (err) {
      console.warn(`[VoiceService] Error handling voice signal from ${fromPlayerId}:`, err);
    }
  }

  public handleVoiceReady(fromPlayerId: string) {
    if (!this.localPlayerId || fromPlayerId === this.localPlayerId) return;
    if (!this.peers.has(fromPlayerId) && this.localPlayerId > fromPlayerId) {
      this.initiateCall(fromPlayerId);
    }
  }

  /**
   * Creates an RTCPeerConnection for a remote peer with audio playback
   */
  private createPeerConnection(remotePlayerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    const remoteStream = new MediaStream();

    // Attach real DOM audio element to allow audio playback on mobile browsers
    const audioEl = document.createElement('audio');
    audioEl.id = `voice_audio_${remotePlayerId}`;
    audioEl.autoplay = true;
    audioEl.muted = this.isDeafened;
    audioEl.volume = 1.0;
    (audioEl as any).playsInline = true;
    audioEl.setAttribute('playsinline', 'true');
    audioEl.setAttribute('autoplay', 'true');
    audioEl.style.position = 'fixed';
    audioEl.style.opacity = '0';
    audioEl.style.pointerEvents = 'none';
    audioEl.style.width = '1px';
    audioEl.style.height = '1px';
    document.body.appendChild(audioEl);

    const peerData: PeerConnectionData = {
      pc,
      audioEl,
      remoteStream,
      pendingCandidates: [],
    };
    this.peers.set(remotePlayerId, peerData);

    // Send local tracks
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Receive remote tracks
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        audioEl.srcObject = event.streams[0];
      } else {
        remoteStream.addTrack(event.track);
        audioEl.srcObject = remoteStream;
      }

      const tryPlay = () => {
        audioEl.play().catch(() => {
          // Autoplay policy: unlock on first touch/click
          const unlock = () => {
            audioEl.play().catch(() => {});
            window.removeEventListener('click', unlock);
            window.removeEventListener('touchstart', unlock);
          };
          window.addEventListener('click', unlock, { once: true });
          window.addEventListener('touchstart', unlock, { once: true });
        });
      };
      tryPlay();
    };

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && this.localPlayerId) {
        multiplayerService.broadcast({
          type: 'VOICE_SIGNAL',
          fromPlayerId: this.localPlayerId,
          toPlayerId: remotePlayerId,
          signal: { type: 'candidate', candidate: event.candidate },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.closePeer(remotePlayerId);
      }
    };

    return pc;
  }

  private closePeer(remotePlayerId: string) {
    const peerData = this.peers.get(remotePlayerId);
    if (peerData) {
      try {
        peerData.pc.close();
        peerData.audioEl.srcObject = null;
        peerData.audioEl.remove();
      } catch {
        // ignore
      }
      this.peers.delete(remotePlayerId);
    }
  }

  private notifyPermission() {
    this.onPermissionCallbacks.forEach((cb) => cb(this.permissionState));
  }

  /**
   * Shuts down all voice connections and releases microphone
   */
  public disconnect() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.speakingThrottleTimer) {
      clearTimeout(this.speakingThrottleTimer);
      this.speakingThrottleTimer = null;
    }

    this.peers.forEach((peerData) => {
      try {
        peerData.pc.close();
        peerData.audioEl.srcObject = null;
        peerData.audioEl.remove();
      } catch {
        // ignore
      }
    });
    this.peers.clear();

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    this.sourceNode = null;
    this.analyser = null;
  }
}

export const voiceService = new VoiceService();
