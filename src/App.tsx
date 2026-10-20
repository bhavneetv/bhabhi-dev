import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type {
  Player,
  Card,
  Trick,
  RoomSettings,
  GamePhase,
  Theme,
  ChatMessage,
  BotDifficulty,
  SortMode,
} from './types/game';
import {
  dealCards,
  findStartingPlayerIndex,
  canPlayCard,
  resolveCleanOutcome,
  resolveThullaOutcome,
  getNextActivePlayerIndex,
  updateOutStatus,
  botChooseCard,
  sortHand,
} from './engine/bhabhiEngine';
import { soundSynth } from './audio/soundSynth';
import { CardView } from './components/CardView';
import { PlayerSeat } from './components/PlayerSeat';
import { TableCenter } from './components/TableCenter';
import type { ThullaBannerInfo, CleanBannerInfo } from './components/TableCenter';
import { FlyingCardOverlay } from './components/FlyingCardOverlay';
import type { FlyingCardItem } from './components/FlyingCardOverlay';
import { VoiceChatBar } from './components/VoiceChatBar';
import { voiceService } from './network/voiceService';
import { ResultsModal } from './components/ResultsModal';
import { TutorialModal } from './components/TutorialModal';
import { ChatDrawer } from './components/ChatDrawer';
import { LobbyView } from './components/LobbyView';
import { HomeScreen } from './components/HomeScreen';
import { TakeCardsModal } from './components/TakeCardsModal';
import { TransferRequestModal, type TransferRequestInfo } from './components/TransferRequestModal';
import { RenamePlayerModal } from './components/RenamePlayerModal';
import { NetworkLagOverlay } from './components/NetworkLagOverlay';
import { ThullaOverlay } from './components/ThullaOverlay';
import { multiplayerService, type NetworkEvent } from './network/multiplayerSync';
import {
  Volume2,
  VolumeX,
  HelpCircle,
  MessageSquare,
  Sparkles,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Home,
  ArrowUpDown,
  Layers,
  MoreVertical,
  ArrowLeftRight,
  Wifi,
  WifiOff,
} from 'lucide-react';

const DEFAULT_SETTINGS: RoomSettings = {
  deckCount: 1,
  tieRule: 'first',
  turnTimerSeconds: 15,
  equalHands: false,
  pickupMode: 'auto',
  neutralNames: false,
  cardTracker: true,
  voiceEnabled: true,
  maxPlayers: 8,
  fourColorSuits: false,
  animationSpeed: 'normal',
};

const getInitialRoomCode = (): string => {
  if (typeof window !== 'undefined') {
    const stayHome = sessionStorage.getItem('bhabhi_stay_home') === 'true';
    const leftRoom = sessionStorage.getItem('bhabhi_left_room')?.toUpperCase().trim();
    const params = new URLSearchParams(window.location.search);
    const paramRoom = params.get('room')?.toUpperCase().trim();

    // If user explicitly left this room or chose to stay on Home
    if (stayHome || (paramRoom && paramRoom === leftRoom)) {
      return Math.random().toString(36).substring(2, 8).toUpperCase().replace(/0|O|1|I/g, 'X');
    }

    if (paramRoom && paramRoom.length >= 3) {
      return paramRoom;
    }
    const saved = localStorage.getItem('bhabhi_room_code');
    if (saved && !stayHome) return saved;
  }
  return Math.random().toString(36).substring(2, 8).toUpperCase().replace(/0|O|1|I/g, 'X');
};

const isHostForRoom = (code: string): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(`bhabhi_is_host_${code.toUpperCase().trim()}`) === 'true';
};

const FUN_GUEST_NAMES = [
  'Royal Tiger', 'Ace Hunter', 'Desi King', 'Simran', 'Kabir',
  'Falcon', 'Sher Khan', 'Veer', 'Ananya', 'Badshah', 'Ninja',
  'Rohan', 'Pooja', 'Samar', 'Rocky'
];

