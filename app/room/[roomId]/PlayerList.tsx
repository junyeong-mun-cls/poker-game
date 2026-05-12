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
      <ul className="flex flex-col gap-2">
        {players.map((p) => (
          <li key={p.id}>
            <button
              onClick={() => setSelected(p)}
              className="w-full flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-800 transition-colors text-left group"
            >
              <div className="flex items-center gap-2.5">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${p.isConnected ? 'bg-green-400' : 'bg-gray-600'}`} />
                <span className={`font-medium group-hover:text-green-400 transition-colors ${p.id === myId ? 'text-green-400' : 'text-white'}`}>
                  {p.nickname}
                  {p.id === myId && <span className="text-gray-500 text-xs ml-1.5 font-normal">나</span>}
                </span>
              </div>
              <span className="text-gray-400 text-sm tabular-nums">{p.chips.toLocaleString()} 칩</span>
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-72 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">{selected.nickname}</h3>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-500 hover:text-white transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatCard label="보유 칩" value={`${selected.chips.toLocaleString()}`} unit="칩" color="text-white" />
              <StatCard
                label="순손익"
                value={`${selected.chips - 1000 >= 0 ? '+' : ''}${(selected.chips - 1000).toLocaleString()}`}
                unit="칩"
                color={selected.chips >= 1000 ? 'text-green-400' : 'text-red-400'}
              />
              <StatCard label="획득" value={`+${selected.stats.chipsWon.toLocaleString()}`} unit="칩" color="text-green-400" />
              <StatCard label="손실" value={`-${selected.stats.chipsLost.toLocaleString()}`} unit="칩" color="text-red-400" />
              <StatCard label="승" value={String(selected.stats.wins)} unit="회" color="text-yellow-400" />
              <StatCard label="패" value={String(selected.stats.losses)} unit="회" color="text-gray-400" />
            </div>

            {(selected.stats.wins + selected.stats.losses) > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-800">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">승률</span>
                  <span className="text-white font-medium">
                    {Math.round((selected.stats.wins / (selected.stats.wins + selected.stats.losses)) * 100)}%
                  </span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${(selected.stats.wins / (selected.stats.wins + selected.stats.losses)) * 100}%` }}
                  />
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
  label: string
  value: string
  unit: string
  color: string
}) {
  return (
    <div className="bg-gray-800 rounded-xl p-3">
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <p className={`font-bold text-lg leading-none ${color}`}>
        {value}
        <span className="text-xs font-normal ml-0.5">{unit}</span>
      </p>
    </div>
  )
}
