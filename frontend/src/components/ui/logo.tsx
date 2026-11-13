import Image from 'next/image';
export function Logo({ hero = false }: { hero?: boolean }) {
  return <Image src="/infver-logo.svg" alt="INFVER · Información de inversiones" width={2172} height={724} priority={hero} className={hero ? 'infver-logo hero-logo' : 'infver-logo'} unoptimized />;
}
