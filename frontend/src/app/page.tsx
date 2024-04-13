
import Image from 'next/image';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"


export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between ">
      <div className="relative w-full overflow-hidden mb-4">
        <div className="absolute z-0 h-full inset-0 m-auto bg-gradient-to-b border-b border-background pointer-events-none from-[#550097] to-transparent"></div>
        <header className="p-24 relative z-20 py-8 container flex flex-col gap-8 lg:gap-2">
          <Image
            src="/zero_dock.svg"
            width={500}
            height={500}
            alt="zerodock logo"
          />
        </header>
      </div>
      <div className="grid grid-cols-12 gab-4"> 
        <div className="col-span-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input type="email" id="email" placeholder="Email" />
            </div>
        </div>
        <div className="col-span-3">
          // Add event selection dropdown here
        </div>
        <div className="col-span-3">
          // Add container selection dropdown here
        </div>  
        <div className="col-span-2">
          <Button variant="outline">Run</Button>
        </div>
      </div>
    </main>
  );
}
