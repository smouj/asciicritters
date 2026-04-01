'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  PawPrint, Plus, Send, Trash2, Trophy, Star, RefreshCw,
  Sparkles, Zap, Coins, MessageCircle, ChevronRight,
  Volume2, VolumeX,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import type { Pet, Species, ChatMessage } from '@/lib/pets/types';
import {
  RARITY_LABELS, RARITY_COLORS, RARITY_BG,
  ACTION_CONFIG, STAT_CONFIG, MOOD_CONFIG,
} from '@/lib/pets/types';

const ASCIIPetCanvas = dynamic(
  () => import('@/components/pet/ASCIIPetCanvas'),
  { ssr: false, loading: () => <CanvasLoader /> }
);

function CanvasLoader() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-[#08080c]">
      <motion.div
        animate={{ rotate: 360, opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      >
        <PawPrint className="w-10 h-10 text-emerald-400/60" />
      </motion.div>
    </div>
  );
}

/* ═══════════ Stat Bar ═══════════ */
function StatBar({ statKey, value }: { statKey: 'hunger' | 'energy' | 'happiness' | 'health'; value: number }) {
  const cfg = STAT_CONFIG[statKey];
  const pct = Math.max(0, Math.min(100, value));
  const isLow = pct < 25;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[var(--text-dim)] flex items-center gap-1">
          <span className="text-xs">{cfg.icon}</span>
          {cfg.label}
        </span>
        <span className="text-[11px] font-mono font-medium" style={{ color: isLow ? '#f87171' : cfg.color }}>
          {pct}
        </span>
      </div>
      <div className="h-[5px] rounded-[1px] bg-white/[0.04] overflow-hidden">
        <motion.div
          className="h-full rounded-[1px]"
          style={{ backgroundColor: isLow ? '#f87171' : cfg.color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      </div>
    </div>
  );
}

/* ═══════════ Species Card ═══════════ */
function SpeciesCard({ sp, selected, onClick }: { sp: Species; selected: boolean; onClick: () => void }) {
  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
      <div
        onClick={onClick}
        className={`p-2.5 cursor-pointer transition-all duration-150 border ${
          selected
            ? 'border-emerald-500/60 bg-emerald-500/[0.07]'
            : 'border-white/[0.04] hover:border-white/[0.1] bg-white/[0.02]'
        }`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold">{sp.name}</span>
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-[1px]"
            style={{ color: RARITY_COLORS[sp.rarity], backgroundColor: RARITY_BG[sp.rarity] }}
          >
            {RARITY_LABELS[sp.rarity]}
          </span>
        </div>
        <pre
          className="text-[7px] leading-[9px] font-mono text-center py-1 rounded-[1px] bg-white/[0.02] overflow-hidden max-h-[72px]"
          style={{ color: sp.color }}
        >
          {sp.asciiArt}
        </pre>
      </div>
    </motion.div>
  );
}

/* ═══════════ Chat Bubble ═══════════ */
function ChatBubble({ msg, petColor }: { msg: ChatMessage; petColor: string }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] px-3 py-1.5 text-[11px] leading-relaxed ${
          isUser
            ? 'bg-white/[0.08] text-white/80 rounded-[1px] rounded-br-sm'
            : 'rounded-[1px] rounded-bl-sm'
        }`}
        style={!isUser ? { backgroundColor: petColor + '12', color: petColor } : {}}
      >
        {msg.content}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════ */
/*                   MAIN PAGE                          */
/* ═══════════════════════════════════════════════════ */

export default function Home() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [petName, setPetName] = useState('');
  const [selSpeciesId, setSelSpeciesId] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [actionPulse, setActionPulse] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  const [actionCount, setActionCount] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'actions' | 'chat'>('actions');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const userId = 'default-user';

  // Fetch species
  useEffect(() => {
    fetch('/api/species').then(r => r.json()).then(d => setSpecies(d.species || [])).catch(() => {});
  }, []);

  // Fetch pets
  const fetchPets = useCallback(async () => {
    try {
      setLoading(true);
      const r = await fetch(`/api/pets?userId=${userId}`);
      const d = await r.json();
      const list = d.pets || [];
      setPets(list);
      if (list.length > 0 && !selectedPet) setSelectedPet(list[0]);
    } catch {} finally { setLoading(false); }
  }, [selectedPet]);

  useEffect(() => { fetchPets(); }, [fetchPets]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const currentSpecies = useMemo(() => {
    if (!selectedPet) return null;
    return species.find(s => s.id === selectedPet.species);
  }, [selectedPet, species]);

  const moodInfo = useMemo(() => {
    if (!selectedPet) return MOOD_CONFIG.neutral;
    return MOOD_CONFIG[selectedPet.mood] || MOOD_CONFIG.neutral;
  }, [selectedPet]);

  /* ─── Create Pet ─── */
  const handleCreate = async () => {
    if (!selSpeciesId) { toast.error('Select a species'); return; }
    try {
      setCreating(true);
      const r = await fetch('/api/pets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name: petName || undefined, speciesId: selSpeciesId }),
      });
      const d = await r.json();
      if (r.ok) {
        toast.success(`${d.speciesInfo?.name} "${d.pet.name}" adopted!`);
        setShowCreate(false);
        setPetName('');
        setSelSpeciesId(null);
        await fetchPets();
        setSelectedPet(d.pet);
        setChatMessages([]);
      } else toast.error(d.error);
    } catch { toast.error('Failed'); } finally { setCreating(false); }
  };

  /* ─── Perform Action ─── */
  const handleAction = async (action: string) => {
    if (!selectedPet || acting) return;
    try {
      setActing(true);
      setActionPulse(Date.now());
      const r = await fetch(`/api/pets/${selectedPet.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const d = await r.json();
      if (r.ok) {
        setSelectedPet(d.pet);
        setPets(prev => prev.map(p => p.id === d.pet.id ? d.pet : p));
        setTotalTokens(prev => prev + (d.tokensUsed || 1));
        setActionCount(prev => prev + 1);
        if (d.leveledUp) {
          toast.success(`🎉 Level ${d.newLevel}!`, { duration: 3000 });
        }
        // Pet speaks after action
        const petEmotes: Record<string, string> = {
          feed: 'Mmm delicious!',
          play: 'Wheee! So fun!',
          train: 'Getting stronger!',
          heal: 'I feel better!',
          rest: 'Zzz... so cozy...',
          pet: 'Purrr...',
        };
        setChatMessages(prev => [
          ...prev,
          { id: crypto.randomUUID(), role: 'pet', content: petEmotes[action] || '*happy noises*', timestamp: Date.now() },
        ]);
        toast.success(`${ACTION_CONFIG[action as keyof typeof ACTION_CONFIG]?.icon} ${d.action.message}`);
      } else toast.error(d.error);
    } catch { toast.error('Action failed'); } finally { setActing(false); }
  };

  /* ─── Send Chat ─── */
  const handleChat = async () => {
    if (!selectedPet || !chatInput.trim() || chatLoading) return;
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(), role: 'user', content: chatInput.trim(), timestamp: Date.now(),
    };
    setChatMessages(prev => [...prev, userMsg]);
    const text = chatInput.trim();
    setChatInput('');
    setChatLoading(true);
    try {
      const r = await fetch(`/api/pets/${selectedPet.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const d = await r.json();
      if (r.ok) {
        const petMsg: ChatMessage = {
          id: crypto.randomUUID(), role: 'pet', content: d.reply, timestamp: Date.now(),
        };
        setChatMessages(prev => [...prev, petMsg]);
        setTotalTokens(prev => prev + (d.tokensUsed || 0));
        // Update mood if changed
        if (d.mood && d.mood !== selectedPet.mood) {
          setSelectedPet(prev => prev ? { ...prev, mood: d.mood } : prev);
        }
      } else {
        setChatMessages(prev => [...prev, {
          id: crypto.randomUUID(), role: 'pet', content: '... (error)', timestamp: Date.now(),
        }]);
      }
    } catch {
      setChatMessages(prev => [...prev, {
        id: crypto.randomUUID(), role: 'pet', content: '... (connection lost)', timestamp: Date.now(),
      }]);
    } finally { setChatLoading(false); }
  };

  /* ─── Delete Pet ─── */
  const handleDelete = async (petId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/pets/${petId}`, { method: 'DELETE' });
      await fetch(`/api/pets/${petId}/chat`, { method: 'DELETE' });
      toast.success('Pet released');
      const remaining = pets.filter(p => p.id !== petId);
      setPets(remaining);
      if (selectedPet?.id === petId) setSelectedPet(remaining[0] || null);
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0f] text-white/90 overflow-hidden">
      {/* ─── Top Bar ─── */}
      <header className="shrink-0 flex items-center justify-between px-4 h-11 border-b border-white/[0.05] bg-[#0c0c12]">
        <div className="flex items-center gap-2.5">
          <motion.div animate={{ rotate: [0, 8, -8, 0] }} transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}>
            <PawPrint className="w-5 h-5 text-emerald-400" />
          </motion.div>
          <div className="leading-tight">
            <span className="text-sm font-bold tracking-tight">
              <span className="text-emerald-400">ASCII</span>
              <span className="text-white/70">Critters</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 text-[10px] font-mono">
            <div className="flex items-center gap-1 text-amber-400/80">
              <Coins className="w-3 h-3" />
              <span>{totalTokens} tokens</span>
            </div>
            <div className="flex items-center gap-1 text-emerald-400/80">
              <Zap className="w-3 h-3" />
              <span>{actionCount} actions</span>
            </div>
            <div className="flex items-center gap-1 text-white/50">
              <PawPrint className="w-3 h-3" />
              <span>{pets.length}/10</span>
            </div>
          </div>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 px-2.5 text-[11px] bg-emerald-500/90 hover:bg-emerald-500 text-white rounded-[1px] gap-1">
                <Plus className="w-3.5 h-3.5" />
                Adopt
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl rounded-[1px] border-white/[0.06] bg-[#0e0e14] p-0 max-h-[80vh] overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-white/[0.05] flex items-center justify-between">
                <DialogTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Adopt a Companion
                </DialogTitle>
              </div>
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="px-4 pt-3 pb-2">
                  <Input
                    placeholder="Name (optional — random if empty)"
                    value={petName}
                    onChange={e => setPetName(e.target.value)}
                    maxLength={20}
                    className="h-8 text-xs bg-white/[0.03] border-white/[0.06] rounded-[1px] focus:border-emerald-500/50"
                  />
                </div>
                <div className="px-4 pb-1">
                  <span className="text-[10px] text-white/40 font-medium">Select species</span>
                </div>
                <ScrollArea className="flex-1 px-4 pb-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {species.map(s => (
                      <SpeciesCard key={s.id} sp={s} selected={selSpeciesId === s.id} onClick={() => setSelSpeciesId(s.id)} />
                    ))}
                  </div>
                </ScrollArea>
                <div className="px-4 py-2.5 border-t border-white/[0.05]">
                  <Button
                    onClick={handleCreate}
                    disabled={!selSpeciesId || creating}
                    className="w-full h-8 bg-emerald-500/90 hover:bg-emerald-500 text-white rounded-[1px] text-xs"
                  >
                    {creating ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}><RefreshCw className="w-3.5 h-3.5" /></motion.div>
                    ) : (
                      <><PawPrint className="w-3.5 h-3.5 mr-1.5" /> Adopt Companion</>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
            <PawPrint className="w-14 h-14 text-emerald-400/40" />
          </motion.div>
        </div>
      ) : !selectedPet ? (
        /* ─── Empty State ─── */
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2.5, repeat: Infinity }} className="mb-5">
            <div className="w-20 h-20 rounded-[1px] border-2 border-dashed border-white/10 flex items-center justify-center">
              <PawPrint className="w-9 h-9 text-white/15" />
            </div>
          </motion.div>
          <h2 className="text-lg font-semibold mb-1.5 text-white/70">No Companions Yet</h2>
          <p className="text-xs text-white/30 max-w-xs mb-5 leading-relaxed">
            Adopt your first 3D ASCII pet. Each creature is unique — with its own personality, rarity, and appearance rendered in stunning 3D.
          </p>
          <Button onClick={() => setShowCreate(true)} className="h-8 px-4 text-xs bg-emerald-500/90 hover:bg-emerald-500 text-white rounded-[1px] gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Adopt Your First Pet
          </Button>
        </div>
      ) : (
        /* ─── Main Layout ─── */
        <div className="flex-1 flex overflow-hidden">
          {/* ── Left: Pet List ── */}
          <aside className="w-52 shrink-0 border-r border-white/[0.04] bg-[#0b0b10] flex flex-col">
            <div className="px-3 py-2 text-[10px] font-semibold text-white/30 uppercase tracking-wider">
              Companions
            </div>
            <ScrollArea className="flex-1 px-2 pb-2">
              <div className="space-y-0.5">
                {pets.map(pet => {
                  const sp = species.find(s => s.id === pet.species);
                  const active = pet.id === selectedPet?.id;
                  return (
                    <motion.div key={pet.id} whileTap={{ scale: 0.98 }}>
                      <div
                        onClick={() => { setSelectedPet(pet); setChatMessages([]); setActiveTab('actions'); }}
                        className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer transition-all duration-100 rounded-[1px] group ${
                          active ? 'bg-white/[0.06]' : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <div
                          className="w-7 h-7 rounded-[1px] flex items-center justify-center text-[10px] font-bold shrink-0"
                          style={{ backgroundColor: sp?.color + '18', color: sp?.color }}
                        >
                          {pet.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] font-medium truncate">{pet.name}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[9px] text-white/25">
                            <span>{sp?.name}</span>
                            <span>·</span>
                            <span>Lv.{pet.level}</span>
                            <span
                              className="font-bold"
                              style={{ color: RARITY_COLORS[pet.rarity] }}
                            >
                              {RARITY_LABELS[pet.rarity].charAt(0)}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={e => handleDelete(pet.id, e)}
                          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 p-0.5 text-white/30 hover:text-red-400 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
            {/* Stats summary */}
            {selectedPet && (
              <div className="px-3 py-2 border-t border-white/[0.04] space-y-1">
                <StatBar statKey="hunger" value={selectedPet.hunger} />
                <StatBar statKey="energy" value={selectedPet.energy} />
                <StatBar statKey="happiness" value={selectedPet.happiness} />
                <StatBar statKey="health" value={selectedPet.health} />
              </div>
            )}
          </aside>

          {/* ── Center: 3D Canvas ── */}
          <main className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 relative">
              <ASCIIPetCanvas
                asciiArt={selectedPet.asciiArt}
                color={currentSpecies?.color || '#4ade80'}
                glowColor={currentSpecies?.glowColor || '#22c55e'}
                mood={selectedPet.mood}
                actionPulse={actionPulse}
                className="absolute inset-0"
              />
              {/* Overlay: Pet Name + Mood */}
              <div className="absolute top-3 left-4 right-4 flex items-start justify-between pointer-events-none">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold">{selectedPet.name}</h2>
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-[1px]"
                      style={{ color: RARITY_COLORS[selectedPet.rarity], backgroundColor: RARITY_BG[selectedPet.rarity] }}
                    >
                      {RARITY_LABELS[selectedPet.rarity]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-white/40">{currentSpecies?.name}</span>
                    <div
                      className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-[1px]"
                      style={{ color: moodInfo.color, backgroundColor: moodInfo.bgColor }}
                    >
                      <motion.span
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="text-xs"
                      >
                        {moodInfo.emoji}
                      </motion.span>
                      {moodInfo.label}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-right">
                  <div className="text-[10px] text-white/25 flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-amber-500/50" />
                    <span className="font-mono">Lv.{selectedPet.level}</span>
                  </div>
                  <div className="w-14 h-[3px] rounded-[1px] bg-white/[0.04]">
                    <div
                      className="h-full rounded-[1px] bg-amber-500/70 transition-all duration-500"
                      style={{ width: `${(selectedPet.xp % 50) / 50 * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              {/* Overlay: Session stats */}
              <div className="absolute bottom-3 left-4 flex items-center gap-3 pointer-events-none">
                <div className="flex items-center gap-3 text-[9px] font-mono text-white/20">
                  <span>Total XP: {selectedPet.xp}</span>
                  <span>·</span>
                  <span>Actions: {actionCount}</span>
                  <span>·</span>
                  <span>Tokens: {totalTokens}</span>
                </div>
              </div>
            </div>

            {/* ── Bottom Panel ── */}
            <div className="shrink-0 h-[260px] border-t border-white/[0.04] bg-[#0b0b10] flex flex-col">
              {/* Tab switcher */}
              <div className="flex items-center gap-0 px-3 h-9 border-b border-white/[0.04]">
                <button
                  onClick={() => setActiveTab('actions')}
                  className={`flex items-center gap-1.5 px-3 h-full text-[11px] font-medium transition-colors border-b-2 -mb-px ${
                    activeTab === 'actions'
                      ? 'text-emerald-400 border-emerald-400/60'
                      : 'text-white/30 border-transparent hover:text-white/50'
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  Actions
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex items-center gap-1.5 px-3 h-full text-[11px] font-medium transition-colors border-b-2 -mb-px ${
                    activeTab === 'chat'
                      ? 'text-emerald-400 border-emerald-400/60'
                      : 'text-white/30 border-transparent hover:text-white/50'
                  }`}
                >
                  <MessageCircle className="w-3 h-3" />
                  Chat
                </button>
              </div>

              <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                  {activeTab === 'actions' ? (
                    <motion.div
                      key="actions"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="h-full flex flex-col"
                    >
                      {/* Action buttons */}
                      <div className="flex-1 flex items-center justify-center px-4 py-3">
                        <div className="grid grid-cols-6 gap-2 w-full max-w-lg">
                          {(Object.keys(ACTION_CONFIG) as Array<keyof typeof ACTION_CONFIG>).map(key => {
                            const cfg = ACTION_CONFIG[key];
                            const disabled = acting || (key === 'train' && selectedPet.energy < 10);
                            return (
                              <motion.div key={key} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }}>
                                <button
                                  disabled={disabled}
                                  onClick={() => handleAction(key)}
                                  className={`flex flex-col items-center gap-1 w-full py-2.5 px-1 rounded-[1px] border transition-all duration-150 ${
                                    disabled
                                      ? 'opacity-30 border-white/[0.02] cursor-not-allowed'
                                      : 'border-white/[0.06] hover:border-white/[0.12] active:bg-white/[0.04]'
                                  }`}
                                >
                                  <span className="text-lg">{cfg.icon}</span>
                                  <span className="text-[9px] font-medium text-white/60">{cfg.label}</span>
                                  <span className="text-[8px] font-mono" style={{ color: cfg.color }}>
                                    {cfg.cost} tok
                                  </span>
                                </button>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                      {/* Action description bar */}
                      <div className="shrink-0 px-4 py-2 border-t border-white/[0.03] flex items-center justify-between text-[9px] text-white/20">
                        <span>Click an action to interact with {selectedPet.name}</span>
                        <span className="font-mono">Energy: {selectedPet.energy}/100</span>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="chat"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="h-full flex flex-col"
                    >
                      {/* Chat messages */}
                      <ScrollArea className="flex-1 px-4 py-2">
                        <div className="space-y-2">
                          {chatMessages.length === 0 && (
                            <div className="text-center text-[10px] text-white/15 py-8">
                              <MessageCircle className="w-5 h-5 mx-auto mb-2 opacity-40" />
                              Talk to {selectedPet.name} — it&apos;ll respond based on its personality and mood!
                            </div>
                          )}
                          {chatMessages.map(m => (
                            <ChatBubble key={m.id} msg={m} petColor={currentSpecies?.color || '#4ade80'} />
                          ))}
                          {chatLoading && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="flex items-center gap-1 text-[10px] text-white/20"
                            >
                              <motion.span animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity }}>
                                ●
                              </motion.span>
                              <span>{selectedPet.name} is thinking...</span>
                            </motion.div>
                          )}
                          <div ref={chatEndRef} />
                        </div>
                      </ScrollArea>
                      {/* Chat input */}
                      <div className="shrink-0 px-3 py-2 border-t border-white/[0.04]">
                        <form
                          onSubmit={e => { e.preventDefault(); handleChat(); }}
                          className="flex items-center gap-2"
                        >
                          <Input
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            placeholder={`Talk to ${selectedPet.name}...`}
                            disabled={chatLoading}
                            maxLength={500}
                            className="h-8 text-xs bg-white/[0.03] border-white/[0.06] rounded-[1px] focus:border-emerald-500/40 placeholder:text-white/15"
                          />
                          <Button
                            type="submit"
                            size="sm"
                            disabled={!chatInput.trim() || chatLoading}
                            className="h-8 w-8 p-0 bg-emerald-500/80 hover:bg-emerald-500 rounded-[1px] shrink-0"
                          >
                            {chatLoading ? (
                              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>
                                <RefreshCw className="w-3.5 h-3.5" />
                              </motion.div>
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </form>
                        <div className="flex items-center justify-between mt-1.5 text-[9px] text-white/15">
                          <span>{selectedPet.name} responds based on its mood and personality</span>
                          <span className="font-mono">~2 tok/msg</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </main>

          {/* ── Right: Info Panel ── */}
          <aside className="w-48 shrink-0 border-l border-white/[0.04] bg-[#0b0b10] flex flex-col">
            <div className="px-3 py-2 text-[10px] font-semibold text-white/30 uppercase tracking-wider">
              Details
            </div>
            <ScrollArea className="flex-1 px-3 pb-3">
              <div className="space-y-3">
                {/* Species card */}
                <div className="border border-white/[0.04] rounded-[1px] p-2 bg-white/[0.01]">
                  <div className="text-[10px] text-white/25 mb-1">Species</div>
                  <div className="text-[11px] font-semibold" style={{ color: currentSpecies?.color }}>
                    {currentSpecies?.name}
                  </div>
                  <div className="text-[9px] text-white/30 mt-0.5 leading-relaxed">
                    {currentSpecies?.description}
                  </div>
                </div>

                {/* Level card */}
                <div className="border border-white/[0.04] rounded-[1px] p-2 bg-white/[0.01]">
                  <div className="text-[10px] text-white/25 mb-1">Progression</div>
                  <div className="flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-sm font-bold font-mono">{selectedPet.level}</span>
                    <div className="flex-1 h-[3px] rounded-[1px] bg-white/[0.04]">
                      <div
                        className="h-full rounded-[1px] bg-amber-500/70 transition-all duration-500"
                        style={{ width: `${(selectedPet.xp % 50) / 50 * 100}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-white/30">{selectedPet.xp % 50}/50</span>
                  </div>
                  <div className="text-[9px] text-white/20 mt-1">
                    Next level in {50 - (selectedPet.xp % 50)} XP
                  </div>
                </div>

                {/* Rarity */}
                <div className="border border-white/[0.04] rounded-[1px] p-2 bg-white/[0.01]">
                  <div className="text-[10px] text-white/25 mb-1">Rarity</div>
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3 h-3" style={{ color: RARITY_COLORS[selectedPet.rarity] }} />
                    <span className="text-[11px] font-semibold" style={{ color: RARITY_COLORS[selectedPet.rarity] }}>
                      {RARITY_LABELS[selectedPet.rarity]}
                    </span>
                    <span className="text-[9px] text-white/20">({selectedPet.rarity}/5)</span>
                  </div>
                </div>

                {/* Session Stats */}
                <div className="border border-white/[0.04] rounded-[1px] p-2 bg-white/[0.01]">
                  <div className="text-[10px] text-white/25 mb-1.5">Session</div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-white/30 flex items-center gap-1"><Coins className="w-3 h-3 text-amber-400/60" /> Tokens</span>
                      <span className="font-mono text-amber-400/70">{totalTokens}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-white/30 flex items-center gap-1"><Zap className="w-3 h-3 text-emerald-400/60" /> Actions</span>
                      <span className="font-mono text-emerald-400/70">{actionCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-white/30 flex items-center gap-1"><MessageCircle className="w-3 h-3 text-blue-400/60" /> Messages</span>
                      <span className="font-mono text-blue-400/70">{chatMessages.filter(m => m.role === 'user').length}</span>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="border border-white/[0.04] rounded-[1px] p-2 bg-white/[0.01]">
                  <div className="text-[10px] text-white/25 mb-1.5">Timeline</div>
                  <div className="space-y-1 text-[9px] font-mono text-white/25">
                    <div className="flex justify-between">
                      <span>Created</span>
                      <span>{new Date(selectedPet.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Updated</span>
                      <span>{new Date(selectedPet.updatedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </aside>
        </div>
      )}
    </div>
  );
}
