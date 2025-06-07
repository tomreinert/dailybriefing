import Image from 'next/image'

export default function EmailIcon() {
  return (
    <Image 
      src="/images/icon-mail.png"
      alt="Email Icon"
      width={256}
      height={256}
      className="w-12 h-12"
    />
  )
} 