const getInitialPlayerId = (): string => {
  if (typeof window !== 'undefined') {
    const win = window as any;
    if (win.__BHABHI_PLAYER_ID__) {
      return win.__BHABHI_PLAYER_ID__;
    }
    // Prevent cloned sessionStorage across window.open / target="_blank"
    try {
      if (window.name && window.name.startsWith('bhabhi_pid_')) {
        const id = window.name.replace('bhabhi_pid_', '');
        win.__BHABHI_PLAYER_ID__ = id;
        return id;
      }
    } catch {}

    const newId = `p_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}_${Math.floor(Math.random() * 10000)}`;
    try {
      window.name = `bhabhi_pid_${newId}`;
    } catch {}
    win.__BHABHI_PLAYER_ID__ = newId;
    return newId;
  }
  return `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
};

const getInitialPlayerName = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('bhabhi_player_name');
    if (saved && saved.trim() && saved.trim() !== 'Player' && saved.trim() !== 'Player (Host)') {
      return saved.trim();
    }
    const randomName = `${FUN_GUEST_NAMES[Math.floor(Math.random() * FUN_GUEST_NAMES.length)]} ${Math.floor(Math.random() * 89 + 10)}`;
    try {
      localStorage.setItem('bhabhi_player_name', randomName);
    } catch {}
    return randomName;
  }
  return 'Player';
};

const AVATARS = ['😎', '🤠', '🥷', '👑', '🦁', '🦊', '🐯', '🐼', '🤖', '👾', '🚀', '🃏'];

const getInitialPlayerAvatar = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('bhabhi_player_avatar');
    if (saved && saved.trim()) return saved.trim();
    const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)] || '😎';
    try {
      localStorage.setItem('bhabhi_player_avatar', avatar);
    } catch {}
    return avatar;
  }
  return '😎';
};

const DEFAULT_BOTS: Player[] = [
  {
    id: 'bot1',
    name: 'Aman (Bot)',
    avatar: '🦁',
    isBot: true,
    botDifficulty: 'medium',
    cards: [],
    seatIndex: 1,
    isHost: false,
    isReady: true,
    isOut: false,
    finishPosition: null,
    consecutiveTimeouts: 0,
  },
  {
    id: 'bot2',
    name: 'Neha (Bot)',
    avatar: '🦊',
    isBot: true,
    botDifficulty: 'medium',
    cards: [],
    seatIndex: 2,
    isHost: false,
    isReady: true,
    isOut: false,
    finishPosition: null,
    consecutiveTimeouts: 0,
  },
  {
    id: 'bot3',
    name: 'Riya (Bot)',
    avatar: '👑',
    isBot: true,
    botDifficulty: 'hard',
    cards: [],
    seatIndex: 3,
    isHost: false,
    isReady: true,
    isOut: false,
    finishPosition: null,
    consecutiveTimeouts: 0,
  },
];

export const App: React.FC = () => {
  // Theme & screen state
  const [theme, setTheme] = useState<Theme>('emerald');
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Modals state
  const [showTutorial, setShowTutorial] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showTakeModal, setShowTakeModal] = useState(false);
  const [renameTargetPlayer, setRenameTargetPlayer] = useState<Player | null>(null);
  const [incomingTransferRequest, setIncomingTransferRequest] = useState<TransferRequestInfo | null>(null);

  // Privacy Mode State (When ON: cards hide when not my turn, reveal when my turn, and auto-hide again after turn!)
  const [privacyMode, setPrivacyMode] = useState<boolean>(false);
  const [isHandHidden, setIsHandHidden] = useState<boolean>(false);

  // Room & Player setup
  const isUrlJoining = typeof window !== 'undefined' && (() => {
    const stayHome = sessionStorage.getItem('bhabhi_stay_home') === 'true';
    const leftRoom = sessionStorage.getItem('bhabhi_left_room')?.toUpperCase().trim();
    const params = new URLSearchParams(window.location.search);
    const paramRoom = params.get('room')?.toUpperCase().trim();

    if (stayHome || (paramRoom && paramRoom === leftRoom)) {
      try {
        window.history.replaceState({}, '', window.location.pathname);
      } catch {
        // ignore
      }
      return false;
    }
    return !!(paramRoom && paramRoom.length >= 3);
  })();

  const [roomCode, setRoomCode] = useState<string>(getInitialRoomCode);
  const [localPlayerId] = useState<string>(getInitialPlayerId);
  const [playerName, setPlayerName] = useState<string>(getInitialPlayerName);
  const [playerAvatar, setPlayerAvatar] = useState<string>(getInitialPlayerAvatar);
  const [isOnlineConnected, setIsOnlineConnected] = useState<boolean>(false);
  const [localPing, setLocalPing] = useState<number>(25);
  const [sortMode, setSortMode] = useState<SortMode>('suit');
  const [mobileLayoutMode, setMobileLayoutMode] = useState<'two-row' | 'single'>('two-row');

  const [settings, setSettings] = useState<RoomSettings>(DEFAULT_SETTINGS);
  const [gamePhase, setGamePhase] = useState<GamePhase>(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('bhabhi_stay_home') === 'true') {
      return 'HOME';
    }
    return isUrlJoining ? 'LOBBY' : 'HOME';
  });

  const [players, setPlayers] = useState<Player[]>(() => {
    const initCode = getInitialRoomCode();
    const isHost = isHostForRoom(initCode) || (!isUrlJoining);
    return [
      {
        id: getInitialPlayerId(),
        name: getInitialPlayerName(),
        avatar: getInitialPlayerAvatar(),
        isBot: false,
        cards: [],
        seatIndex: 0,
        isHost,
        isReady: true,
        isOut: false,
        finishPosition: null,
        consecutiveTimeouts: 0,
        isOnline: true,
      },
    ];
  });

  // Game Play State
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string>('p1');
  const [turnTimeLeft, setTurnTimeLeft] = useState<number>(0);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isFirstTrick, setIsFirstTrick] = useState<boolean>(true);
  const [currentTrick, setCurrentTrick] = useState<Trick>({ leadSuit: null, plays: [] });
  const [deadPile, setDeadPile] = useState<Card[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Flying Cards Animation State
  const [flyingCards, setFlyingCards] = useState<FlyingCardItem[]>([]);
  const flyingCardIds = useMemo(() => new Set(flyingCards.map((f) => f.card.id)), [flyingCards]);
  const [isAnimatingPlay, setIsAnimatingPlay] = useState<boolean>(false);
  const [isDiscardingTrick, setIsDiscardingTrick] = useState<boolean>(false);

  // On-table Thulla & Clean Banners
  const [thullaBanner, setThullaBanner] = useState<ThullaBannerInfo | null>(null);
  const [cleanBanner, setCleanBanner] = useState<CleanBannerInfo | null>(null);

  // Seat Status Badges
  const [cutterPlayerId, setCutterPlayerId] = useState<string | null>(null);
  const [pickerPlayerId, setPickerPlayerId] = useState<string | null>(null);


  // Manual pickup prompt
  const [manualPickupRequired, setManualPickupRequired] = useState(false);
  const [pendingPickupAction, setPendingPickupAction] = useState<(() => void) | null>(null);

  // Bhabhi results
  const [bhabhiPlayer, setBhabhiPlayer] = useState<Player | null>(null);

  // Chat messages
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'sys-1',
      senderId: 'sys',
      senderName: 'System',
      text: 'Welcome to Bhabhi Dever (Thulla) Online! Ready to shed your cards?',
      isSystem: true,
      timestamp: Date.now(),
    },
  ]);

  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const localPlayer = useMemo((): Player => {
    const found = players.find((p) => p.id === localPlayerId);
    if (found) return found;
    return {
      id: localPlayerId,
      name: playerName,
      avatar: playerAvatar,
      isBot: false,
      cards: [],
      seatIndex: 0,
      isHost: isHostForRoom(roomCode),
      isReady: true,
      isOut: false,
      finishPosition: null,
      consecutiveTimeouts: 0,
      isOnline: true,
    };
  }, [players, localPlayerId, playerName, playerAvatar, roomCode]);

  // Fresh state refs to prevent network event handler desync or stale closures
  const playersRef = useRef(players);
  playersRef.current = players;

  const currentTurnPlayerIdRef = useRef(currentTurnPlayerId);
  currentTurnPlayerIdRef.current = currentTurnPlayerId;

  const currentTrickRef = useRef(currentTrick);
  currentTrickRef.current = currentTrick;

  const deadPileRef = useRef(deadPile);
  deadPileRef.current = deadPile;

  const isFirstTrickRef = useRef(isFirstTrick);
  isFirstTrickRef.current = isFirstTrick;

  const gamePhaseRef = useRef(gamePhase);
  gamePhaseRef.current = gamePhase;

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const themeRef = useRef(theme);
  themeRef.current = theme;

  const localPlayerRef = useRef(localPlayer);
  localPlayerRef.current = localPlayer;

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const addChatMessage = useCallback((text: string, sender: Player, isSystem = false, shouldBroadcast = true) => {
    const newMsg: ChatMessage = {
      id: Math.random().toString(),
      senderId: sender.id,
      senderName: sender.name,
      text,
      isSystem,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, newMsg]);
    if (shouldBroadcast) {
      multiplayerService.broadcast({
        type: 'CHAT_MESSAGE',
        message: newMsg,
      });
    }
  }, []);

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const [windowWidth, setWindowWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 800
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // When privacy mode is active:
  // - Automatically show cards when it becomes the player's turn.
  // - Automatically re-hide cards as soon as the player's turn ends!
  useEffect(() => {
    if (privacyMode) {
      if (currentTurnPlayerId === localPlayer.id) {
        setIsHandHidden(false);
      } else {
        setIsHandHidden(true);
      }
    }
  }, [privacyMode, currentTurnPlayerId, localPlayer.id]);

  const togglePrivacyMode = () => {
    setPrivacyMode((prev) => {
      const next = !prev;
      if (next) {
        setIsHandHidden(currentTurnPlayerId !== localPlayer.id);
        showToast('Privacy Mode ON — Cards auto-hide when not your turn');
      } else {
        setIsHandHidden(false);
        showToast('Privacy Mode OFF — Cards always visible');
      }
      return next;
    });
  };

  // Save session details to localStorage (only persist room code when actively in lobby or playing)
  useEffect(() => {
    if (gamePhase !== 'HOME') {
      localStorage.setItem('bhabhi_room_code', roomCode);
    }
    localStorage.setItem('bhabhi_player_id', localPlayerId);
    localStorage.setItem('bhabhi_player_name', localPlayer.name);
  }, [gamePhase, roomCode, localPlayerId, localPlayer.name]);

  // Save active game state for seamless reconnection after phone sleep or refresh
  useEffect(() => {
    if (gamePhase === 'PLAYING') {
      try {
        const snapshot = {
          roomCode,
          players,
          currentTurnPlayerId,
          currentTrick,
          deadPile,
          isFirstTrick,
          gamePhase,
          settings,
          theme,
          savedAt: Date.now(),
        };
        localStorage.setItem('bhabhi_active_game', JSON.stringify(snapshot));
      } catch {
        // storage quota
      }
    } else if (gamePhase === 'GAME_OVER' || gamePhase === 'HOME') {
      localStorage.removeItem('bhabhi_active_game');
    }
  }, [gamePhase, roomCode, players, currentTurnPlayerId, currentTrick, deadPile, isFirstTrick, settings, theme]);

  // Restore game state from localStorage if recent session exists
  useEffect(() => {
    try {
      const stayHome = sessionStorage.getItem('bhabhi_stay_home') === 'true';
      if (stayHome) {
        localStorage.removeItem('bhabhi_active_game');
        return;
      }
      const saved = localStorage.getItem('bhabhi_active_game');
      if (saved) {
        const data = JSON.parse(saved);
        if (Date.now() - data.savedAt < 2 * 60 * 60 * 1000 && data.gamePhase === 'PLAYING') {
          console.log('[Resume] Restoring active game from saved session');
          setPlayers(data.players);
          setCurrentTurnPlayerId(data.currentTurnPlayerId);
          setCurrentTrick(data.currentTrick);
          setDeadPile(data.deadPile || []);
          setIsFirstTrick(data.isFirstTrick ?? false);
          setSettings(data.settings);
          setTheme(data.theme);
          setGamePhase('PLAYING');
          showToast('Game session resumed from previous state!');
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const handleJoinRoom = (code: string) => {
    const clean = code.toUpperCase().trim();
    if (!clean) return;
    try {
      sessionStorage.removeItem('bhabhi_stay_home');
      sessionStorage.removeItem('bhabhi_left_room');
    } catch {
      // ignore
    }
    setRoomCode(clean);
    localStorage.setItem('bhabhi_room_code', clean);
    if (typeof window !== 'undefined') {
      try {
        window.history.pushState({}, '', `${window.location.pathname}?room=${clean}`);
      } catch {
        // ignore
      }
    }
    const isHost = isHostForRoom(clean);
    const me: Player = {
      id: localPlayerId,
      name: playerName || (isHost ? 'Player (Host)' : 'Player'),
      avatar: playerAvatar || '😎',
      isBot: false,
      cards: [],
      seatIndex: 0,
      isHost,
      isReady: true,
      isOut: false,
      finishPosition: null,
      consecutiveTimeouts: 0,
      isOnline: true,
      ping: localPing,
    };
    setPlayers([me]);
    playersRef.current = [me];
    setGamePhase('LOBBY');
    showToast(`Joining room ${clean}...`);

    multiplayerService.joinRoomOnServer(
      clean,
      { id: localPlayerId, name: me.name, avatar: me.avatar },
      (res) => {
        if (res && res.success && res.state) {
          setPlayers(res.state.players);
          playersRef.current = res.state.players;
          if (res.state.gamePhase) setGamePhase(res.state.gamePhase);
          if (res.state.currentTrick) setCurrentTrick(res.state.currentTrick);
          if (res.state.currentTurnPlayerId) setCurrentTurnPlayerId(res.state.currentTurnPlayerId);
        } else if (res && !res.success) {
          showToast(res.error || 'Failed to join room');
        }
      }
    );
  };

  const handleCreateRoom = () => {
    const fallbackCode = Math.random().toString(36).substring(2, 8).toUpperCase().replace(/0|O|1|I/g, 'X');
    try {
      sessionStorage.removeItem('bhabhi_stay_home');
      sessionStorage.removeItem('bhabhi_left_room');
    } catch {
      // ignore
    }

    const me: Player = {
      id: localPlayerId,
      name: playerName || 'Player (Host)',
      avatar: playerAvatar || '😎',
      isBot: false,
      cards: [],
      seatIndex: 0,
      isHost: true,
      isReady: true,
      isOut: false,
      finishPosition: null,
      consecutiveTimeouts: 0,
      isOnline: true,
      ping: localPing,
    };
    setRoomCode(fallbackCode);
    localStorage.setItem('bhabhi_room_code', fallbackCode);
    localStorage.setItem(`bhabhi_is_host_${fallbackCode}`, 'true');
    if (typeof window !== 'undefined') {
      try {
        window.history.pushState({}, '', `${window.location.pathname}?room=${fallbackCode}`);
      } catch {}
    }

    setPlayers([me]);
    playersRef.current = [me];
    setGamePhase('LOBBY');

    multiplayerService.createRoomOnServer(
      { id: localPlayerId, name: me.name, avatar: me.avatar },
      fallbackCode,
      settings,
      theme,
      (res) => {
        const finalCode = res?.success && res.roomCode ? res.roomCode : fallbackCode;
        if (finalCode !== fallbackCode) {
          setRoomCode(finalCode);
          localStorage.setItem('bhabhi_room_code', finalCode);
          localStorage.setItem(`bhabhi_is_host_${finalCode}`, 'true');
        }
        if (res?.state?.players) {
          setPlayers(res.state.players);
          playersRef.current = res.state.players;
        }
        showToast(`Created room ${finalCode}! Share the code with friends.`);
      }
    );
  };

  const handleSoloPractice = () => {
    try {
      sessionStorage.removeItem('bhabhi_stay_home');
      sessionStorage.removeItem('bhabhi_left_room');
    } catch {
      // ignore
    }
    const me: Player = {
      id: localPlayerId,
      name: playerName || 'Player (You)',
      avatar: playerAvatar || '😎',
      isBot: false,
      cards: [],
      seatIndex: 0,
      isHost: true,
      isReady: true,
      isOut: false,
      finishPosition: null,
      consecutiveTimeouts: 0,
      isOnline: true,
    };
    setPlayers([me, ...DEFAULT_BOTS]);
    setGamePhase('LOBBY');
    showToast('Solo practice ready with bots!');
  };

  const handleUpdateProfile = (newName: string, newAvatar: string) => {
    const cleanName = newName.trim() || 'Player';
    setPlayerName(cleanName);
    setPlayerAvatar(newAvatar);
    localStorage.setItem('bhabhi_player_name', cleanName);
    localStorage.setItem('bhabhi_player_avatar', newAvatar);
    setPlayers((prev) =>
      prev.map((p) => (p.id === localPlayerId ? { ...p, name: cleanName, avatar: newAvatar } : p))
    );
    if (gamePhase !== 'HOME') {
      multiplayerService.broadcast({
        type: 'PLAYER_RENAME',
        playerId: localPlayerId,
        newName: cleanName,
        renamedBy: cleanName,
      });
    }
  };

  const handleGoHome = () => {
    // Notify room peers that this player is leaving
    try {
      multiplayerService.broadcast({
        type: 'PLAYER_LEAVE',
        playerId: localPlayerId,
      });
    } catch {}

    voiceService.disconnect();
    multiplayerService.disconnect();

    // 1. Wipe active game state and room code so reload won't restore previous game
    localStorage.removeItem('bhabhi_active_game');
    localStorage.removeItem('bhabhi_room_code');

    // 2. Mark that user intentionally returned to home screen
    try {
      sessionStorage.setItem('bhabhi_stay_home', 'true');
      sessionStorage.setItem('bhabhi_left_room', roomCode);
    } catch {
      // ignore
    }

    // 3. Clear URL query parameters
    if (typeof window !== 'undefined') {
      try {
        window.history.replaceState({}, '', window.location.pathname);
      } catch {
        // ignore
      }
    }

    // 4. Reset game state and players to clean solo profile
    const me: Player = {
      id: localPlayerId,
      name: playerName || 'Player',
      avatar: playerAvatar || '😎',
      isBot: false,
      cards: [],
      seatIndex: 0,
      isHost: true,
      isReady: true,
      isOut: false,
      finishPosition: null,
      consecutiveTimeouts: 0,
      isOnline: true,
    };
    setPlayers([me]);
    playersRef.current = [me];
    setCurrentTrick({ leadSuit: null, plays: [] });
    setDeadPile([]);

    setGamePhase('HOME');
    showToast('Returned to main menu');
  };

  const handleRenamePlayer = (playerId: string, newName: string) => {
    const cleanName = newName.trim();
    if (!cleanName) return;
    setPlayers((prev) => {
      const updated = prev.map((p) => (p.id === playerId ? { ...p, name: cleanName } : p));
      playersRef.current = updated;
      return updated;
    });
    if (playerId === localPlayerId) {
      setPlayerName(cleanName);
      try {
        localStorage.setItem('bhabhi_player_name', cleanName);
      } catch {}
    }
    multiplayerService.broadcast({
      type: 'PLAYER_RENAME',
      playerId,
      newName: cleanName,
      renamedBy: localPlayer.name,
    });
    showToast(`Name updated to ${cleanName}`);
  };

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

// Arrange opponents in consistent clockwise seating order relative to local player
const getClockwiseOpponents = (allPlayers: Player[], localId: string): Player[] => {
  const localIndex = allPlayers.findIndex((p) => p.id === localId);
  if (localIndex === -1) {
    return allPlayers.filter((p) => p.id !== localId);
  }
  const n = allPlayers.length;
  const ordered: Player[] = [];
  for (let step = 1; step < n; step++) {
    const opp = allPlayers[(localIndex + step) % n];
    if (opp && opp.id !== localId) {
      ordered.push(opp);
    }
  }
  return ordered;
};

// Compute table percentage coordinates for each player seat in guaranteed clockwise sequence
const getPlayerSeatCoords = useCallback(
  (playerId: string): { left: number; top: number } => {
    if (playerId === localPlayer.id) {
      return { left: 50, top: 88 };
    }
    const list = playersRef.current.length > 0 ? playersRef.current : players;
    const opponents = getClockwiseOpponents(list, localPlayer.id);
    const oppIndex = opponents.findIndex((p) => p.id === playerId);
    if (oppIndex === -1) {
      return { left: 50, top: 18 };
    }

    const count = opponents.length;
    const arcStart = 200;
    const arcEnd = -20;
    const step = count > 1 ? (arcStart - arcEnd) / (count - 1) : 0;
    const currentAngleDeg = count === 1 ? 90 : arcStart - oppIndex * step;
    const currentAngleRad = (currentAngleDeg * Math.PI) / 180;
    const radiusX = 43;
    const radiusY = 38;
    const leftPct = 50 + radiusX * Math.cos(currentAngleRad);
    const topPct = 50 - radiusY * Math.sin(currentAngleRad);

    return { left: leftPct, top: topPct };
  },
  [players, localPlayer.id]
);

  // Keyboard shortcut listener ('F' for Fullscreen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      if (e.key.toLowerCase() === 'f') {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Broadcast PLAYER_LEAVE if browser window/tab is closed while in a game or lobby
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (gamePhase === 'PLAYING' || gamePhase === 'LOBBY') {
        try {
          multiplayerService.broadcast({
            type: 'PLAYER_LEAVE',
            playerId: localPlayerId,
          });
        } catch {}
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [gamePhase, localPlayerId]);

  // Handle Turn Timer countdown
  useEffect(() => {
    if (gamePhase !== 'PLAYING' || settings.turnTimerSeconds <= 0) return;

    setTurnTimeLeft(settings.turnTimerSeconds);
    const interval = setInterval(() => {
      setTurnTimeLeft((prev) => {
        if (prev <= 1) {
          autoPlayCurrentPlayer();
          return settings.turnTimerSeconds;
        }
        if (prev === 4) {
          soundSynth.playWarningAlarm();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentTurnPlayerId, gamePhase, settings.turnTimerSeconds]);

  const executePlayCardRef = useRef<(playerId: string, card: Card, shouldBroadcast?: boolean) => void>(() => {});

  // Play a card with visible flight animation from player hand/seat to board center
  const executePlayCard = useCallback(
    (playerId: string, card: Card, shouldBroadcast = true) => {
      if (isAnimatingPlay) return;

      const playerIndex = players.findIndex((p) => p.id === playerId);
      if (playerIndex === -1) return;
      const player = players[playerIndex];

      // Validate legality
      const validation = canPlayCard(player.cards, card, currentTrick.leadSuit, isFirstTrick);
      if (!validation.legal) {
        if (playerId === localPlayer.id) {
          showToast(validation.reason || 'Illegal move!');
          soundSynth.triggerHaptic([40, 40]);
        }
        return;
      }

      // Broadcast move to all connected players across the internet & authoritative server
      if (shouldBroadcast) {
        if (multiplayerService.isServerConnected()) {
          // Connected to authoritative server: send only via playCardOnServer for the local player
          if (playerId === localPlayer.id) {
            multiplayerService.playCardOnServer(card.id, (ack) => {
              if (ack && !ack.success && ack.error) {
                showToast(ack.error);
              }
            });
          }
        } else {
          // Offline fallback mode across tabs
          multiplayerService.broadcast({
            type: 'PLAY_CARD',
            playerId,
            card,
          });
        }
      }

      setIsAnimatingPlay(true);
      setSelectedCardId(null);

      // Start position from player's seat / hand
      const fromCoords = getPlayerSeatCoords(playerId);
      const toCoords = { left: 50, top: 48 };

      const isLead = !currentTrick.leadSuit;
      const isThulla = !isLead && card.suit !== currentTrick.leadSuit;

      // Single sound design: No sound during rotation; only play card impact sound when card lands on table!

      // Launch flying card animation with weighted, smooth, clearly visible motion
      const flightDuration = isThulla ? 1250 : 850;
      const flyingId = `flight-${card.id}-${Date.now()}`;
      setFlyingCards((prev) => [
        ...prev,
        {
          id: flyingId,
          card,
          from: fromCoords,
          to: toCoords,
          durationMs: flightDuration,
          startRotation: 0,
          endRotation: isThulla ? 1080 : Math.floor(Math.random() * 20 - 10),
          isThulla,
        },
      ]);

      // Remove card from player hand immediately for responsive feel
      const updatedHand = player.cards.filter((c) => c.id !== card.id);
      const updatedPlayers = [...players];
      updatedPlayers[playerIndex] = {
        ...player,
        cards: updatedHand,
        cardCount: updatedHand.length,
      };
      setPlayers(updatedPlayers);

      // After flight lands on table:
      setTimeout(() => {
        if (isThulla) {
          soundSynth.playThullaBoom();
        } else {
          soundSynth.playCardSnap();
        }

        setFlyingCards((prev) => prev.filter((f) => f.id !== flyingId));

        const newPlay = {
          playerId,
          card,
          isThulla,
          timestamp: Date.now(),
        };

        const updatedTrick: Trick = {
          leadSuit: currentTrick.leadSuit || card.suit,
          plays: [...currentTrick.plays, newPlay],
        };

        setCurrentTrick(updatedTrick);

        if (updatedHand.length === 1) {
          soundSynth.playWarningAlarm();
        }

        // ==========================================
        // CASE 1: THULLA CUT OCCURRED!
        // ==========================================
        if (isThulla) {
          const { pickerId, pickedCards } = resolveThullaOutcome(updatedTrick, settings.tieRule);
          const picker = updatedPlayers.find((p) => p.id === pickerId);
          const highestLeadCard = updatedTrick.plays
            .filter((p) => p.card.suit === updatedTrick.leadSuit)
            .sort((a, b) => b.card.value - a.card.value)[0]?.card;

          setCutterPlayerId(playerId);
          setPickerPlayerId(pickerId);

          const bannerInfo: ThullaBannerInfo = {
            cutterName: player.name,
            pickerName: picker?.name || 'Picker',
            cutCard: card,
            highestLeadCard,
            pickedCount: pickedCards.length,
          };
          setThullaBanner(bannerInfo);

          addChatMessage(
            `💥 THULLA! ${player.name} cut with ${card.rank} of ${card.suit}! ${picker?.name} takes ${pickedCards.length} cards!`,
            player,
            true
          );

          const finalizeThulla = () => {
            const pickerCoords = getPlayerSeatCoords(pickerId);
            const pickupFlights: FlyingCardItem[] = updatedTrick.plays.map((p, pIdx) => ({
              id: `pickup-${pIdx}-${Date.now()}`,
              card: p.card,
              from: { left: 50, top: 48 },
              to: pickerCoords,
              durationMs: 950,
              startRotation: 0,
              endRotation: 720 + (pIdx * 90),
            }));

            setFlyingCards(pickupFlights);
            setCurrentTrick({ leadSuit: null, plays: [] });

            setTimeout(() => {
              setFlyingCards([]);
              soundSynth.playPickup();

              const pickerIdx = updatedPlayers.findIndex((p) => p.id === pickerId);
              if (pickerIdx !== -1) {
                const currentCards = updatedPlayers[pickerIdx].cards;
                updatedPlayers[pickerIdx] = {
                  ...updatedPlayers[pickerIdx],
                  cards: sortHand([...currentCards, ...pickedCards]),
                  cardCount: currentCards.length + pickedCards.length,
                };
              }

              const { updatedPlayers: postOutPlayers, newlyOut } = updateOutStatus(
                updatedPlayers,
                pickerId
              );

              newlyOut.forEach((outP) => {
                if (outP.finishPosition === 1) {
                  soundSynth.playVictory();
                  addChatMessage(`🏆 ${outP.name} is the 1st safe player (Dever)!`, outP, true);
                } else {
                  addChatMessage(`✅ ${outP.name} shed all cards and is SAFE #${outP.finishPosition}!`, outP, true);
                }
              });

              const remainingWithCards = postOutPlayers.filter((p) => !p.isOut && p.cards.length > 0);
              if (remainingWithCards.length <= 1) {
                const loser = remainingWithCards[0] || null;
                setBhabhiPlayer(loser);
                setGamePhase('GAME_OVER');
                setPlayers(postOutPlayers);
                setThullaBanner(null);
                setCutterPlayerId(null);
                setPickerPlayerId(null);
                setIsAnimatingPlay(false);
                return;
              }

              setIsFirstTrick(false);
              setPlayers(postOutPlayers);
              setCurrentTurnPlayerId(pickerId);
              setThullaBanner(null);
              setCutterPlayerId(null);
              setPickerPlayerId(null);
              setIsAnimatingPlay(false);
            }, 1000);
          };

          if (settings.pickupMode === 'manual' && pickerId === localPlayer.id) {
            setManualPickupRequired(true);
            setPendingPickupAction(() => finalizeThulla);
          } else {
            setTimeout(finalizeThulla, 2400);
          }
          return;
        }

        // ==========================================
        // CASE 2: CLEAN TRICK OR ADVANCE TURN
        // ==========================================
        const activePlayers = updatedPlayers.filter((p) => !p.isOut || p.cards.length > 0);
        const allActivePlayed = updatedTrick.plays.length >= activePlayers.length;

        if (allActivePlayed) {
          const { winnerId, discardedCards } = resolveCleanOutcome(updatedTrick, settings.tieRule);
          const winnerObj = updatedPlayers.find((p) => p.id === winnerId);
          const winningCard = updatedTrick.plays.find((p) => p.playerId === winnerId)?.card || card;

          setCleanBanner({
            winnerName: winnerObj?.name || 'Winner',
            winningCard,
          });

          setTimeout(() => {
            setIsDiscardingTrick(true);
            soundSynth.playDiscardSwoosh();

            setTimeout(() => {
              setIsDiscardingTrick(false);
              setDeadPile((prev) => [...prev, ...discardedCards]);
              setCleanBanner(null);
              setCurrentTrick({ leadSuit: null, plays: [] });

              const { updatedPlayers: postOutPlayers, newlyOut } = updateOutStatus(updatedPlayers);

              newlyOut.forEach((outP) => {
                if (outP.finishPosition === 1) {
                  soundSynth.playVictory();
                  addChatMessage(`🏆 ${outP.name} is the 1st safe player (Dever)!`, outP, true);
                } else {
                  addChatMessage(`✅ ${outP.name} shed all cards and is SAFE #${outP.finishPosition}!`, outP, true);
                }
              });

              const remainingWithCards = postOutPlayers.filter((p) => !p.isOut && p.cards.length > 0);
              if (remainingWithCards.length <= 1) {
                const loser = remainingWithCards[0] || null;
                setBhabhiPlayer(loser);
                setGamePhase('GAME_OVER');
                setPlayers(postOutPlayers);
                setIsAnimatingPlay(false);
                return;
              }

              const currentWinner = postOutPlayers.find((p) => p.id === winnerId);
              let nextLeaderId = winnerId;
              if (!currentWinner || currentWinner.isOut || currentWinner.cards.length === 0) {
                const winnerIndex = postOutPlayers.findIndex((p) => p.id === winnerId);
                const nextActiveIdx = getNextActivePlayerIndex(postOutPlayers, winnerIndex);
                nextLeaderId = postOutPlayers[nextActiveIdx].id;
              }

              setIsFirstTrick(false);
              setPlayers(postOutPlayers);
              setCurrentTurnPlayerId(nextLeaderId);
              setIsAnimatingPlay(false);
            }, 450);
          }, 800);
        } else {
          // Advance turn to next active player
          const currentIdx = updatedPlayers.findIndex((p) => p.id === playerId);
          const nextIdx = getNextActivePlayerIndex(updatedPlayers, currentIdx);
          const nextPlayer = updatedPlayers[nextIdx];

          setPlayers(updatedPlayers);
          setCurrentTurnPlayerId(nextPlayer.id);
          setIsAnimatingPlay(false);

          if (nextPlayer.id === localPlayer.id) {
            soundSynth.playTurnChime();
          }
        }
      }, flightDuration);
    },
    [
      isAnimatingPlay,
      players,
      currentTrick,
      isFirstTrick,
      localPlayer.id,
      settings.tieRule,
      settings.pickupMode,
      getPlayerSeatCoords,
      showToast,
      addChatMessage,
    ]
  );

  const executeDirectTransferRef = useRef<
    (giverId: string, receiverId: string, shouldBroadcast?: boolean, forcedNextTurnId?: string) => void
  >(() => {});

  useEffect(() => {
    executePlayCardRef.current = executePlayCard;
  }, [executePlayCard]);

  // Network Event Handler for cross-network multiplayer
  const handleNetworkEvent = useCallback(
    (event: NetworkEvent) => {
      switch (event.type) {
        case 'PLAYER_JOIN': {
          if (event.player.id === localPlayerId) return;

          setPlayers((prev) => {
            const existingIdx = prev.findIndex((p) => p.id === event.player.id);
            if (existingIdx !== -1) {
              const updated = prev.map((p) =>
                p.id === event.player.id
                  ? { ...p, name: event.player.name, avatar: event.player.avatar, isOnline: true }
                  : p
              );
              playersRef.current = updated;
              return updated;
            }

            const newPlayer: Player = {
              ...event.player,
              seatIndex: prev.length,
              isBot: false,
              isOnline: true,
              isReady: true,
              cards: event.player.cards || [],
              cardCount: event.player.cardCount || 0,
              isOut: false,
              finishPosition: null,
              consecutiveTimeouts: 0,
              isHost: false, // only true room creator is host
            };
            const updated = [...prev, newPlayer];
            playersRef.current = updated;

            soundSynth.playCardDeal();
            showToast(`🎉 ${event.player.name} joined the room!`);
            addChatMessage(`🎉 ${event.player.name} joined the room!`, event.player, true, false);

            // If Host, broadcast current room state with the new player list to everyone!
            if (isHostForRoom(roomCode)) {
              setTimeout(() => {
                multiplayerService.broadcast({
                  type: 'SYNC_FULL_STATE',
                  state: {
                    players: updated,
                    currentTurnPlayerId: currentTurnPlayerIdRef.current,
                    currentTrick: currentTrickRef.current,
                    deadPile: deadPileRef.current,
                    gamePhase: gamePhaseRef.current,
                    isFirstTrick: isFirstTrickRef.current,
                    settings: settingsRef.current,
                    theme: themeRef.current,
                  },
                });
              }, 50);
            }

            return updated;
          });
          break;
        }

        case 'PLAYER_RENAME': {
          setPlayers((prev) => {
            const updated = prev.map((p) =>
              p.id === event.playerId ? { ...p, name: event.newName } : p
            );
            playersRef.current = updated;
            return updated;
          });
          if (event.playerId === localPlayerId) {
            setPlayerName(event.newName);
            try {
              localStorage.setItem('bhabhi_player_name', event.newName);
            } catch {}
          }
          showToast(`✏️ ${event.newName} updated name`);
          break;
        }

        case 'PLAYER_RECONNECT': {
          setPlayers((prev) => {
            const updated = prev.map((p) =>
              p.id === event.playerId ? { ...p, isOnline: true } : p
            );
            playersRef.current = updated;
            return updated;
          });
          showToast(`🔄 Player reconnected!`);
          break;
        }

        case 'PLAYER_LEAVE': {
          if (event.playerId === localPlayerId) return;

          const leavingPlayer = playersRef.current.find((p) => p.id === event.playerId);
          if (!leavingPlayer) return;

          showToast(`👋 ${leavingPlayer.name} left the game`);
          addChatMessage(`👋 ${leavingPlayer.name} left the room.`, leavingPlayer, true, false);

          if (gamePhaseRef.current !== 'PLAYING') {
            setPlayers((prev) => {
              const updated = prev.filter((p) => p.id !== event.playerId);
              playersRef.current = updated;
              return updated;
            });
            break;
          }

          // In PLAYING phase:
          // 1. Move departed player's remaining cards to deadPile so trick/game is not blocked
          if (leavingPlayer.cards && leavingPlayer.cards.length > 0) {
            setDeadPile((prev) => {
              const updated = [...prev, ...leavingPlayer.cards];
              deadPileRef.current = updated;
              return updated;
            });
          }

          // 2. Identify if it was currently their turn
          const wasTheirTurn = currentTurnPlayerIdRef.current === event.playerId;
          const currentList = playersRef.current;
          const currentIdx = currentList.findIndex((p) => p.id === event.playerId);

          // 3. Remove departed player from player list
          const remainingPlayers = currentList.filter((p) => p.id !== event.playerId);
          setPlayers(remainingPlayers);
          playersRef.current = remainingPlayers;

          // 4. If it was their turn, immediately advance to the next active player
          if (wasTheirTurn && remainingPlayers.length > 0) {
            const validIdx = currentIdx >= 0 ? currentIdx % remainingPlayers.length : 0;
            const nextIdx = getNextActivePlayerIndex(remainingPlayers, validIdx);
            if (nextIdx !== -1 && remainingPlayers[nextIdx]) {
              const nextP = remainingPlayers[nextIdx];
              setCurrentTurnPlayerId(nextP.id);
              currentTurnPlayerIdRef.current = nextP.id;
              setTurnTimeLeft(settingsRef.current.turnTimerSeconds || 15);
              showToast(`⏩ Turn skipped to ${nextP.name}`);
              addChatMessage(`⏩ Turn skipped to ${nextP.name} as ${leavingPlayer.name} left.`, nextP, true, false);
            }
          }

          // 5. Check if game is over (only 1 or 0 players left with cards)
          const remainingWithCards = remainingPlayers.filter((p) => !p.isOut && p.cards.length > 0);
          if (remainingWithCards.length <= 1 && remainingPlayers.length > 0) {
            const loser = remainingWithCards[0] || remainingPlayers[0];
            setBhabhiPlayer(loser);
            setGamePhase('GAME_OVER');
            gamePhaseRef.current = 'GAME_OVER';
            soundSynth.playVictory();
            addChatMessage(`🏁 GAME OVER! ${loser.name} is the BHABHI!`, loser, true);
            showToast(`Game Over! ${loser.name} is the Bhabhi!`);
          }
          break;
        }

        case 'GAME_START': {
          setPlayers(event.players);
          playersRef.current = event.players;
          setCurrentTrick(event.trick);
          currentTrickRef.current = event.trick;
          setCurrentTurnPlayerId(event.startingPlayerId);
          currentTurnPlayerIdRef.current = event.startingPlayerId;
          setIsFirstTrick(true);
          isFirstTrickRef.current = true;
          setDeadPile([]);
          deadPileRef.current = [];
          setThullaBanner(null);
          setCleanBanner(null);
          setCutterPlayerId(null);
          setPickerPlayerId(null);
          setIsDiscardingTrick(false);
          setGamePhase('PLAYING');
          gamePhaseRef.current = 'PLAYING';
          soundSynth.playCardDeal();
          showToast('Game started in real time!');
          break;
        }

        case 'PLAY_CARD': {
          if (event.playerId !== localPlayerId) {
            executePlayCardRef.current(event.playerId, event.card, false);
          }
          break;
        }

        case 'TAKE_OR_GIVE_CARDS': {
          executeDirectTransferRef.current(
            event.fromPlayerId,
            event.toPlayerId,
            false,
            event.nextTurnPlayerId
          );
          break;
        }

        case 'TRANSFER_REQUEST': {
          if (event.toPlayerId === localPlayerId) {
            soundSynth.playTurnChime();
            setIncomingTransferRequest({
              requestId: event.requestId,
              fromPlayerId: event.fromPlayerId,
              fromPlayerName: event.fromPlayerName,
              fromPlayerAvatar: event.fromPlayerAvatar,
              toPlayerId: event.toPlayerId,
              toPlayerName: event.toPlayerName,
              action: event.action,
              cardCount: event.cardCount,
            });
          }
          break;
        }

        case 'TRANSFER_RESPONSE': {
          if (!event.accepted) {
            if (event.fromPlayerId === localPlayerId) {
              showToast(`❌ ${event.toPlayerName} declined your card transfer request.`);
              soundSynth.triggerHaptic([50, 50]);
              addChatMessage(`${event.toPlayerName} declined card request from ${event.fromPlayerName}.`, localPlayerRef.current, true, false);
            }
          } else {
            // Target accepted!
            if (event.fromPlayerId === localPlayerId) {
              showToast(`✅ ${event.toPlayerName} accepted your card request!`);
              if (event.action === 'GIVE') {
                executeDirectTransferRef.current(localPlayerId, event.toPlayerId);
              }
            }
          }
          break;
        }

        case 'REQUEST_SYNC': {
          if (isHostForRoom(roomCode)) {
            multiplayerService.broadcast({
              type: 'SYNC_FULL_STATE',
              state: {
                players: playersRef.current,
                currentTurnPlayerId: currentTurnPlayerIdRef.current,
                currentTrick: currentTrickRef.current,
                deadPile: deadPileRef.current,
                gamePhase: gamePhaseRef.current,
                isFirstTrick: isFirstTrickRef.current,
                settings: settingsRef.current,
                theme: themeRef.current,
              },
              targetPlayerId: event.requesterId,
            });
          } else if (event.requesterId !== localPlayerId) {
            // Guest responds by re-announcing presence so host registers them
            multiplayerService.broadcast({
              type: 'PLAYER_JOIN',
              player: {
                id: localPlayerId,
                name: playerName,
                avatar: playerAvatar,
                isBot: false,
                cards: [],
                seatIndex: 0,
                isHost: false,
                isReady: true,
                isOut: false,
                finishPosition: null,
                consecutiveTimeouts: 0,
                isOnline: true,
              },
            });
          }
          break;
        }

        case 'CARD_PLAYED_ANIMATION': {
          if (event.playerId !== localPlayerId) {
            // 1. Visually remove the card from the opponent's hand immediately
            setPlayers((prev) =>
              prev.map((p) => {
                if (p.id === event.playerId) {
                  const updatedCards = p.cards ? p.cards.filter((c) => c.id !== event.card.id) : [];
                  const newCount = typeof event.remainingCards === 'number'
                    ? event.remainingCards
                    : Math.max(0, (p.cardCount || p.cards.length) - 1);
                  return {
                    ...p,
                    cards: updatedCards,
                    cardCount: newCount,
                  };
                }
                return p;
              })
            );

            // 2. Launch smooth flight animation from opponent seat to table center
            const fromCoords = getPlayerSeatCoords(event.playerId);
            const toCoords = { left: 50, top: 48 };
            const flightDuration = event.isThulla ? 1250 : 850;
            const flyingId = `flight-${event.card.id}-${Date.now()}`;

            setFlyingCards((prev) => [
              ...prev.filter((f) => f.card.id !== event.card.id),
              {
                id: flyingId,
                card: event.card,
                from: fromCoords,
                to: toCoords,
                durationMs: flightDuration,
                startRotation: 0,
                endRotation: event.isThulla ? 1080 : Math.floor(Math.random() * 20 - 10),
                isThulla: event.isThulla,
              },
            ]);

            // 3. Single sound guarantee: ONLY play card impact sound when it lands on table felt
            setTimeout(() => {
              if (event.isThulla) {
                soundSynth.playThullaBoom();
              } else {
                soundSynth.playCardSnap();
              }
              setFlyingCards((fList) => fList.filter((f) => f.id !== flyingId));
              setCurrentTrick(event.trick);
            }, flightDuration);
          } else {
            // Local player: trick state is saved; TableCenter reveals the card on felt when flight lands!
            setCurrentTrick(event.trick);
          }
          break;
        }

        case 'THULLA_ALERT': {
          setCutterPlayerId(event.cutterId);
          setPickerPlayerId(event.pickerId);
          setThullaBanner({
            cutterName: event.cutterName,
            pickerName: event.pickerName,
            cutCard: event.cutCard,
            highestLeadCard: event.cutCard,
            pickedCount: event.pickedCount,
          });

          // Single sound guarantee: cutter already triggered the boom locally upon card impact!
          if (event.cutterId !== localPlayerId) {
            soundSynth.playThullaBoom();
          }

          addChatMessage(
            `💥 THULLA! ${event.cutterName} cut with ${event.cutCard.rank} of ${event.cutCard.suit}! ${event.pickerName} takes ${event.pickedCount} cards!`,
            playersRef.current.find((p) => p.id === event.cutterId) || localPlayerRef.current,
            true
          );

          // After displaying the banner, smoothly fly all table cards to the picker's seat
          setTimeout(() => {
            const pickerCoords = getPlayerSeatCoords(event.pickerId);
            const currentPlays = currentTrickRef.current.plays;
            if (currentPlays.length > 0) {
              const pickupFlights: FlyingCardItem[] = currentPlays.map((p, pIdx) => ({
                id: `pickup-${pIdx}-${Date.now()}`,
                card: p.card,
                from: { left: 50, top: 48 },
                to: pickerCoords,
                durationMs: 950,
                startRotation: 0,
                endRotation: 720 + pIdx * 90,
              }));
              setFlyingCards(pickupFlights);
              setCurrentTrick({ leadSuit: null, plays: [] });

              setTimeout(() => {
                setFlyingCards([]);
                soundSynth.playPickup();
                setThullaBanner(null);
                setCutterPlayerId(null);
                setPickerPlayerId(null);
              }, 950);
            } else {
              setThullaBanner(null);
              setCutterPlayerId(null);
              setPickerPlayerId(null);
            }
          }, 2000);
          break;
        }

        case 'CLEAN_TRICK_ALERT': {
          setCleanBanner({
            winnerName: event.winnerName,
            winningCard: currentTrickRef.current.plays[0]?.card || { id: 'w', suit: 'spades', rank: 'A', deckIndex: 0, value: 14 },
          });
          soundSynth.playDiscardSwoosh();
          break;
        }

        case 'PLAYERS_OUT_ALERT': {
          event.newlyOut.forEach((outP) => {
            if (outP.finishPosition === 1) {
              soundSynth.playVictory();
              addChatMessage(`🏆 ${outP.name} is the 1st safe player (Dever)!`, outP, true);
              showToast(`🏆 ${outP.name} is SAFE #1 (Dever)!`);
            } else {
              addChatMessage(`✅ ${outP.name} shed all cards and is SAFE #${outP.finishPosition}!`, outP, true);
              showToast(`✅ ${outP.name} is SAFE #${outP.finishPosition}!`);
            }
          });
          break;
        }

        case 'TURN_TIMER_TICK': {
          setTurnTimeLeft(event.turnTimeLeft);
          if (event.currentTurnPlayerId && event.currentTurnPlayerId !== currentTurnPlayerIdRef.current) {
            setCurrentTurnPlayerId(event.currentTurnPlayerId);
            currentTurnPlayerIdRef.current = event.currentTurnPlayerId;
          }
          break;
        }

        case 'PING_UPDATE': {
          setPlayers((prev) =>
            prev.map((p) => (p.id === event.playerId ? { ...p, ping: event.ping } : p))
          );
          break;
        }

        case 'SYNC_FULL_STATE': {
          if (event.toast) {
            showToast(event.toast);
          }
          if (event.targetPlayerId && event.targetPlayerId !== localPlayerId) return;

          const incoming = event.state.players;
          const hasLocal = incoming.some((p) => p.id === localPlayerId);

          let updatedList: Player[] = incoming.map((p): Player => {
            if (p.id === localPlayerId) {
              const currentLocalCards = playersRef.current.find((pl) => pl.id === localPlayerId)?.cards || [];
              const serverCards = p.cards && p.cards.length > 0 ? p.cards : currentLocalCards;
              return {
                ...p,
                cards: serverCards,
                name: playerName,
                avatar: playerAvatar,
                isOnline: true,
                ping: localPing,
              };
            }
            return { ...p, isOnline: p.isOnline !== false };
          });

          if (!hasLocal) {
            updatedList = [
              ...updatedList,
              {
                id: localPlayerId,
                name: playerName,
                avatar: playerAvatar,
                isBot: false,
                cards: playersRef.current.find((pl) => pl.id === localPlayerId)?.cards || [],
                seatIndex: updatedList.length,
                isHost: false,
                isReady: true,
                isOut: false,
                finishPosition: null,
                consecutiveTimeouts: 0,
                isOnline: true,
                ping: localPing,
              },
            ];
          }

          setPlayers(updatedList);
          playersRef.current = updatedList;
          setCurrentTurnPlayerId(event.state.currentTurnPlayerId);
          currentTurnPlayerIdRef.current = event.state.currentTurnPlayerId;
          setCurrentTrick(event.state.currentTrick);
          currentTrickRef.current = event.state.currentTrick;
          setDeadPile(event.state.deadPile || []);
          deadPileRef.current = event.state.deadPile || [];
          setIsFirstTrick(event.state.isFirstTrick ?? false);
          isFirstTrickRef.current = event.state.isFirstTrick ?? false;

          if (event.state.gamePhase && event.state.gamePhase !== gamePhaseRef.current) {
            setGamePhase(event.state.gamePhase);
            gamePhaseRef.current = event.state.gamePhase;
            if (event.state.gamePhase === 'PLAYING') {
              soundSynth.playCardDeal();
            } else if (event.state.gamePhase === 'GAME_OVER') {
              soundSynth.playVictory();
            }
          }
          setSettings(event.state.settings);
          setTheme(event.state.theme);
          break;
        }

        case 'ROOM_SETTINGS_UPDATE': {
          setSettings(event.settings);
          if (event.theme) setTheme(event.theme);
          break;
        }

        case 'CHAT_MESSAGE': {
          setMessages((prev) => [...prev, event.message]);
          break;
        }

        case 'HEARTBEAT': {
          setPlayers((prev) =>
            prev.map((p) => (p.id === event.playerId ? { ...p, isOnline: true } : p))
          );
          break;
        }

        case 'VOICE_SIGNAL': {
          if (event.toPlayerId === localPlayerId) {
            voiceService.handleVoiceSignal(event.fromPlayerId, event.signal);
          }
          break;
        }

        case 'VOICE_STATUS': {
          setPlayers((prev) =>
            prev.map((p) =>
              p.id === event.playerId ? { ...p, isSpeaking: event.isSpeaking } : p
            )
          );
          break;
        }

        case 'VOICE_READY': {
          if (event.fromPlayerId !== localPlayerId) {
            voiceService.handleVoiceReady(event.fromPlayerId);
          }
          break;
        }
      }
    },
    [localPlayerId, playerName, playerAvatar, showToast, addChatMessage]
  );

  const networkEventHandlerRef = useRef<(event: NetworkEvent) => void>(handleNetworkEvent);
  useEffect(() => {
    networkEventHandlerRef.current = handleNetworkEvent;
  }, [handleNetworkEvent]);

  // Keep WebRTC voice peers synced whenever players list changes
  useEffect(() => {
    if (gamePhase !== 'HOME' && settings.voiceEnabled) {
      voiceService.syncPeers(players);
    }
  }, [players, gamePhase, settings.voiceEnabled]);

  // Connect multiplayer service to room topic (stable, does not disconnect on trick changes)
  useEffect(() => {
    if (gamePhase === 'HOME') return;

    const stableHandler = (event: NetworkEvent) => {
      networkEventHandlerRef.current?.(event);
    };

    multiplayerService.connect(roomCode, stableHandler, setIsOnlineConnected);
    multiplayerService.startHeartbeat(localPlayerId);

    const cleanLocalPlayer = (): Player => ({
      id: localPlayerId,
      name: playerName,
      avatar: playerAvatar,
      isBot: false,
      cards: [],
      seatIndex: 0,
      isHost: isHostForRoom(roomCode),
      isReady: true,
      isOut: false,
      finishPosition: null,
      consecutiveTimeouts: 0,
      isOnline: true,
      ping: localPing,
    });

    const unsubPing = multiplayerService.onPingChange((p) => {
      setLocalPing(p);
      setPlayers((prev) =>
        prev.map((pl) => (pl.id === localPlayerId ? { ...pl, ping: p } : pl))
      );
    });

    const unsubConnect = multiplayerService.onConnect(() => {
      multiplayerService.joinRoomOnServer(
        roomCode,
        { id: localPlayerId, name: playerName, avatar: playerAvatar },
        (res) => {
          if (res?.success && res.state) {
            setPlayers(res.state.players);
            if (res.state.gamePhase) setGamePhase(res.state.gamePhase);
          }
        }
      );
      multiplayerService.broadcast({
        type: 'PLAYER_JOIN',
        player: cleanLocalPlayer(),
      });
      multiplayerService.broadcast({
        type: 'REQUEST_SYNC',
        requesterId: localPlayerId,
      });
    });

    multiplayerService.broadcast({
      type: 'PLAYER_JOIN',
      player: cleanLocalPlayer(),
    });
    multiplayerService.broadcast({
      type: 'REQUEST_SYNC',
      requesterId: localPlayerId,
    });

    // Mobile Phone Screen Wake / App Switch Reconnect Listener
    const handleWakeOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        console.log('[Multiplayer] Resumed / Focused - reconnecting & announcing presence');
        multiplayerService.reconnect();
        multiplayerService.broadcast({
          type: 'PLAYER_RECONNECT',
          playerId: localPlayerId,
        });
        multiplayerService.broadcast({
          type: 'PLAYER_JOIN',
          player: cleanLocalPlayer(),
        });
        multiplayerService.broadcast({
          type: 'REQUEST_SYNC',
          requesterId: localPlayerId,
        });

        // If host, immediately broadcast authoritative state so guests wake up with current room
        if (isHostForRoom(roomCode)) {
          multiplayerService.broadcast({
            type: 'SYNC_FULL_STATE',
            state: {
              players: playersRef.current,
              currentTurnPlayerId: currentTurnPlayerIdRef.current,
              currentTrick: currentTrickRef.current,
              deadPile: deadPileRef.current,
              gamePhase: gamePhaseRef.current,
              isFirstTrick: isFirstTrickRef.current,
              settings: settingsRef.current,
              theme: themeRef.current,
            },
          });
        }
      }
    };

    window.addEventListener('visibilitychange', handleWakeOrFocus);
    window.addEventListener('focus', handleWakeOrFocus);
    window.addEventListener('online', handleWakeOrFocus);

    return () => {
      window.removeEventListener('visibilitychange', handleWakeOrFocus);
      window.removeEventListener('focus', handleWakeOrFocus);
      window.removeEventListener('online', handleWakeOrFocus);
      unsubPing();
      unsubConnect();
      multiplayerService.disconnect();
    };
  }, [roomCode, localPlayerId, playerName, playerAvatar, gamePhase]);

  // Continuous sync & presence in Lobby:
  // - Host continuously broadcasts full state every 2.5s so any newly connected phone or guest is immediately synced.
  // - Guest continuously announces presence every 2s until room has confirmed host and players!
  useEffect(() => {
    if (gamePhase !== 'LOBBY') return;

    const interval = setInterval(() => {
      if (isHostForRoom(roomCode)) {
        multiplayerService.broadcast({
          type: 'SYNC_FULL_STATE',
          state: {
            players: playersRef.current,
            currentTurnPlayerId: currentTurnPlayerIdRef.current,
            currentTrick: currentTrickRef.current,
            deadPile: deadPileRef.current,
            gamePhase: gamePhaseRef.current,
            isFirstTrick: isFirstTrickRef.current,
            settings: settingsRef.current,
            theme: themeRef.current,
          },
        });
      } else {
        multiplayerService.broadcast({
          type: 'PLAYER_JOIN',
          player: {
            id: localPlayerId,
            name: playerName,
            avatar: playerAvatar,
            isBot: false,
            cards: [],
            seatIndex: 0,
            isHost: false,
            isReady: true,
            isOut: false,
            finishPosition: null,
            consecutiveTimeouts: 0,
            isOnline: true,
          },
        });
        multiplayerService.broadcast({
          type: 'REQUEST_SYNC',
          requesterId: localPlayerId,
        });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [gamePhase, localPlayerId, playerName, playerAvatar, roomCode]);

  // Deal and start game (Host broadcasts to all players across internet)
  const handleStartGame = () => {
    if (players.length < 2) {
      showToast('At least 2 players are required to start!');
      return;
    }
    const deckCountToUse = players.length >= 7 ? 2 : settings.deckCount;
    const { dealtPlayers } = dealCards(players, deckCountToUse, settings.equalHands);

    const { playerIndex } = findStartingPlayerIndex(dealtPlayers);
    const starter = dealtPlayers[playerIndex];

    setPlayers(dealtPlayers);
    playersRef.current = dealtPlayers;
    setDeadPile([]);
    deadPileRef.current = [];
    setCurrentTrick({ leadSuit: null, plays: [] });
    currentTrickRef.current = { leadSuit: null, plays: [] };
    setIsFirstTrick(true);
    isFirstTrickRef.current = true;
    setBhabhiPlayer(null);
    setThullaBanner(null);
    setCleanBanner(null);
    setCutterPlayerId(null);
    setPickerPlayerId(null);
    setIsDiscardingTrick(false);
    setCurrentTurnPlayerId(starter.id);
    currentTurnPlayerIdRef.current = starter.id;

    setGamePhase('PLAYING');
    gamePhaseRef.current = 'PLAYING';
    soundSynth.playCardDeal();

    // Broadcast GAME_START to all connected players!
    multiplayerService.broadcast({
      type: 'GAME_START',
      players: dealtPlayers,
      startingPlayerId: starter.id,
      trick: { leadSuit: null, plays: [] },
    });

    addChatMessage(
      `Game started! ${starter.name} holds the Ace of Spades (A♠) and must lead!`,
      starter,
      true
    );
  };

  // Auto play helper for timeout or AFK
  const autoPlayCurrentPlayer = useCallback(() => {
    if (isAnimatingPlay) return;
    const player = players.find((p) => p.id === currentTurnPlayerId);
    if (!player || player.cards.length === 0) return;

    const chosen = botChooseCard(player, currentTrick, isFirstTrick);
    executePlayCard(player.id, chosen, true);
  }, [isAnimatingPlay, players, currentTurnPlayerId, currentTrick, isFirstTrick, executePlayCard]);

  // Bot Turn Automated Runner (ONLY RUN BY HOST in offline/peer fallback; server handles it when connected)
  useEffect(() => {
    if (gamePhase !== 'PLAYING' || isAnimatingPlay) return;
    if (!localPlayer.isHost) return;
    // Authoritative server manages bot moves to eliminate race conditions and false "Not your turn!" toasts
    if (multiplayerService.isServerConnected()) return;

    const currentPlayer = players.find((p) => p.id === currentTurnPlayerId);
    if (!currentPlayer || !currentPlayer.isBot || currentPlayer.isOut || currentPlayer.cards.length === 0) return;

    if (botTimerRef.current) clearTimeout(botTimerRef.current);

    botTimerRef.current = setTimeout(() => {
      const chosenCard = botChooseCard(currentPlayer, currentTrick, isFirstTrick);
      executePlayCard(currentPlayer.id, chosenCard, true);
    }, 850);

    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
    };
  }, [currentTurnPlayerId, gamePhase, isAnimatingPlay, currentTrick, isFirstTrick, players, executePlayCard, localPlayer.isHost]);

  // Local card click
  const handleLocalCardClick = (card: Card) => {
    if (isAnimatingPlay) return;
    if (localPlayer.isOut || localPlayer.cards.length === 0) return;

    if (currentTurnPlayerId !== localPlayer.id) {
      showToast("It's not your turn!");
      return;
    }

    const legality = canPlayCard(localPlayer.cards, card, currentTrick.leadSuit, isFirstTrick);
    if (!legality.legal) {
      showToast(legality.reason || 'You must follow the lead suit!');
      soundSynth.triggerHaptic([40, 40]);
      return;
    }

    // SINGLE TAP TO PLAY: Immediately send card to table without dual click!
    executePlayCard(localPlayer.id, card, true);
  };

  // Transfer helper: moves all cards from giver to receiver
  const executeDirectTransfer = useCallback(
    (giverId: string, receiverId: string, shouldBroadcast = true, forcedNextTurnId?: string) => {
      const prevPlayers = playersRef.current;
      const giver = prevPlayers.find((p) => p.id === giverId);
      const receiver = prevPlayers.find((p) => p.id === receiverId);
      if (!giver || giver.cards.length === 0 || !receiver) return;

      const cardsToTransfer = [...giver.cards];
      const postTransferPlayers = prevPlayers.map((p) => {
        if (p.id === giverId) {
          return { ...p, cards: [], cardCount: 0 };
        }
        if (p.id === receiverId) {
          const combined = sortHand([...p.cards, ...cardsToTransfer]);
          return { ...p, cards: combined, cardCount: combined.length, isOut: false, finishPosition: null };
        }
        return p;
      });

      const { updatedPlayers: postOutPlayers, newlyOut } = updateOutStatus(postTransferPlayers);

      newlyOut.forEach((outP) => {
        if (outP.finishPosition === 1) {
          soundSynth.playVictory();
          addChatMessage(`🏆 ${outP.name} is SAFE #1 (Dever)!`, outP, true);
        } else {
          addChatMessage(`✅ ${outP.name} is SAFE #${outP.finishPosition}!`, outP, true);
        }
      });

      soundSynth.playPickup();
      if (giverId === localPlayerId) {
        setSelectedCardId(null);
      }

      // Check if Game Over: only 1 or 0 players left with cards!
      const remainingWithCards = postOutPlayers.filter((p) => !p.isOut && p.cards.length > 0);
      if (remainingWithCards.length <= 1) {
        const loser = remainingWithCards[0] || receiver;
        setBhabhiPlayer(loser);
        setGamePhase('GAME_OVER');
        gamePhaseRef.current = 'GAME_OVER';
        setPlayers(postOutPlayers);
        playersRef.current = postOutPlayers;

        if (shouldBroadcast) {
          multiplayerService.broadcast({
            type: 'TAKE_OR_GIVE_CARDS',
            fromPlayerId: giverId,
            toPlayerId: receiverId,
            cards: cardsToTransfer,
            gameOver: true,
            bhabhiPlayerId: loser.id,
          });
        }

        addChatMessage(`🏁 GAME OVER! ${loser.name} is the BHABHI!`, loser, true);
        showToast(`Game Over! ${loser.name} is the Bhabhi!`);
        return;
      }

      // If game continues, check if current turn was the giver (or anyone who now has 0 cards / is out)
      let nextTurnId = forcedNextTurnId || currentTurnPlayerIdRef.current;
      const currentTurnPlayer = postOutPlayers.find((p) => p.id === nextTurnId);
      if (!forcedNextTurnId && (!currentTurnPlayer || currentTurnPlayer.isOut || currentTurnPlayer.cards.length === 0)) {
        const giverIdx = postOutPlayers.findIndex((p) => p.id === giverId);
        const nextIdx = getNextActivePlayerIndex(postOutPlayers, giverIdx >= 0 ? giverIdx : 0);
        const nextPlayer = postOutPlayers[nextIdx];
        if (nextPlayer) {
          nextTurnId = nextPlayer.id;
        }
      }

      setPlayers(postOutPlayers);
      playersRef.current = postOutPlayers;
      setCurrentTurnPlayerId(nextTurnId);
      currentTurnPlayerIdRef.current = nextTurnId;

      if (nextTurnId === localPlayerId) {
        soundSynth.playTurnChime();
        showToast("Your turn to play!");
      }

      if (shouldBroadcast) {
        multiplayerService.broadcast({
          type: 'TAKE_OR_GIVE_CARDS',
          fromPlayerId: giverId,
          toPlayerId: receiverId,
          cards: cardsToTransfer,
          nextTurnPlayerId: nextTurnId,
        });
      }

      addChatMessage(
        `🤝 Transfer complete! ${giver.name} transferred all ${cardsToTransfer.length} cards to ${receiver.name}!`,
        giver,
        true
      );
      showToast(`Cards transferred from ${giver.name} to ${receiver.name}!`);
    },
    [addChatMessage, showToast, localPlayerId]
  );

  useEffect(() => {
    executeDirectTransferRef.current = executeDirectTransfer;
  }, [executeDirectTransfer]);

  // Request to transfer all local player cards to target player
  const handleGiveAllCards = (targetPlayer: Player) => {
    if (localPlayer.cards.length === 0) return;

    if (targetPlayer.isBot) {
      showToast(`Transferring cards to ${targetPlayer.name}...`);
      setTimeout(() => {
        executeDirectTransfer(localPlayer.id, targetPlayer.id);
        showToast(`${targetPlayer.name} accepted your cards!`);
      }, 400);
      return;
    }

    const reqId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    multiplayerService.broadcast({
      type: 'TRANSFER_REQUEST',
      requestId: reqId,
      fromPlayerId: localPlayer.id,
      fromPlayerName: localPlayer.name,
      fromPlayerAvatar: localPlayer.avatar,
      toPlayerId: targetPlayer.id,
      toPlayerName: targetPlayer.name,
      action: 'GIVE',
      cardCount: localPlayer.cards.length,
    });

    showToast(`📨 Sent request to give cards to ${targetPlayer.name}. Waiting for approval...`);
    addChatMessage(
      `📨 ${localPlayer.name} requested to give cards to ${targetPlayer.name}.`,
      localPlayer,
      true,
      false
    );
  };

  // Request to take all cards from target player into local player's hand
  const handleTakePlayerCards = (targetPlayer: Player) => {
    if (targetPlayer.cards.length === 0) return;

    if (targetPlayer.isBot) {
      showToast(`Taking cards from ${targetPlayer.name}...`);
      setTimeout(() => {
        executeDirectTransfer(targetPlayer.id, localPlayer.id);
        showToast(`${targetPlayer.name} transferred cards to you!`);
      }, 400);
      return;
    }

    const reqId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    multiplayerService.broadcast({
      type: 'TRANSFER_REQUEST',
      requestId: reqId,
      fromPlayerId: localPlayer.id,
      fromPlayerName: localPlayer.name,
      fromPlayerAvatar: localPlayer.avatar,
      toPlayerId: targetPlayer.id,
      toPlayerName: targetPlayer.name,
      action: 'TAKE',
      cardCount: targetPlayer.cards.length,
    });

    showToast(`📨 Sent request to take cards from ${targetPlayer.name}. Waiting for approval...`);
    addChatMessage(
      `📨 ${localPlayer.name} requested to take cards from ${targetPlayer.name}.`,
      localPlayer,
      true,
      false
    );
  };

  const handleAcceptTransferRequest = (req: TransferRequestInfo) => {
    multiplayerService.broadcast({
      type: 'TRANSFER_RESPONSE',
      requestId: req.requestId,
      accepted: true,
      fromPlayerId: req.fromPlayerId,
      fromPlayerName: req.fromPlayerName,
      toPlayerId: req.toPlayerId,
      toPlayerName: req.toPlayerName,
      action: req.action,
    });

    if (req.action === 'TAKE') {
      // Local player is the target who accepts giving their cards away:
      executeDirectTransfer(localPlayerId, req.fromPlayerId);
    }

    setIncomingTransferRequest(null);
    showToast(`Accepted transfer request!`);
  };

  const handleRejectTransferRequest = (req: TransferRequestInfo) => {
    multiplayerService.broadcast({
      type: 'TRANSFER_RESPONSE',
      requestId: req.requestId,
      accepted: false,
      fromPlayerId: req.fromPlayerId,
      fromPlayerName: req.fromPlayerName,
      toPlayerId: req.toPlayerId,
      toPlayerName: req.toPlayerName,
      action: req.action,
    });

    setIncomingTransferRequest(null);
    showToast(`Declined card transfer request`);
  };

  // Manual pickup handler
  const handleManualPickup = () => {
    setManualPickupRequired(false);
    if (pendingPickupAction) {
      pendingPickupAction();
      setPendingPickupAction(null);
    }
  };

  // Add / Remove Bots
  const handleAddBot = (difficulty: BotDifficulty) => {
    if (players.length >= settings.maxPlayers) return;
    const botNum = players.filter((p) => p.isBot).length + 1;
    const botAvatar = AVATARS[players.length % AVATARS.length];
    const newBot: Player = {
      id: `bot-${Date.now()}-${botNum}`,
      name: `Bot ${botNum} (${difficulty})`,
      avatar: botAvatar,
      isBot: true,
      botDifficulty: difficulty,
      cards: [],
      seatIndex: players.length,
      isHost: false,
      isReady: true,
      isOut: false,
      finishPosition: null,
      consecutiveTimeouts: 0,
    };
    setPlayers([...players, newBot]);
  };

  const handleRemovePlayer = (id: string) => {
    if (players.length <= 2) {
      showToast('Minimum 2 players required!');
      return;
    }
    setPlayers(players.filter((p) => p.id !== id));
  };

  // Sort local player's cards according to chosen SortMode
  const sortedLocalCards = useMemo(() => {
    return sortHand(localPlayer.cards, sortMode);
  }, [localPlayer.cards, sortMode]);
  const cardCount = sortedLocalCards.length;
  const isMobile = windowWidth < 640;

  const cycleSortMode = useCallback(() => {
    setSortMode((prev) => {
      if (prev === 'suit') return 'rank-desc';
      if (prev === 'rank-desc') return 'rank-asc';
      return 'suit';
    });
  }, []);

  // Compute Playable vs Unplayable Cards for Local Player
  const isMyTurn =
    currentTurnPlayerId === localPlayer.id && !localPlayer.isOut && localPlayer.cards.length > 0;
  const playableCards = sortedLocalCards.filter((c) =>
    canPlayCard(sortedLocalCards, c, currentTrick.leadSuit, isFirstTrick).legal
  );

  // Maximum width available for all cards in the fan (guarantees ZERO clipping on mobile & ample room on desktop):
  const maxHandWidth = isMobile
    ? Math.max(280, windowWidth - 16)
    : Math.min(windowWidth - 48, 1050);

  // Responsive card scale based on card count and screen width
  const cardScale = isMobile
    ? cardCount > 15
      ? 0.65
      : cardCount > 10
      ? 0.72
      : cardCount > 6
      ? 0.8
      : 0.88
    : cardCount > 16
    ? 0.82
    : cardCount > 11
    ? 0.9
    : 0.98;

  const cardWidthPx = 68 * cardScale;

  // Optimized spacing so cards have clear visibility of suits and ranks without cramming:
  const targetSpacingPx = isMobile ? cardWidthPx * 0.52 : cardWidthPx * 0.72;
  let cardSpacingPx = targetSpacingPx;
  if (cardCount > 1) {
    const requiredWidth = cardWidthPx + (cardCount - 1) * targetSpacingPx;
    if (requiredWidth > maxHandWidth) {
      cardSpacingPx = Math.max(18, (maxHandWidth - cardWidthPx) / (cardCount - 1));
    }
  }

  const totalFanWidth =
    cardCount > 1 ? cardWidthPx + (cardCount - 1) * cardSpacingPx : cardWidthPx;

  return (
    <div
      className={`h-[100dvh] w-screen max-w-full overflow-hidden relative flex flex-col theme-${theme} select-none`}
    >
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white font-extrabold text-xs sm:text-sm px-4 py-2 rounded-2xl shadow-2xl border border-white/20 animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* HOME SCREEN PHASE (Create Room, Join Room, Solo Practice, Profile) */}
      {gamePhase === 'HOME' ? (
        <HomeScreen
          playerName={playerName}
          playerAvatar={playerAvatar}
          onUpdateProfile={handleUpdateProfile}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onSoloPractice={handleSoloPractice}
          onOpenRules={() => setShowTutorial(true)}
        />
      ) : gamePhase === 'LOBBY' ? (
        <div className="h-full w-full overflow-y-auto">
          <LobbyView
            roomCode={roomCode}
            players={players}
            localPlayer={localPlayer}
            settings={settings}
            theme={theme}
            isOnlineConnected={isOnlineConnected}
            onThemeChange={(t) => {
              setTheme(t);
              multiplayerService.broadcast({ type: 'ROOM_SETTINGS_UPDATE', settings, theme: t });
            }}
            onUpdateSettings={(newSet) => {
              const updated = { ...settings, ...newSet };
              setSettings(updated);
              multiplayerService.broadcast({ type: 'ROOM_SETTINGS_UPDATE', settings: updated });
            }}
            onToggleReady={() =>
              setPlayers(
                players.map((p) => (p.id === localPlayer.id ? { ...p, isReady: !p.isReady } : p))
              )
            }
            onStartGame={handleStartGame}
            onAddBot={handleAddBot}
            onRemovePlayer={handleRemovePlayer}
            onOpenTutorial={() => setShowTutorial(true)}
            onJoinRoom={handleJoinRoom}
            onCreateNewRoom={handleCreateRoom}
            onRenamePlayer={handleRenamePlayer}
            onLeaveRoom={handleGoHome}
            voiceBar={
              <VoiceChatBar
                voiceEnabled={settings.voiceEnabled}
                localPlayerId={localPlayerId}
                roomCode={roomCode}
                onSpeakingChange={(speaking) => {
                  setPlayers((prev) =>
                    prev.map((p) => (p.id === localPlayerId ? { ...p, isSpeaking: speaking } : p))
                  );
                }}
              />
            }
          />
        </div>
      ) : (
        /* GAME TABLE VIEW (Full Screen Responsive for PC & Mobile Landscape/Portrait) */
        <div className="h-full w-full flex flex-col justify-between overflow-hidden p-1.5 sm:p-3 max-h-[100dvh]">
          {/* Top Floating App Bar */}
          <header className="relative z-30 flex items-center justify-between gap-1 sm:gap-2 max-w-6xl mx-auto w-full px-1">
            {/* Left: Home and Room Code */}
            <div className="flex items-center gap-1 sm:gap-2 bg-slate-950/70 border border-white/10 backdrop-blur-md px-2 sm:px-3 py-1 rounded-full shadow-lg flex-shrink-0">
              <button
                onClick={handleGoHome}
                className="hover:opacity-80 transition cursor-pointer p-0.5"
                title="Leave Room & Go Home"
              >
                <Home className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-amber-400" />
              </button>
              <span className="font-black text-xs sm:text-sm tracking-tight text-white hidden md:inline">
                Bhabhi Dever
              </span>
              <span className="text-[9px] sm:text-[10px] font-mono text-amber-300 bg-amber-950/60 px-1.5 sm:px-2 py-0.5 rounded-full border border-amber-500/40">
                {roomCode}
              </span>
            </div>

            {/* Center: Live Voice Bar */}
            <div className="flex-1 flex justify-center min-w-0 px-1">
              <VoiceChatBar
                voiceEnabled={settings.voiceEnabled}
                localPlayerId={localPlayerId}
                roomCode={roomCode}
                onSpeakingChange={(speaking) => {
                  setPlayers((prev) =>
                    prev.map((p) => (p.id === localPlayerId ? { ...p, isSpeaking: speaking } : p))
                  );
                }}
              />
            </div>

            {/* Right: Chat & 3-Dot More Options */}
            <div className="flex items-center gap-1 bg-slate-950/70 border border-white/10 backdrop-blur-md p-0.5 sm:p-1 rounded-full shadow-lg flex-shrink-0 relative">

              {/* Chat Button */}
              <button
                onClick={() => setShowChat(!showChat)}
                className="p-1.5 rounded-full text-slate-300 hover:text-white relative transition hover:bg-white/10"
                title="Open Table Chat"
              >
                <MessageSquare className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              </button>

              {/* 3-Dot More Options Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowMoreMenu((prev) => !prev)}
                  className={`p-1.5 rounded-full text-slate-300 hover:text-white transition cursor-pointer ${
                    showMoreMenu ? 'bg-amber-500/30 text-amber-300' : 'hover:bg-white/10'
                  }`}
                  title="More Options"
                  aria-label="More Options"
                >
                  <MoreVertical className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                </button>

                {showMoreMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowMoreMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-slate-900/95 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl p-1.5 z-50 flex flex-col gap-1 text-xs animate-in fade-in zoom-in-95 duration-150">
                      {/* Fullscreen Option */}
                      <button
                        onClick={() => {
                          toggleFullscreen();
                          setShowMoreMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-slate-200 hover:bg-white/10 transition cursor-pointer font-medium"
                      >
                        {isFullscreen ? (
                          <Minimize2 className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Maximize2 className="w-4 h-4 text-slate-300" />
                        )}
                        <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen (F)'}</span>
                      </button>

                      {/* Speaker / Sound Option */}
                      <button
                        onClick={() => {
                          soundSynth.setMuted(!isMuted);
                          setIsMuted(!isMuted);
                          setShowMoreMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-slate-200 hover:bg-white/10 transition cursor-pointer font-medium"
                      >
                        {isMuted ? (
                          <VolumeX className="w-4 h-4 text-rose-400" />
                        ) : (
                          <Volume2 className="w-4 h-4 text-emerald-400" />
                        )}
                        <span>{isMuted ? 'Speaker: Muted (Unmute)' : 'Speaker: Active (Mute)'}</span>
                      </button>

                      {/* Help / Rules Option */}
                      <button
                        onClick={() => {
                          setShowTutorial(true);
                          setShowMoreMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-slate-200 hover:bg-white/10 transition cursor-pointer font-medium"
                      >
                        <HelpCircle className="w-4 h-4 text-sky-400" />
                        <span>Game Rules & Guide</span>
                      </button>

                      <div className="h-px bg-white/10 my-0.5" />

                      {/* Leave Game Option */}
                      <button
                        onClick={() => {
                          setShowMoreMenu(false);
                          handleGoHome();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-rose-300 hover:bg-rose-500/15 transition cursor-pointer font-medium"
                      >
                        <Home className="w-4 h-4 text-rose-400" />
                        <span>Leave Game (Home)</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          {/* MAIN FELT POKER TABLE (PC Fullscreen & Mobile Adaptive) */}
          <main className="relative flex-1 flex items-center justify-center my-1 sm:my-2 max-w-6xl mx-auto w-full min-h-0">
            <div className="felt-table w-full h-full max-h-[360px] sm:max-h-[620px] rounded-[110px] sm:rounded-[220px] relative flex items-center justify-center p-3 sm:p-5">
              {/* Flying Cards Layer across table */}
              <FlyingCardOverlay
                flyingCards={flyingCards}
                theme={theme}
                fourColorSuits={settings.fourColorSuits}
              />

              {/* Center Felt Trick Area */}
              <TableCenter
                trick={currentTrick}
                deadPile={deadPile}
                players={players}
                leadSuit={currentTrick.leadSuit}
                deckCount={settings.deckCount}
                fourColorSuits={settings.fourColorSuits}
                manualPickupRequired={manualPickupRequired}
                onManualPickup={handleManualPickup}
                pickerName={localPlayer.name}
                thullaBanner={thullaBanner}
                cleanBanner={cleanBanner}
                isDiscarding={isDiscardingTrick}
                flyingCardIds={flyingCardIds}
              />

              {/* Big Centered WiFi Warning Overlay for High Ping / Connection Drops */}
              <NetworkLagOverlay
                ping={localPing}
                isOnline={isOnlineConnected}
                onManualReconnect={() => multiplayerService.reconnect()}
              />

              {/* OPPONENTS AROUND THE ELLIPSE IN GUARANTEED CLOCKWISE SEQUENCE */}
              {getClockwiseOpponents(players, localPlayer.id).map((opp, oppIndex, oppArr) => {
                  const count = oppArr.length;
                  const arcStart = 200;
                  const arcEnd = -20;
                  const step = count > 1 ? (arcStart - arcEnd) / (count - 1) : 0;
                  const currentAngleDeg = count === 1 ? 90 : arcStart - oppIndex * step;
                  const currentAngleRad = (currentAngleDeg * Math.PI) / 180;
                  const radiusX = 43;
                  const radiusY = 38;
                  const leftPct = 50 + radiusX * Math.cos(currentAngleRad);
                  const topPct = 50 - radiusY * Math.sin(currentAngleRad);

                  let statusBadge: { label: string; color: 'red' | 'amber' | 'emerald' | 'blue' } | null = null;
                  if (opp.id === cutterPlayerId) {
                    statusBadge = { label: '💥 CUTTER', color: 'red' };
                  } else if (opp.id === pickerPlayerId) {
                    statusBadge = { label: '📦 TAKES PILE', color: 'amber' };
                  }

                  return (
                    <div
                      key={opp.id}
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: `${leftPct}%`,
                        top: `${topPct}%`,
                      }}
                    >
                      <PlayerSeat
                        player={opp}
                        isCurrentTurn={currentTurnPlayerId === opp.id}
                        timeLeft={turnTimeLeft}
                        totalTime={settings.turnTimerSeconds}
                        theme={theme}
                        statusBadge={statusBadge}
                        canRename={localPlayer.isHost}
                        onRename={() => setRenameTargetPlayer(opp)}
                      />
                    </div>
                  );
                })}
            </div>
          </main>

          {/* LOCAL PLAYER HAND DRAWER (Pinned at Bottom, Proportional Layout, Filter Unplayable) */}
          <footer
            className="relative z-30 max-w-4xl mx-auto w-full flex flex-col items-center flex-shrink-0 pb-3 sm:pb-1"
            style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}
          >
            {/* Turn Prompt or Play Action Button + Eye Toggle */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mb-1">
              {/* Eye Button to toggle Hand Visibility for privacy with auto-unhide on turn and auto-rehide when turn ends! */}
              <button
                onClick={togglePrivacyMode}
                className="p-1 px-2 sm:p-1.5 sm:px-2.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 transition shadow flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-bold cursor-pointer"
                title={privacyMode ? 'Privacy Mode ON (Auto-hides cards)' : 'Privacy Mode OFF'}
              >
                {privacyMode && isHandHidden ? (
                  <Eye className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-amber-400" />
                ) : (
                  <EyeOff className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-slate-400" />
                )}
                <span>{privacyMode && isHandHidden ? 'Cards Hidden' : 'Privacy Mode'}</span>
              </button>

              {/* Take Cards Button with Swap Icon placed near hand cards */}
              <button
                onClick={() => setShowTakeModal(true)}
                className="p-1 px-2.5 sm:p-1.5 sm:px-3 rounded-full bg-slate-900/90 hover:bg-slate-800 text-amber-300 hover:text-white border border-amber-500/40 hover:border-amber-400 transition shadow flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-bold cursor-pointer active:scale-95"
                title="Send request to take or swap cards with an opponent"
              >
                <ArrowLeftRight className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-amber-400" />
                <span>Take Cards</span>
              </button>

              {isMyTurn ? (
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 sm:px-3.5 py-0.5 sm:py-1 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-slate-950 font-black text-[10px] sm:text-xs uppercase tracking-wider rounded-full shadow-lg flex items-center gap-1.5 animate-pulse">
                    <Sparkles className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-slate-950" />
                    <span>Your Turn! Tap card to play</span>
                    {turnTimeLeft > 0 && (
                      <span className={`px-2 py-0.5 rounded-full font-black text-[10px] sm:text-xs ml-1 border ${
                        turnTimeLeft <= 5 
                          ? 'bg-rose-600 text-white border-rose-300 animate-bounce' 
                          : 'bg-black/80 text-amber-300 border-amber-500/50'
                      }`}>
                        ⏱️ {turnTimeLeft}s left
                      </span>
                    )}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] sm:text-[11px] font-semibold text-slate-300 bg-slate-950/70 px-2.5 sm:px-3 py-0.5 rounded-full border border-white/10 flex items-center gap-1.5 shadow-md">
                    <span>Awaiting {players.find((p) => p.id === currentTurnPlayerId)?.name || 'opponent'}&apos;s move...</span>
                    {turnTimeLeft > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-full font-mono font-bold text-[10px] border ${
                        turnTimeLeft <= 5 
                          ? 'bg-rose-500/80 text-white border-rose-300 animate-pulse' 
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}>
                        ⏱️ {turnTimeLeft}s left
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Mobile Hand Overview & Sort UI (No Filters, Zero Scrollbar, 100% on Screen) */}
            {isMobile && !isHandHidden && cardCount > 0 && (
              <div className="flex items-center justify-between w-full max-w-md px-2.5 mb-1 select-none">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                    Your Hand ({cardCount})
                  </span>
                  {/* Local Player Signal Strength Badge */}
                  <div
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-tight border backdrop-blur-sm shadow-sm transition-all duration-300 ${
                      !isOnlineConnected
                        ? 'bg-rose-950/80 border-rose-500/50 text-rose-400'
                        : localPing < 100
                        ? 'bg-slate-900/80 border-emerald-500/30 text-emerald-400'
                        : localPing <= 250
                        ? 'bg-slate-900/80 border-amber-500/30 text-amber-400'
                        : 'bg-rose-950/80 border-rose-500/50 text-rose-400 animate-pulse'
                    }`}
                    title={
                      !isOnlineConnected
                        ? 'Disconnected from server'
                        : `Signal Latency: ${localPing}ms (${
                            localPing < 100 ? 'Good' : localPing <= 250 ? 'Fair' : 'Poor'
                          })`
                    }
                  >
                    {!isOnlineConnected ? (
                      <>
                        <WifiOff className="w-2.5 h-2.5 text-rose-400" />
                        <span>OFFLINE</span>
                      </>
                    ) : (
                      <>
                        <Wifi
                          className={`w-2.5 h-2.5 ${
                            localPing < 100
                              ? 'text-emerald-400'
                              : localPing <= 250
                              ? 'text-amber-400'
                              : 'text-rose-400 animate-bounce'
                          }`}
                        />
                        <span>{localPing}ms</span>
                      </>
                    )}
                  </div>
                  {cardCount > 6 && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
                      All on Screen
                    </span>
                  )}
                </div>

                {/* Sort Order Button & Two-Row/Single-Row Layout Switcher */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={cycleSortMode}
                    className="px-2 py-0.5 rounded-lg bg-slate-900/90 border border-amber-400/40 hover:border-amber-400 text-[10px] font-bold text-amber-300 hover:text-white flex items-center gap-1 transition shadow-sm active:scale-95 cursor-pointer"
                    title="Click to toggle sorting order (By Suit, High-to-Low, Low-to-High)"
                  >
                    <ArrowUpDown className="w-3 h-3 text-amber-400" />
                    <span>
                      {sortMode === 'suit'
                        ? 'Sort: ♠ Suit'
                        : sortMode === 'rank-desc'
                        ? 'Sort: High-Low'
                        : 'Sort: Low-High'}
                    </span>
                  </button>

                  {cardCount > 6 && (
                    <button
                      onClick={() => setMobileLayoutMode((prev) => (prev === 'two-row' ? 'single' : 'two-row'))}
                      className="px-2 py-0.5 rounded-lg bg-slate-900/90 border border-white/10 hover:border-white/30 text-[10px] font-bold text-slate-300 hover:text-white flex items-center gap-1 transition shadow-sm active:scale-95 cursor-pointer"
                      title="Toggle between 2-Row Split and 1-Row Fan"
                    >
                      <Layers className="w-3 h-3 text-slate-400" />
                      <span>{mobileLayoutMode === 'two-row' ? '2 Rows' : '1 Row'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Hand Fan (All Cards Visible, Playable Lifted & Highlighted, Unplayable Blurred) */}
            <div className="relative w-full flex items-center justify-center overflow-visible py-1 px-1">
              {localPlayer.isOut ? (
                <div className="p-2.5 bg-emerald-950/80 border border-emerald-500/60 rounded-2xl text-center shadow-xl">
                  <span className="text-xl">🏆</span>
                  <p className="text-xs font-black uppercase tracking-wider text-emerald-300">
                    You have shed all your cards! SAFE #{localPlayer.finishPosition || 1}
                  </p>
                </div>
              ) : localPlayer.cards.length === 0 ? (
                <div className="text-xs text-slate-400">No cards in hand</div>
              ) : isHandHidden ? (
                <div
                  onClick={() => setIsHandHidden(false)}
                  className="cursor-pointer flex items-center justify-center gap-3 px-6 py-3 bg-slate-950/90 border border-amber-500/40 rounded-2xl shadow-2xl hover:border-amber-400 transition animate-pulse my-1.5"
                >
                  <Eye className="w-5 h-5 text-amber-400" />
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-black text-white uppercase tracking-wider">
                      Cards Hidden for Privacy ({sortedLocalCards.length} cards)
                    </span>
                    <span className="text-[10px] text-amber-300 font-semibold">
                      Tap here to reveal, or cards will automatically show on your turn
                    </span>
                  </div>
                </div>
              ) : isMobile ? (
                /* MOBILE VIEW: Zero-Scrollbar All-in-One-Screen Card Hand */
                (() => {
                  const isTwoRow = cardCount > 6 && mobileLayoutMode === 'two-row';
                  const splitIdx = isTwoRow ? Math.ceil(cardCount / 2) : cardCount;
                  const rows = isTwoRow
                    ? [
                        { cards: sortedLocalCards.slice(0, splitIdx), baseZ: 10, isTopTier: true },
                        { cards: sortedLocalCards.slice(splitIdx), baseZ: 20, isTopTier: false },
                      ]
                    : [{ cards: sortedLocalCards, baseZ: 10, isTopTier: false }];

                  const maxRowSize = isTwoRow ? splitIdx : cardCount;
                  const mobileCardScale = maxRowSize <= 6 ? 0.8 : maxRowSize <= 10 ? 0.74 : 0.66;
                  const cardW = 68 * mobileCardScale;
                  const availableW = Math.min(windowWidth - 8, 440);

                  return (
                    <div className="w-full flex flex-col items-center justify-end select-none overflow-visible py-1 px-1">
                      {rows.map((row, rIdx) => {
                        const count = row.cards.length;
                        if (count === 0) return null;
                        const maxNatural = cardW + 4;
                        const totalNeeded = cardW + (count - 1) * maxNatural;
                        const spacingPx =
                          count > 1 && totalNeeded > availableW
                            ? Math.max(16, (availableW - cardW) / (count - 1))
                            : maxNatural;
                        const marginLeftPx = count > 1 ? Math.min(0, spacingPx - cardW) : 0;

                        return (
                          <div
                            key={rIdx}
                            className={`flex items-end justify-center select-none ${
                              rIdx > 0 ? 'mt-[-28px] sm:mt-[-32px]' : ''
                            }`}
                            style={{
                              zIndex: row.baseZ,
                              width: '100%',
                            }}
                          >
                            {row.cards.map((card, cIdx) => {
                              const isLegal = canPlayCard(
                                sortedLocalCards,
                                card,
                                currentTrick.leadSuit,
                                isFirstTrick
                              ).legal;
                              const isPlayable = isMyTurn && isLegal;
                              const isBlurred = isMyTurn && !isLegal && playableCards.length > 0;
                              const isSelected = selectedCardId === card.id;

                              const bottomLift = isSelected ? '18px' : isPlayable ? '12px' : '0px';
                              const zIndex = isSelected ? 60 : isPlayable ? 40 + cIdx : row.baseZ + cIdx;

                              return (
                                <div
                                  key={card.id}
                                  className="flex-shrink-0 transition-all duration-200"
                                  style={{
                                    marginLeft: cIdx === 0 ? '0px' : `${marginLeftPx}px`,
                                    marginBottom: bottomLift,
                                    zIndex,
                                  }}
                                >
                                  <CardView
                                    card={card}
                                    selected={isSelected}
                                    isLegal={isLegal}
                                    isMyTurn={isMyTurn}
                                    isPlayableRaised={isPlayable}
                                    isBlurred={isBlurred}
                                    fourColorSuits={settings.fourColorSuits}
                                    theme={theme}
                                    scale={mobileCardScale}
                                    onClick={() => handleLocalCardClick(card)}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              ) : (
                /* DESKTOP VIEW: Proportional Arc Fan */
                <div
                  className="relative mx-auto flex items-end justify-center select-none"
                  style={{
                    width: `${totalFanWidth}px`,
                    height: `${100 * cardScale + 38}px`,
                    maxWidth: '100vw',
                  }}
                >
                  {sortedLocalCards.map((card, idx) => {
                    const total = sortedLocalCards.length;
                    const rotation = total > 1 ? (idx - (total - 1) / 2) * (total > 12 ? 0.8 : 1.4) : 0;
                    const yLift = total > 1 ? Math.abs(idx - (total - 1) / 2) * (total > 12 ? 0.4 : 0.7) : 0;
                    const isLegal = canPlayCard(
                      sortedLocalCards,
                      card,
                      currentTrick.leadSuit,
                      isFirstTrick
                    ).legal;

                    const isPlayable = isMyTurn && isLegal;
                    const isBlurred = isMyTurn && !isLegal && playableCards.length > 0;
                    const isSelected = selectedCardId === card.id;

                    const bottomLiftPx = isSelected ? 30 : isPlayable ? 22 : 0;

                    return (
                      <div
                        key={card.id}
                        style={{
                          position: 'absolute',
                          left: `${idx * cardSpacingPx}px`,
                          bottom: `${bottomLiftPx}px`,
                          transform: `translateY(${yLift}px) rotate(${rotation}deg)`,
                          zIndex: isSelected ? 60 : isPlayable ? 35 + idx : 2 + idx,
                          transition:
                            'bottom 0.35s cubic-bezier(0.34, 1.4, 0.64, 1), transform 0.25s ease, z-index 0.2s',
                        }}
                      >
                        <CardView
                          card={card}
                          selected={isSelected}
                          isLegal={isLegal}
                          isMyTurn={isMyTurn}
                          isPlayableRaised={isPlayable}
                          isBlurred={isBlurred}
                          fourColorSuits={settings.fourColorSuits}
                          theme={theme}
                          scale={cardScale}
                          onClick={() => handleLocalCardClick(card)}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </footer>
        </div>
      )}


      {/* HOW TO PLAY TUTORIAL MODAL */}
      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}

      {/* TAKE / TRANSFER CARDS MODAL */}
      <TakeCardsModal
        isOpen={showTakeModal}
        onClose={() => setShowTakeModal(false)}
        players={players}
        localPlayer={localPlayer}
        onGiveCards={handleGiveAllCards}
        onTakeCards={handleTakePlayerCards}
      />

      {/* INCOMING CARD TRANSFER APPROVAL MODAL */}
      <TransferRequestModal
        request={incomingTransferRequest}
        onAccept={handleAcceptTransferRequest}
        onReject={handleRejectTransferRequest}
      />

      {/* RENAME PLAYER MODAL */}
      <RenamePlayerModal
        isOpen={!!renameTargetPlayer}
        player={renameTargetPlayer}
        isHost={localPlayer.isHost}
        allPlayers={players}
        onClose={() => setRenameTargetPlayer(null)}
        onRename={handleRenamePlayer}
      />

      {/* TABLE CHAT DRAWER */}
      <ChatDrawer
        isOpen={showChat}
        messages={messages}
        players={players}
        localPlayer={localPlayer}
        onSendMessage={(txt) => addChatMessage(txt, localPlayer)}
        onClose={() => setShowChat(false)}
      />

      {/* THULLA CINEMATIC CUT OVERLAY */}
      {thullaBanner && (
        <ThullaOverlay
          cutterName={thullaBanner.cutterName}
          pickerName={thullaBanner.pickerName}
          cutCard={thullaBanner.cutCard}
          highestLeadCard={thullaBanner.highestLeadCard}
          pickedCount={thullaBanner.pickedCount}
          onDismiss={() => setThullaBanner(null)}
        />
      )}

      {/* GAME OVER RESULTS MODAL */}
      {gamePhase === 'GAME_OVER' && (
        <ResultsModal
          players={players}
          bhabhiPlayer={bhabhiPlayer}
          neutralNames={settings.neutralNames}
          onRematch={handleStartGame}
          onLobby={() => setGamePhase('LOBBY')}
          onHome={handleGoHome}
        />
      )}
    </div>
  );
};

export default App;
