"use client"
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
    const truncateText = (text: string) => {
        if (text.length > 10) {
            return `${text.substring(0, 10)}...`;
        }
        return text;
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(copyData.description);
            alert('Description copied to clipboard!');
        } catch (err) {
            alert('Failed to copy description.');
            console.error('Error copying text: ', err);
        }
    };

    return (
        <>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" onClick={handleCopy} className="truncate ... text-ellipsis overflow-hidden  ">
                            {truncateText(copyData.description)}
                            <ClipboardIcon className="ml-2 h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="text-ellipsis overflow-hidden .. max-w-[100px]">{copyData.toolTipText}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </>
    )
}

export default ClipboardCopy