import Image from 'next/image'

interface DailybriefIconProps {
  width?: number
  height?: number
}

export default function DailybriefIcon({ width = 128, height = 128 }: DailybriefIconProps) {
  return (
    <Image 
      src="/images/icon-dailybrief.png"
      alt="Daily Brief Icon"
      width={width}
      height={height}
      className={`w-[${width}px] h-[${height}px]`}
    />
  )
} 