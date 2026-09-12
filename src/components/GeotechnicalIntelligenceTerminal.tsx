import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  X, 
  Sparkles, 
  RotateCcw,
  ShieldAlert,
  Bot,
  MessageSquare,
  AlertTriangle,
  HelpCircle,
  Car,
  Navigation
} from 'lucide-react';
import { HighwaySegment, SegmentRiskTelemetry, GeotechnicalQueryMessage } from '../types';

interface GeotechnicalIntelligenceTerminalProps {
  isOpen: boolean;
  onClose: () => void;
  segments: HighwaySegment[];
  telemetries: Map<string, SegmentRiskTelemetry>;
  rain1h: number;
  rain24h: number;
  onTriggerEmergencyModal: () => void;
}

export const GeotechnicalIntelligenceTerminal: React.FC<GeotechnicalIntelligenceTerminalProps> = ({
  isOpen,
  onClose,
  segments,
  telemetries,
  rain1h,
  rain24h,
  onTriggerEmergencyModal,
}) => {
  const [messages, setMessages] = useState<GeotechnicalQueryMessage[]>([
    {
      id: 'init-1',
      sender: 'ENGINE',
      timestamp: new Date().toLocaleTimeString(),
      text: `### 👋 Welcome to Ask AI: Highway Safety Assistant
I am your **AI Highway Landslide & Travel Safety Advisor** for the NH-58 mountain corridor (Rishikesh – Devprayag – Rudraprayag – Badrinath).

**Current Weather:** Rainfall rate is **${rain1h.toFixed(1)} mm/hr** (Past 24h total: **${rain24h.toFixed(1)} mm**).

Ask me any question in plain English or select a quick question below!`,
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  // Intelligent, user-friendly response generator
  const generateAIResponse = (query: string): string => {
    const lower = query.toLowerCase();

    // STRICT REFUSAL 1: Code generation / programming
    if (
      lower.includes('write code') || 
      lower.includes('python') || 
      lower.includes('javascript') || 
      lower.includes('typescript') || 
      lower.includes('write a script') || 
      lower.includes('sql query') || 
      lower.includes('c++') ||
      lower.includes('html') ||
      lower.includes('function(')
    ) {
      return 'Access Denied: Code generation and software programming tasks are permanently disabled on this system.';
    }

    // STRICT REFUSAL 2: General knowledge, pop culture, trivia, off-topic
    if (
      lower.includes('joke') || 
      lower.includes('weather in paris') || 
      lower.includes('who is the president') || 
      lower.includes('movie') || 
      lower.includes('poem') || 
      lower.includes('song lyrics') || 
      lower.includes('capital of')
    ) {
      return 'Access Denied: This system is strictly restricted to geotechnical slope stability analytics and highway hazard intelligence.';
    }

    const unstableList = segments.filter((s) => telemetries.get(s.id)?.riskTier === 'UNSTABLE');
    const marginalList = segments.filter((s) => telemetries.get(s.id)?.riskTier === 'MARGINAL');

    // SCENARIO: "Is it safe to drive?" / "Is NH-58 open?"
    if (lower.includes('safe to drive') || lower.includes('can i drive') || lower.includes('is it safe') || lower.includes('highway open') || lower.includes('road open') || lower.includes('travel to badrinath')) {
      if (unstableList.length > 0) {
        return `### 🚨 TRAVEL ADVISORY: HIGH HAZARD DETECTED ON NH-58
**Recommendation:** **AVOID NON-ESSENTIAL TRAVEL** through affected mountain sectors.

Currently, **${unstableList.length} road section${unstableList.length > 1 ? 's are' : ' is'} at CRITICAL DANGER** of landslide collapse:
${unstableList.map((s) => `* **${s.name} (Km ${s.chainageKm}):** Severe rockfall / debris flow danger. Road closure advised.`).join('\n')}

${marginalList.length > 0 ? `\n**CAUTION SECTORS (${marginalList.length}):**\n${marginalList.map((s) => `* ${s.name} (Km ${s.chainageKm}) - Drive under 20 km/h, watch for loose stones.`).join('\n')}` : ''}

**Safety Instructions for Commuters:**
1. Do not park or stop your vehicle directly underneath steep cliff faces.
2. If traveling, halt at designated safe parking zones near Rishikesh or Srinagar town.
3. Check with Border Roads Organisation (BRO) and local Uttarakhand Police before proceeding.`;
      } else {
        return `###  TRAVEL ADVISORY: HIGHWAY CLEAR & STABLE
**Recommendation:** **NORMAL TRAVEL PERMITTED WITH STANDARD RAIN CAUTION.**

Under current rainfall levels (${rain1h.toFixed(1)} mm/h), all monitored highway sections along NH-58 currently have sufficient ground strength to prevent mass slope collapse.
* Continue to obey mountain speed limits (30–40 km/h).
* Turn on headlights during heavy rain or mountain mist.`;
      }
    }

    // SCENARIO: Sirobagarh Slide Zone
    if (lower.includes('sirobagarh') || lower.includes('s06') || lower.includes('fault zone')) {
      const seg = segments.find((s) => s.id === 'NH58-S06') || segments[5];
      const tel = telemetries.get(seg.id);
      const isDangerous = (tel?.fos || 0) < 1.0;

      return `### 📍 SIROBAGARH FAULT ZONE (KM 98.5) SAFETY REPORT
**Status:** ${isDangerous ? '🚨 HIGH DANGER - IMMINENT LANDSLIDE COLLAPSE' : '⚠️ MODERATE RISK - DRIVE WITH CAUTION'}

**Why is this stretch so vulnerable?**
* **Geology:** Crushed and shattered rock along the active Srinagar Thrust fault line.
* **Cliff Steepness:** Very steep mountain cut slope of **${seg.slopeBeta}°**.
* **Current Rainfall Impact:** Recent rainfall has soaked into the soil, creating a waterlogged ground layer of **${tel?.waterTableHeightM.toFixed(1) || 1.8} meters**.
* **The Physics in Simple Words:** Water makes the mud heavy and slippery while reducing the friction that holds the rock in place. Gravity pulls the waterlogged mud downward, creating high risk of rocks tumbling across the highway.

**Traveler Advice:** Avoid stopping your car here. Watch for debris and follow BRO flagmen directives.`;
    }

    // SCENARIO: Why do landslides happen / How does rain cause them?
    if (lower.includes('why') || lower.includes('how rain') || lower.includes('water pressure') || lower.includes('explain') || lower.includes('coupling')) {
      return `### 🌧️ HOW RAIN CAUSES MOUNTAIN HIGHWAY LANDSLIDES (SIMPLE EXPLANATION)

Landslides on Himalayan highways like NH-58 happen because of a physical tug-of-war between two forces:
1. **Driving Force (Gravity):** The weight of the hillside pulling downward along the steep slope.
2. **Resisting Force (Friction & Cohesion):** The grip between soil particles and bedrock holding the slope in place.

**What happens when it rains?**
* **1. Rain Sinks In:** Water infiltrates into the loose soil on the mountainside.
* **2. Added Weight:** Wet soil is up to 30% heavier than dry soil, increasing the downward gravitational pull.
* **3. Water Pressure (Lubrication):** As water accumulates underground, it creates **pore-water pressure** ($u$). This pressure literally pushes soil particles apart from each other, like an air-hockey table, drastically reducing friction!
* **4. Slope Failure:** When friction drops below gravity, the entire mountainside slides down onto the highway.

*(In engineering terms, this is calculated as the **Factor of Safety (FoS)** using the **Infinite Slope Model**. When FoS drops below 1.00, collapse occurs).*`;
    }

    // SCENARIO: Highway Closure Advisory
    if (lower.includes('closure') || lower.includes('recommend') || lower.includes('action') || lower.includes('police')) {
      return `### 📋 OFFICIAL HIGHWAY TRAFFIC MANAGEMENT RECOMMENDATIONS
**CORRIDOR:** NH-58 Mountain Alignment (Garhwal)

1. **Checkpoint Controls:**
   * Restrict heavy commercial trucks at Byasi and Devprayag if rainfall exceeds 50 mm/hr.
   * Mandate 100-meter minimum vehicle spacing across steep gorge sectors (Totaghati, Kaliasaur).
2. **Clearance Equipment Pre-positioning:**
   * Keep hydraulic rock-breakers and wheel loaders on hot standby at Rudraprayag and Srinagar bases.
3. **Emergency Helplines:**
   * Uttarakhand State Disaster Response Force (SDRF): **1070 / 112**
   * BRO Project Shivalik Road Control: **Active**`;
    }

    // DEFAULT SYNTHESIS
    return `### 🤖 HIGHWAY SAFETY AI SYNTHESIS
**NH-58 Monitoring Status:**
* **Total Road Sections:** ${segments.length} monitored continuously
* **Current Rainfall Intensity:** ${rain1h.toFixed(1)} mm/hr
* **Dangerous High-Risk Sections:** ${unstableList.length}
* **Caution Sections:** ${marginalList.length}

You can ask:
* *"Is it safe to drive to Badrinath today?"*
* *"Which road stretches are dangerous?"*
* *"Why is Sirobagarh prone to slides?"*
* *"Explain the science of rain-induced landslides"*`;
  };

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || inputQuery;
    if (!query.trim()) return;

    const userMsg: GeotechnicalQueryMessage = {
      id: `usr-${Date.now()}`,
      sender: 'OPERATOR',
      text: query,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsProcessing(true);

    try {
      // Summarize current segment statuses for the AI model
      const segmentsSummary = segments.map((s) => {
        const tel = telemetries.get(s.id);
        return {
          id: s.id,
          name: s.name,
          chainageKm: s.chainageKm,
          slopeBeta: s.slopeBeta,
          riskTier: tel?.riskTier || 'UNKNOWN',
          fos: tel?.infiniteSlopeFoS || 1.5,
        };
      });

      const resp = await fetch('/api/geotechnical-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          segmentsSummary,
          rain1h,
          rain24h,
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        const responseText = data.reply || generateAIResponse(query);
        const isEmergencyModalTriggered = responseText.includes('[MODAL TRIGGER') || responseText.includes('🚨 HIGH DANGER');

        const engineMsg: GeotechnicalQueryMessage = {
          id: `eng-${Date.now()}`,
          sender: 'ENGINE',
          text: responseText,
          timestamp: new Date().toLocaleTimeString(),
        };

        setMessages((prev) => [...prev, engineMsg]);
        setIsProcessing(false);

        if (isEmergencyModalTriggered) {
          onTriggerEmergencyModal();
        }
        return;
      }
    } catch (err) {
      console.warn('Backend Gemini API call error, falling back to local engine:', err);
    }

    // Fallback if fetch failed
    const responseText = generateAIResponse(query);
    const engineMsg: GeotechnicalQueryMessage = {
      id: `eng-${Date.now()}`,
      sender: 'ENGINE',
      text: responseText,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, engineMsg]);
    setIsProcessing(false);
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-950 border-2 border-cyan-500/60 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.3)] overflow-hidden my-auto flex flex-col h-[82vh]">
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 border-b border-cyan-500/40">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm text-slate-100 flex items-center gap-2">
                Ask AI: Highway Safety & Landslide Assistant
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold">
                  LIVE AI
                </span>
              </span>
              <p className="text-[11px] text-slate-400">
                Ask anything about road conditions, landslide risks, or travel safety
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setMessages([
                  {
                    id: 'init-reset',
                    sender: 'ENGINE',
                    timestamp: new Date().toLocaleTimeString(),
                    text: `Chat reset. Ask me any question about highway safety or landslide risk!`,
                  },
                ]);
              }}
              className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Reset conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Question Suggested Chips */}
        <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-slate-400 shrink-0 flex items-center gap-1 text-[11px]">
            <Sparkles className="w-3 h-3 text-cyan-400" /> Suggested:
          </span>
          <button
            onClick={() => handleSend('Is it safe to drive along NH-58 today?')}
            className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-cyan-950 border border-slate-700 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-200 shrink-0 transition-colors cursor-pointer text-xs"
          >
            🚗 Is it safe to drive today?
          </button>
          <button
            onClick={() => handleSend('Which road sections have active landslide warnings?')}
            className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-cyan-950 border border-slate-700 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-200 shrink-0 transition-colors cursor-pointer text-xs"
          >
            ⚠️ High risk road sections
          </button>
          <button
            onClick={() => handleSend('Why is the Sirobagarh section dangerous right now?')}
            className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-cyan-950 border border-slate-700 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-200 shrink-0 transition-colors cursor-pointer text-xs"
          >
            📍 Sirobagarh status
          </button>
          <button
            onClick={() => handleSend('Explain in simple words how heavy rain causes landslides')}
            className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-cyan-950 border border-slate-700 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-200 shrink-0 transition-colors cursor-pointer text-xs"
          >
            🌧️ How rain causes landslides
          </button>
        </div>

        {/* Chat Message Stream */}
        <div className="flex-1 p-4 overflow-y-auto text-xs sm:text-sm space-y-4 bg-slate-950 text-slate-200">
          {messages.map((msg) => {
            const isEngine = msg.sender === 'ENGINE';
            return (
              <div
                key={msg.id}
                className={`p-4 rounded-2xl border ${
                  isEngine
                    ? 'bg-slate-900/90 border-slate-800 text-slate-200 mr-4'
                    : 'bg-gradient-to-r from-cyan-950/70 to-blue-950/70 border-cyan-500/40 text-cyan-100 ml-8'
                }`}
              >
                <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-800/80 text-[10px] text-slate-400">
                  <span className={isEngine ? 'text-cyan-400 font-bold flex items-center gap-1.5' : 'text-slate-300 font-bold flex items-center gap-1.5'}>
                    {isEngine ? <Bot className="w-3.5 h-3.5" /> : <Navigation className="w-3.5 h-3.5" />}
                    {isEngine ? 'AI HIGHWAY ADVISOR' : 'YOU'}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>

                <div className="whitespace-pre-wrap leading-relaxed space-y-2 text-xs sm:text-sm">
                  {msg.text}
                </div>
              </div>
            );
          })}

          {isProcessing && (
            <div className="flex items-center gap-2 text-cyan-400 text-xs p-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Analyzing live highway telemetry and weather conditions...</span>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Query Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Ask a question (e.g., 'Is the highway open between Devprayag and Srinagar?')..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            disabled={isProcessing}
            className="flex-1 px-4 py-2.5 rounded-full bg-slate-950 border border-slate-700 text-slate-200 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-cyan-500"
          />

          <button
            type="submit"
            disabled={isProcessing || !inputQuery.trim()}
            className="px-5 py-2.5 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-md"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Ask</span>
          </button>
        </form>
      </div>
    </div>
  );
};
