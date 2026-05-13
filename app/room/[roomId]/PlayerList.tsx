'use client'

import { useState } from 'react'
import type { Player } from '@/lib/types'

interface Props {
  players: Player[]
  myId: string
}

export default function PlayerList({ players, myId }: Props) {
  const [selected, setSelected] = useState<Player | null>(null)

  return (
    <>
      <ul className="flex flex-col gap-1">
        {players.map((p) => (
          <li key={p.id}>
            <button
              onClick={() => setSelected(p)}
              className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-gray-800/80 transition-all text-left group active:scale-[0.98]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 transition-all ${
                    p.isConnected
                      ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]'
                      : 'bg-gray-600'
                  }`}
                />
                <span
                  className={`font-semibold text-sm truncate group-hover:text-green-400 transition-colors ${
                    p.id === myId ? 'text-green-400' : 'text-gray-200'
                  }`}
                >
                  {p.nickname}
                  {p.id === myId && (
                    <span className="text-gray-600 text-xs ml-1.5 font-normal">나</span>
                  )}
                </span>
              </div>
              <span className="text-gray-500 text-xs font-mono tabular-nums ml-2 shrink-0">
                {p.chips.toLocaleString()}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-[60] p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-xs shadow-2xl shadow-black/60"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-white font-bold text-lg leading-tight">{selected.nickname}</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${selected.isConnected ? 'bg-green-400' : 'bg-gray-600'}`} />
                  <span className="text-gray-500 text-xs">{selected.isConnected ? '접속 중' : '오프라인'}</span>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-600 hover:text-white text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800 transition-colors"
              >
                ×
              </button>
            </div>

            {/* 스탯 그리드 */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <StatCard
                label="보유 칩"
                value={selected.chips.toLocaleString()}
                unit="칩"
                color="text-white"
              />
              <StatCard
                label="순손익"
                value={`${selected.chips - 1000 >= 0 ? '+' : ''}${(selected.chips - 1000).toLocaleString()}`}
                unit="칩"
                color={selected.chips >= 1000 ? 'text-green-400' : 'text-red-400'}
              />
              <StatCard
                label="획득"
                value={`+${selected.stats.chipsWon.toLocaleString()}`}
                unit="칩"
                color="text-green-400"
              />
              <StatCard
                label="손실"
                value={`-${selected.stats.chipsLost.toLocaleString()}`}
                unit="칩"
                color="text-red-400"
              />
              <StatCard label="승" value={String(selected.stats.wins)} unit="회" color="text-yellow-400" />
              <StatCard label="패" value={String(selected.stats.losses)} unit="회" color="text-gray-400" />
            </div>

            {/* 승률 바 */}
            {selected.stats.wins + selected.stats.losses > 0 && (
              <div className="pt-4 border-t border-gray-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-500 text-xs">승률</span>
                  <span className="text-white font-bold text-sm">
                    {Math.round((selected.stats.wins / (selected.stats.wins + selected.stats.losses)) * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full transition-all duration-500"
                    style={{
                      width: `${(selected.stats.wins / (selected.stats.wins + selected.stats.losses)) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-700 mt-1">
                  <span>{selected.stats.wins}승</span>
                  <span>{selected.stats.losses}패</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function StatCard({
  label, value, unit, color,
}: {
  label: string; value: string; unit: string; color: string
}) {
  return (
    <div className="bg-gray-800/80 border border-gray-700/50 rounded-xl p-3">
      <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">{label}</p>
      <p className={`font-black text-base leading-none font-mono ${color}`}>
        {value}
        <span className="text-[10px] font-normal text-gray-500 ml-1">{unit}</span>
      </p>
    </div>
  )
}
