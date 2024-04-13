"use client";

import { getData } from "@/app/actions/getData";
import { Button } from "@/components/ui/button";
import { ReloadIcon } from "@radix-ui/react-icons";

function RefreshTable() {
    return (
        <form action={getData}>
            <Button variant="outline" size="icon">
                <ReloadIcon className="h-4 w-4" />
            </Button>
        </form>
    )
}

export default RefreshTable