import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export interface ChartSeries {
  key: string
  name: string
  color: string
  showLine?: boolean // false = points seuls (ex. pesées du jour)
}

const shortDate = (t: number) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
const longDate = (t: number) => new Date(t).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
const num = (v: number) => String(Math.round(v * 10) / 10).replace('.', ',')

/** Courbe dans le temps (axe X = dates réelles). Un seul axe Y. */
export default function TimeChart({
  data,
  series,
  unit,
  height = 220,
}: {
  data: ({ t: number } & Record<string, number>)[]
  series: ChartSeries[]
  unit: string
  height?: number
}) {
  if (data.length === 0) return <p className="py-6 text-center text-neutral-500">Pas encore de données.</p>

  return (
    <figure>
      {series.length > 1 && (
        <figcaption className="mb-2 flex flex-wrap gap-4 text-sm text-neutral-300">
          {series.map((s) => (
            <span key={s.key} className="flex items-center gap-2">
              <span
                className={s.showLine === false ? 'h-2.5 w-2.5 rounded-full' : 'h-0.5 w-5 rounded'}
                style={{ background: s.color }}
                aria-hidden="true"
              />
              {s.name}
            </span>
          ))}
        </figcaption>
      )}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
            <CartesianGrid stroke="#262626" vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={data.length === 1 ? [data[0].t - 86_400_000 * 3, data[0].t + 86_400_000 * 3] : ['dataMin', 'dataMax']}
              tickFormatter={shortDate}
              tick={{ fill: '#a3a3a3', fontSize: 12 }}
              axisLine={{ stroke: '#404040' }}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fill: '#a3a3a3', fontSize: 12 }}
              tickFormatter={num}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <Tooltip
              labelFormatter={(t) => longDate(Number(t))}
              formatter={(v, name) => [`${num(Number(v))} ${unit}`, name]}
              contentStyle={{ background: '#171717', border: '1px solid #404040', borderRadius: 12, color: '#f5f5f5' }}
              labelStyle={{ color: '#a3a3a3' }}
              cursor={{ stroke: '#525252' }}
            />
            {series.map((s) => (
              <Line
                key={s.key}
                dataKey={s.key}
                name={s.name}
                type="monotone"
                stroke={s.showLine === false ? 'transparent' : s.color}
                strokeWidth={2}
                dot={{ r: 4, fill: s.color, stroke: '#0a0a0a', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: s.color, stroke: '#0a0a0a', strokeWidth: 2 }}
                isAnimationActive={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}
