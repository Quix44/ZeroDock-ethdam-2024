
import EventTable from '@/components/EventTable';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";



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
      <div className="grid grid-cols-12 container gap-4 items-center my-12 px-0">
        <div className="col-span-4">
          <div className=" w-full items-center gap-1.5">
            <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="contract">Contract</Label>
            <Input type="contract" id="contract" placeholder="0x5c8...b3F3" />
          </div>
        </div>
        <div className="col-span-3">
          <Select>
            <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="select">Select a contract event to listen to</Label>
            <SelectTrigger className="w-ful">
              <SelectValue placeholder="Select an event" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="process">Process</SelectItem>
              <SelectItem value="pay">Pay</SelectItem>

            </SelectContent>
          </Select>
        </div>
        <div className="col-span-3">
          <Select>
            <Label htmlFor="select" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Select a container</Label>
            <SelectTrigger >
              <SelectValue placeholder="Select a container" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="constanza-red">constanza-red</SelectItem>
              <SelectItem value="jerry-green">jerry-green</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 self-end">
          <Button className="w-full" >Run</Button>
        </div>
      </div>
      <EventTable />

    </main>
  );
}

