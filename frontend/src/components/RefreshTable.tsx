"use client";

import { getData } from "@/app/actions/getData";
import { Button } from "@/components/ui/button";
import { ReloadIcon } from "@radix-ui/react-icons";

function RefreshTable() {
    return (
        <form action={getData}>
            <Button variant="outline" size="icon">
                <ReloadIcon className="h-6 w-6" />
            </Button>
        </form>
    )
}

export default RefreshTable