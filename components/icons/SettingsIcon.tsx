import Image from 'next/image'

export default function SettingsIcon() {
  return (
    <Image 
      src="/images/icon-email-settings.png"
      alt="Settings Icon"
      width={256}
      height={256}
      className="w-12 h-12"
    />
  )
} 