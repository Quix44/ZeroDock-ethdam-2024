import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GearIcon } from "@radix-ui/react-icons"

function EventRow() {
    return (
        <article className="col-start-2 col-span-11 p-6 transition-all rounded-md hover:bg-accent  inline-grid grid-cols-11 my-4">
            <div className="col-span-2 justify-self-center">
                <div className="flex space-x-2"><GearIcon /><p className="text-sm font-semibold text-muted-foreground">0x5c8...b3F3 </p></div>
                <p className="text-base  text-card-foreground">Event Name</p>
                <p className="text-base font-bold text-card-foreground">Chain</p>
            </div>
            <div className="col-span-3 justify-self-center">
                <p className="text-base font-semibold text-muted-foreground">April 12, 2024 at 12:03:14 PM</p>
            </div>
            <div className="col-span-3 justify-self-center">
                <p className="text-base font-bold text-primary">Event Name Goes here</p>
            </div>
            <div className="col-span-2 self-start  justify-self-center flex flex-col">
                <Badge className="inline-block" variant="outline">Success</Badge>
                <Button variant="link">Link</Button>
            </div>
        </article>
    )
}

export default EventRow