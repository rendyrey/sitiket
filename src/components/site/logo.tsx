import Image from "next/image";
import Link from "next/link";

export default function Logo() {
  return (
    <Link href="/" aria-label="SiTIKET home" className="block shrink-0">
      <Image
        src="/sitiket-logo.png"
        alt="SiTIKET"
        width={190}
        height={69}
        priority
        className="h-9 w-auto object-contain sm:h-11"
      />
    </Link>
  );
}
