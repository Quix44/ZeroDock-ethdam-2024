
import EventTable from '@/components/EventTable';
import Image from 'next/image';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center ">
      <div className="relative w-full overflow-hidden mb-4">
        <div className="absolute z-0 h-full inset-0 m-auto bg-gradient-to-b border-b border-background pointer-events-none from-[#550097] to-transparent"></div>
        <header className="py-24 relative z-20  container flex flex-col gap-8 lg:gap-2">
          <Image
            src="/zero_dock.svg"
            width={500}
            height={500}
            alt="zerodock logo"
          />
        </header>
      </div>





      <div className="grid grid-cols-12 gap-4">
        <div></div>
        <div></div>
      </div>
      <EventTable />
    </main>
  );
}
