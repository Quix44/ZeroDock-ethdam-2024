"use client";

import { refresh } from "@/app/actions/getData";
import { Button } from "@/components/ui/button";
import { ReloadIcon } from "@radix-ui/react-icons";

function RefreshTable() {
    return (
        <form action={refresh} >
            <Button variant="outline" size="icon" >
                <ReloadIcon className="h-4 w-4 animate-spin" />
            </Button>
        </form>
    )
}

export default RefreshTable