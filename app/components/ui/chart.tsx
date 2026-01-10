import * as React from "react"

interface ChartConfig {
  [key: string]: {
    label: string
    color: string
  }
}

interface ChartContainerProps {
  config: ChartConfig
  className?: string
  children: React.ReactNode
}

const ChartContext = React.createContext<ChartConfig | null>(null)

export function useChartConfig() {
  const config = React.useContext(ChartContext)
  if (!config) {
    throw new Error("useChartConfig must be used within a ChartContainer")
  }
  return config
}

export const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ config, className = "", children }, ref) => {
    return (
      <ChartContext.Provider value={config}>
        <div ref={ref} className={className}>
          {children}
        </div>
      </ChartContext.Provider>
    )
  }
)
ChartContainer.displayName = "ChartContainer"

interface ChartTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number | string
    dataKey: string
    color: string
    payload: Record<string, unknown>
  }>
  label?: string
  content?: React.ReactElement | React.ComponentType<ChartTooltipContentProps>
}

interface ChartTooltipContentProps extends ChartTooltipProps {
  formatter?: (value: number | string, name: string) => string
  labelFormatter?: (label: string) => string
  hideLabel?: boolean
}

export const ChartTooltip: React.FC<ChartTooltipProps> = ({ content, ...props }) => {
  if (!content) return null
  
  // If content is a React element, clone it with props
  if (React.isValidElement(content)) {
    return React.cloneElement(content, props as any)
  }
  
  // If content is a component, render it
  const Content = content as React.ComponentType<ChartTooltipContentProps>
  return <Content {...props} />
}

export const ChartTooltipContent: React.FC<ChartTooltipContentProps> = ({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
  hideLabel = false,
}) => {
  const config = useChartConfig()

  if (!active || !payload || payload.length === 0) {
    return null
  }

  return (
    <div className="rounded-lg border border-[#6b2fa5]/20 bg-white px-3 py-2 shadow-lg shadow-[#6b2fa5]/10">
      {!hideLabel && label && (
        <p className="mb-1.5 text-xs font-medium text-gray-900">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((entry, index) => {
          const configItem = config[entry.dataKey]
          const displayValue = formatter
            ? formatter(entry.value, entry.name)
            : entry.value

          return (
            <div key={`item-${index}`} className="flex items-center gap-2 text-xs">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color || configItem?.color || "#6b2fa5" }}
              />
              <span className="text-gray-600">
                {configItem?.label || entry.name}:
              </span>
              <span className="font-semibold text-gray-900">{displayValue}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

ChartTooltipContent.displayName = "ChartTooltipContent"