import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GearIcon } from "@radix-ui/react-icons"

function EventRow({ data }: any) {
    return (
        <article className="col-start-2 col-span-11 p-6 transition-all rounded-md hover:bg-accent  inline-grid grid-cols-11 my-4">
            <div className="col-span-2 justify-self-center">
                <div className="flex space-x-2"><GearIcon /><p className="text-md font-semibold text-muted-foreground">{data.contractAddress}</p></div>
                <p className="text-base  text-card-foreground">{data.eventName}</p>
                <p className="text-base font-bold text-card-foreground">{data.chain}</p>
            </div>
            <div className="col-span-3 justify-self-center">
                <p className="text-base font-semibold text-muted-foreground">{data.timestamp}</p>
            </div>
            <div className="col-span-3 justify-self-center">
                <p className="text-base font-bold text-primary">{data.eventName}</p>
            </div>
            <div className="col-span-2 self-start  justify-self-center flex flex-col">
                <Badge className="inline-block" variant="outline">Success</Badge>
                <Button className="p-0" variant="link">{data.url}</Button>
            </div>
        </article>
    )
}

export default EventRow