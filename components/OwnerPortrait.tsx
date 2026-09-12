import Image from "next/image";

export default function OwnerPortrait({
  name,
  photo,
  className = "h-12 w-12",
}: {
  name: string;
  photo?: string | null;
  className?: string;
}) {
  return <div className={`relative shrink-0 overflow-hidden rounded-full border border-black/10 bg-[#071a33] shadow-md ${className}`}>
    {photo ? <Image src={photo} alt={name} fill className="object-cover" unoptimized /> : <span aria-hidden="true" className="flex h-full w-full items-center justify-center text-[10px] font-black uppercase tracking-widest text-amber-300">RC</span>}
  </div>;
}
