import { useEffect, useMemo, useState } from "react";

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}
function sparkPath(values: number[], width: number, height: number, pad = 4) {
  if (!values.length) return "";
  const w = width - pad * 2;
  const h = height - pad * 2;
  const step = w / Math.max(values.length - 1, 1);
  const pts = values.map((v, i) => [pad + i * step, pad + (1 - v) * h]);
  return pts.map((p, i) => (i ? "L" : "M") + p[0] + "," + p[1]).join(" ");
}

const PRESETS: Record<string, { name: string; win: number; rewardR: number; lossR: number; note?: string }> = {
  vantharp: { name: "Van Tharp", win: 60, rewardR: 2, lossR: 1, note: "60% +2R / 40% -1R" },
  breakout: { name: "Breakout", win: 40, rewardR: 3, lossR: 1, note: "40% +3R / 60% -1R" },
  scalper: { name: "Scalper", win: 65, rewardR: 1, lossR: 1.5, note: "65% +1R / 35% -1.5R" },
  trend: { name: "Trend", win: 30, rewardR: 5, lossR: 1, note: "30% +5R / 70% -1R" },
};

export default function App() {
  const [winPct, setWinPct] = useState(55);
  const [rewardR, setRewardR] = useState(2);
  const [lossR, setLossR] = useState(1);
  const [bankroll] = useState(1000);
  const [equity, setEquity] = useState(1000);
  const [riskPct, setRiskPct] = useState(2);
  const [speedMs, setSpeedMs] = useState(250);
  const [auto, setAuto] = useState(false);
  const [tradeCount, setTradeCount] = useState(0);
  const [wins, setWins] = useState(0);
  const [, setLosses] = useState(0);
  const [, setPeak] = useState(1000);
  const [maxDD, setMaxDD] = useState(0);
  const [lastOutcome, setLastOutcome] = useState<{R:number;pnl:number} | null>(null);
  const [eqHist, setEqHist] = useState<number[]>([1000]);

  const EV = useMemo(() => {
    const p = Math.max(0, Math.min(1, winPct / 100));
    return p * rewardR - (1 - p) * lossR;
  }, [winPct, rewardR, lossR]);

  function sampleR(): number {
    const p = Math.max(0, Math.min(1, winPct / 100));
    return Math.random() < p ? rewardR : -lossR;
  }

  function doTrade() {
    const R = sampleR();
    const risk = equity * (Math.max(0.001, Math.min(1, riskPct / 100)));
    const pnl = R * risk;
    const newEq = equity + pnl;

    setTradeCount(n => n + 1);
    if (R > 0) setWins(w => w + 1); else setLosses(l => l + 1);
    setEquity(newEq);
    setLastOutcome({ R, pnl });
    setPeak(p => { const np = Math.max(p, newEq); setMaxDD(m => Math.max(m, 1 - newEq / np)); return np; });
    setEqHist(h => [...h, newEq].slice(-300));
  }

  function resetSim() {
    setEquity(bankroll);
    setTradeCount(0);
    setWins(0);
    setLosses(0);
    setPeak(bankroll);
    setMaxDD(0);
    setEqHist([bankroll]);
    setLastOutcome(null);
    setAuto(false);
  }

  function applyPreset(key: keyof typeof PRESETS) {
    const p = PRESETS[key];
    setWinPct(p.win);
    setRewardR(p.rewardR);
    setLossR(p.lossR);
  }

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => doTrade(), speedMs);
    return () => clearInterval(id);
  }, [auto, speedMs, equity, riskPct, winPct, rewardR, lossR]);

  const winRate = tradeCount ? (wins / tradeCount) * 100 : 0;
  const ddPct = maxDD * 100;
  const sparkVals = useMemo(() => { const min = Math.min(...eqHist), max = Math.max(...eqHist), span = Math.max(max - min, 1e-6); return eqHist.map(x => (x - min) / span); }, [eqHist]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center py-8">
      <div className="w-full max-w-4xl px-4">
        <h1 className="text-3xl font-semibold mb-4">Trading Simulator</h1>
        <div className="text-center mb-4 bg-slate-900 border border-slate-800 rounded-xl py-3">
          <div className="text-sm text-slate-400">Expected Value per Trade</div>
          <div className={`text-3xl font-bold ${EV>=0?'text-emerald-400':'text-rose-400'}`}>{EV.toFixed(2)}R</div>
        </div>

        <p className="text-slate-400 mb-6">Set your own <strong>Win%</strong> and <strong>R:R</strong>. Use presets for common styles, then tweak while Auto runs.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h2 className="text-lg font-medium mb-3">Controls</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {Object.entries(PRESETS).map(([k, p]) => (
                <button key={k} onClick={()=>applyPreset(k as keyof typeof PRESETS)} className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm">
                  {p.name}
                </button>
              ))}
            </div>

            <div className="mb-3 space-y-3 bg-slate-900/60 border border-slate-800 rounded-xl p-3">
              <div>
                <label className="block text-sm text-slate-300">Win Rate (%)</label>
                <input type="range" min={0} max={100} step={1} value={winPct} onChange={e=>setWinPct(Number(e.target.value))} className="w-full"/>
                <div className="text-sm mt-1">{winPct}% wins</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-300">Reward (R when win)</label>
                  <input type="range" min={0.1} max={10} step={0.1} value={rewardR} onChange={e=>setRewardR(Number(e.target.value))} className="w-full"/>
                  <div className="text-sm mt-1">+{rewardR.toFixed(1)}R</div>
                </div>
                <div>
                  <label className="block text-sm text-slate-300">Risk (R when loss)</label>
                  <input type="range" min={0.1} max={10} step={0.1} value={lossR} onChange={e=>setLossR(Number(e.target.value))} className="w-full"/>
                  <div className="text-sm mt-1">-{lossR.toFixed(1)}R</div>
                </div>
              </div>
              <div className="text-xs text-slate-400">Formula: E[R] = Win% × RewardR − (1 − Win%) × LossR</div>
            </div>

            <label className="block text-sm mb-1 text-slate-300">Risk per Trade (% of equity)</label>
            <input type="range" min={0.1} max={20} step={0.1} value={riskPct} onChange={e=>setRiskPct(Number(e.target.value))} className="w-full"/>
            <div className="text-sm mb-3">{riskPct.toFixed(1)}%</div>

            <label className="block text-sm mb-1 text-slate-300">Auto Speed (ms)</label>
            <input type="range" min={60} max={1000} step={10} value={speedMs} onChange={e=>setSpeedMs(Number(e.target.value))} className="w-full mb-3"/>

            <div className="flex gap-2">
              <button onClick={doTrade} className="px-4 py-2 bg-emerald-600 rounded-xl">Trade</button>
              <button onClick={()=>setAuto(a=>!a)} className={`px-4 py-2 rounded-xl ${auto?'bg-amber-600':'bg-sky-600'}`}>{auto?'Pause':'Auto'}</button>
              <button onClick={resetSim} className="px-4 py-2 bg-slate-700 rounded-xl">Reset</button>
            </div>
          </section>

          <section className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div><div className="text-xs text-slate-400">Equity</div><div className="text-xl font-semibold">${formatMoney(equity)}</div></div>
              <div><div className="text-xs text-slate-400">Trades</div><div className="text-xl font-semibold">{tradeCount}</div></div>
              <div><div className="text-xs text-slate-400">Win Rate</div><div className="text-xl font-semibold">{(tradeCount?winRate:winPct).toFixed(1)}%</div></div>
            </div>
            <div className="text-xs text-slate-400 mb-2">Max DD: {ddPct.toFixed(1)}%</div>
            <svg viewBox="0 0 800 160" className="w-full h-40">
              <path d={sparkPath(sparkVals,800,160)} fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400"/>
            </svg>
            {lastOutcome && (<div className="text-sm mt-2">Last trade: <span className={lastOutcome.R>=0?'text-emerald-400':'text-rose-400'}>{lastOutcome.R}R</span>, PnL ${formatMoney(lastOutcome.pnl)}</div>)}
          </section>
        </div>

        <footer className="mt-6 text-xs text-slate-500">Presets apply to the sliders. Build any system via Win% and R:R, then observe expectancy, drawdown, and equity dynamics in real time.</footer>
      </div>
    </div>
  );
}
