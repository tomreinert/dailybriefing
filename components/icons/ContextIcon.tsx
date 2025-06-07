import Image from 'next/image'

export default function ContextIcon() {
  return (
    <Image 
      src="/images/icon-context.png"
      alt="Personal Notes Icon"
      width={256}
      height={256}
      className="w-12 h-12"
    />
  )
} 