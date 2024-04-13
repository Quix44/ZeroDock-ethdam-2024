import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ClipboardIcon } from "@radix-ui/react-icons";


interface CopyData {
    description: string;
    toolTipText: string;
}
const copyData: CopyData = {
    description: "Copy",
    toolTipText: "Click to copy",
}

function ClipboardCopy({ copyData }: any) {
    return (
        <>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline">
                            {copyData.description}
                            <ClipboardIcon className="ml-2 h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{copyData.toolTipText}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </>
    )
}

export default ClipboardCopy