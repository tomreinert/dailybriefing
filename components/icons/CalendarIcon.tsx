import Image from 'next/image'

export default function CalendarIcon() {
  return (
    <Image 
      src="/images/icon-cal.png"
      alt="Calendar Icon"
      width={256}
      height={256}
      className="w-12 h-12"
    />
  )
}