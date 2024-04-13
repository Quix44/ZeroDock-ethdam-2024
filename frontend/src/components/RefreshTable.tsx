"use client";

import { Button } from "@/components/ui/button";
import { ReloadIcon } from "@radix-ui/react-icons";

function RefreshTable() {
    return (
        <Button variant="outline" size="icon">
            <ReloadIcon className="h-4 w-4" />
        </Button>
    )
}

export default RefreshTable