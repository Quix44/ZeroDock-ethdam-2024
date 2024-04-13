import { Button } from "@/components/ui/button";
import { GearIcon, LightningBoltIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import ClipboardCopy from "./ClipboardCopy";

function EventRow({ data }: any) {
    const truncateText = (text: string) => {
        if (text.length > 10) {
            return `${text.substring(0, 10)}...`;
        }
        return text;
    };

    return (
        <article className="col-start-1 col-span-11 p-6 transition-all rounded-md hover:bg-accent/10  inline-grid grid-cols-11 my-4">
            <div className="col-span-2 justify-self-center">
                <div className="flex space-x-2"><GearIcon /><p className="text-md font-semibold text-muted-foreground">{truncateText('0xcd32fb0f74584bc86a460e5aca4846e5962c57397c5fc99f5134c47f6399a059')}</p></div>
                <p className="text-base  text-card-foreground">{data.eventName}</p>
                <p className="text-base font-bold text-card-foreground">{data.chain}</p>
            </div>
            <div className="col-span-2 justify-self-center">
                <p className="text-base font-semibold text-muted-foreground">{data.timestamp}</p>
            </div>
            <div className="col-span-3 justify-self-center flex flex-col space-y-2">
                <p className="text-base font-bold text-foreground">{data.eventName}</p>

                <ClipboardCopy copyData={{ description: data.publicProof, toolTipText: "Public Proof Copy" }} />

            </div>
            <div className="col-span-2 self-start  justify-self-center flex flex-col">
                <Button className="p-0 underline hover:text-foreground" variant="link" asChild>
                    <Link href={data.url}>Transaction Link</Link>
                </Button>
                <ClipboardCopy copyData={{ description: data.proof, toolTipText: "Proof copy" }} />
            </div>
            <div className="col-span-1 self-start justify-self-center">
                <Button className="p-0 underline hover:text-foreground" variant="link" asChild>
                    <Link href={data.proofUrl}>Proof Link</Link>
                </Button>
            </div>
            <div className="col-span-1 self-start justify-self-center">
                <Button variant="outline" className="border-yellow-500 hover:bg-yellow-500">

                    <LightningBoltIcon className="h-4 w-4 " /> Verify
                </Button>
            </div>
        </article>
    )
}

export default EventRow