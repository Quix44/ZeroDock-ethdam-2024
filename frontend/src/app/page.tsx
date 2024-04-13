
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
      <div className="grid grid-cols-12 w-full container gap-4 items-center py-12">
        <div className="col-span-4">
          <div className=" w-full items-center gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input type="email" id="email" placeholder="Email" />
          </div>
        </div>
        <div className="col-span-3">
          <Select>
            <SelectTrigger className="w-ful">
              <SelectValue placeholder="Select a fruit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-3">
          <Select>
            <SelectTrigger >
              <SelectValue placeholder="Select a fruit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Button variant="outline">Run</Button>
        </div>
      </div>
      <EventTable />
    </main>
  );
}

